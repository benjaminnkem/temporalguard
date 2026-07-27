import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from 'argon2';
import { randomUUID } from 'node:crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Business } from '../../businesses/entities';
import { CloudinaryService, type UploadedLogo } from '../../media';
import { User } from '../../users/entities';
import type { LoginDto, RegisterDto } from '../dto';
import { RefreshSession } from '../entities';
import type {
  AccessTokenPayload,
  ClientContext,
  RefreshTokenPayload,
} from '../interfaces/auth.interface';

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshSession)
    private readonly sessions: Repository<RefreshSession>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async register(
    input: RegisterDto,
    logo: Express.Multer.File | undefined,
    context: ClientContext,
  ) {
    const email = input.email.trim().toLowerCase();
    if (await this.findUserByEmail(email)) {
      throw new ConflictException({
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'An account already exists for this email.',
      });
    }
    let uploadedLogo: UploadedLogo | null = null;
    if (logo) uploadedLogo = await this.cloudinaryService.uploadLogo(logo);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const business = await manager.save(
          manager.create(Business, {
            name: input.businessName.trim(),
            logoUrl: uploadedLogo?.secureUrl ?? null,
            logoPublicId: uploadedLogo?.publicId ?? null,
          }),
        );
        const user = await manager.save(
          manager.create(User, {
            businessId: business.id,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email,
            passwordHash: await hash(input.password),
            status: 'active',
          }),
        );
        user.business = business;
        const tokens = await this.createSession(
          user,
          context,
          manager.getRepository(RefreshSession),
        );
        return { session: this.safeSession(user), tokens };
      });
    } catch (error: unknown) {
      if (uploadedLogo) {
        await this.cloudinaryService
          .deleteAsset(uploadedLogo.publicId)
          .catch(() => undefined);
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === '23505'
      ) {
        throw new ConflictException({
          code: 'AUTH_EMAIL_ALREADY_EXISTS',
          message: 'An account already exists for this email.',
        });
      }
      throw error;
    }
  }

  async login(input: LoginDto, context: ClientContext) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.business', 'business')
      .where('LOWER(user.email) = :email', {
        email: input.email.trim().toLowerCase(),
      })
      .getOne();
    const valid =
      user?.status === 'active' &&
      (await verify(user.passwordHash, input.password).catch(() => false));
    if (!valid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }
    const tokens = await this.createSession(user, context, this.sessions);
    return { session: this.safeSession(user), tokens };
  }

  async refresh(rawToken: string | undefined, context: ClientContext) {
    if (!rawToken) this.invalidRefresh();
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        rawToken,
        {
          secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
        },
      );
      if (payload.type !== 'refresh') throw new Error('Wrong token type');
    } catch {
      this.invalidRefresh();
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshSession);
      const session = await repository
        .createQueryBuilder('session')
        .addSelect('session.tokenHash')
        .setLock('pessimistic_write')
        .where('session.id = :id', { id: payload.sessionId })
        .getOne();
      if (
        !session ||
        session.familyId !== payload.familyId ||
        session.expiresAt <= new Date()
      ) {
        this.invalidRefresh();
      }
      if (session.revokedAt) {
        await repository.update(
          { familyId: session.familyId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        this.invalidRefresh();
      }
      if (!(await verify(session.tokenHash, rawToken).catch(() => false))) {
        this.invalidRefresh();
      }
      const user = await manager.getRepository(User).findOne({
        where: { id: payload.sub },
        relations: { business: true },
      });
      if (!user || user.status !== 'active') this.invalidRefresh();
      session.revokedAt = new Date();
      await repository.save(session);
      const tokens = await this.createSession(
        user,
        context,
        repository,
        session.familyId,
      );
      const replacement = await repository.findOneOrFail({
        where: { familyId: session.familyId, revokedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      session.replacedById = replacement.id;
      await repository.save(session);
      return { session: this.safeSession(user), tokens };
    });
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        rawToken,
        { secret: this.configService.getOrThrow<string>('auth.refreshSecret') },
      );
      await this.sessions.update(
        { id: payload.sessionId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } catch {
      return;
    }
  }

  safeSession(user: User) {
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      workspace: {
        id: user.business.id,
        name: user.business.name,
        logoUrl: user.business.logoUrl ?? undefined,
        website: user.business.website ?? undefined,
        description: user.business.description ?? undefined,
      },
    };
  }

  private async findUserByEmail(email: string) {
    return this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email })
      .getOne();
  }

  private async createSession(
    user: User,
    context: ClientContext,
    repository: Repository<RefreshSession>,
    familyId: string = randomUUID(),
  ): Promise<SessionTokens> {
    const refreshMaxAgeMs = this.ttlMs(
      this.configService.get<string>('auth.refreshTtl') ?? '30d',
    );
    const accessMaxAgeMs = this.ttlMs(
      this.configService.get<string>('auth.accessTtl') ?? '15m',
    );
    const sessionId = randomUUID();
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      businessId: user.businessId,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      familyId,
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('auth.accessSecret'),
        expiresIn: Math.floor(accessMaxAgeMs / 1000),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
        expiresIn: Math.floor(refreshMaxAgeMs / 1000),
      }),
    ]);
    await repository.save(
      repository.create({
        id: sessionId,
        userId: user.id,
        familyId,
        tokenHash: await hash(refreshToken),
        expiresAt: new Date(Date.now() + refreshMaxAgeMs),
        revokedAt: null,
        replacedById: null,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      }),
    );
    return { accessToken, refreshToken, accessMaxAgeMs, refreshMaxAgeMs };
  }

  private ttlMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 15 * 60 * 1000;
    const amount = Number(match[1]);
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return amount * multipliers[match[2] as keyof typeof multipliers];
  }

  private invalidRefresh(): never {
    throw new UnauthorizedException({
      code: 'AUTH_REFRESH_INVALID',
      message: 'The refresh session is invalid or expired.',
    });
  }
}
