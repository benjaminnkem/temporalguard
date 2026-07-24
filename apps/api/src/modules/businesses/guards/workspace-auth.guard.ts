import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import type {
  AccessTokenPayload,
  AuthenticatedRequest,
} from '../../auth/interfaces/auth.interface';
import { User } from '../../users/entities';
import { BusinessesService } from '../services/businesses.service';

export type WorkspaceAuthRequest = Request & {
  user?: User;
  businessId: string;
  apiKeyId?: string;
  authMethod: 'session' | 'api_key';
};

@Injectable()
export class WorkspaceAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly businessesService: BusinessesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceAuthRequest>();
    const header = request.headers['x-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;

    if (rawKey) {
      const result = await this.businessesService.authenticateApiKey(rawKey);
      request.businessId = result.businessId;
      request.apiKeyId = result.apiKeyId;
      request.authMethod = 'api_key';
      return true;
    }

    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : undefined;
    const token =
      bearer ??
      ((request as AuthenticatedRequest).cookies?.tg_access as
        | string
        | undefined);
    if (!token) {
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication is required.',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret: this.configService.getOrThrow<string>('auth.accessSecret') },
      );
      if (payload.type !== 'access') throw new Error('Wrong token type');
      const user = await this.users.findOne({
        where: { id: payload.sub, businessId: payload.businessId },
        relations: { business: true },
      });
      if (!user || user.status !== 'active') throw new Error('Inactive user');
      request.user = user;
      request.businessId = user.businessId;
      request.authMethod = 'session';
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication is required.',
      });
    }
  }
}
