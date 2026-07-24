/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { hash } from 'argon2';
import type { DataSource, Repository } from 'typeorm';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { CloudinaryService } from '../../media';
import { Business } from '../../businesses/entities';
import { User } from '../../users/entities';
import { RefreshSession } from '../entities';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const business = {
    id: 'business-id',
    name: 'Northstar Labs',
    logoUrl: null,
  };
  const activeUser = {
    id: 'user-id',
    businessId: business.id,
    firstName: 'Ada',
    lastName: 'Okafor',
    email: 'ada@example.com',
    status: 'active',
    business,
  } as User;

  let users: {
    createQueryBuilder: jest.Mock;
  };
  let sessions: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let jwt: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let media: {
    uploadLogo: jest.Mock;
    deleteAsset: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let service: AuthService;

  const queryBuilder = (result: unknown) => ({
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    users = { createQueryBuilder: jest.fn() };
    sessions = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      update: jest.fn(),
    };
    jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    media = {
      uploadLogo: jest.fn(),
      deleteAsset: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = { transaction: jest.fn() };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'auth.accessTtl') return '15m';
        if (key === 'auth.refreshTtl') return '30d';
        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => `${key}-secret`),
    };
    service = new AuthService(
      dataSource as unknown as DataSource,
      users as unknown as Repository<User>,
      sessions as unknown as Repository<RefreshSession>,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      media as unknown as CloudinaryService,
    );
  });

  it('rejects invalid credentials with a stable code', async () => {
    users.createQueryBuilder.mockReturnValue(queryBuilder(null));
    await expect(
      service.login(
        { email: 'unknown@example.com', password: 'Password123!' },
        { userAgent: null, ipAddress: null },
      ),
    ).rejects.toMatchObject({
      response: { code: 'AUTH_INVALID_CREDENTIALS' },
    });
  });

  it('logs in a valid user and stores a hashed refresh session', async () => {
    const passwordHash = await hash('Password123!');
    users.createQueryBuilder.mockReturnValue(
      queryBuilder({ ...activeUser, passwordHash }),
    );
    const result = await service.login(
      { email: 'ADA@example.com', password: 'Password123!' },
      { userAgent: 'jest', ipAddress: '127.0.0.1' },
    );
    expect(result.session.user.email).toBe('ada@example.com');
    expect(sessions.save).toHaveBeenCalled();
    expect(sessions.save.mock.calls[0]?.[0].tokenHash).not.toBe(
      'refresh-token',
    );
  });

  it('rejects duplicate registration before uploading a logo', async () => {
    users.createQueryBuilder.mockReturnValue(queryBuilder(activeUser));

    await expect(
      service.register(
        {
          firstName: 'Ada',
          lastName: 'Okafor',
          email: ' ADA@example.com ',
          password: 'Password123!',
          businessName: 'Northstar',
        },
        { buffer: Buffer.from('image') } as Express.Multer.File,
        { userAgent: null, ipAddress: null },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(media.uploadLogo).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('registers a workspace owner and creates a refresh session atomically', async () => {
    users.createQueryBuilder.mockReturnValue(queryBuilder(null));
    const transactionSessions = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const manager = {
      create: jest.fn((entity: unknown, value: Record<string, unknown>) => ({
        ...value,
        id: entity === Business ? 'business-id' : 'user-id',
      })),
      save: jest.fn(async (value) => value),
      getRepository: jest.fn(() => transactionSessions),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    const result = await service.register(
      {
        firstName: ' Ada ',
        lastName: ' Okafor ',
        email: ' ADA@example.com ',
        password: 'Password123!',
        businessName: ' Northstar Labs ',
      },
      undefined,
      { userAgent: 'jest', ipAddress: '127.0.0.1' },
    );

    expect(result.session).toEqual({
      user: expect.objectContaining({ email: 'ada@example.com' }),
      workspace: expect.objectContaining({ name: 'Northstar Labs' }),
    });
    expect(transactionSessions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        tokenHash: expect.not.stringMatching(/^refresh-token$/),
      }),
    );
  });

  it('compensates an uploaded logo when registration transaction fails', async () => {
    users.createQueryBuilder.mockReturnValue(queryBuilder(null));
    media.uploadLogo.mockResolvedValue({
      secureUrl: 'https://example.test/logo.png',
      publicId: 'workspaces/logo',
    });
    dataSource.transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(
      service.register(
        {
          firstName: 'Ada',
          lastName: 'Okafor',
          email: 'ada@example.com',
          password: 'Password123!',
          businessName: 'Northstar',
        },
        { buffer: Buffer.from('image') } as Express.Multer.File,
        { userAgent: null, ipAddress: null },
      ),
    ).rejects.toThrow('database unavailable');
    expect(media.deleteAsset).toHaveBeenCalledWith('workspaces/logo');
  });

  it('rejects a missing refresh cookie', async () => {
    await expect(
      service.refresh(undefined, { userAgent: null, ipAddress: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates a valid refresh token and links the replacement session', async () => {
    const rawToken = 'raw-refresh-token';
    const currentSession = {
      id: 'session-id',
      userId: activeUser.id,
      familyId: 'family-id',
      tokenHash: await hash(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedById: null,
    };
    const sessionQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(currentSession),
    };
    const transactionSessions = {
      createQueryBuilder: jest.fn(() => sessionQueryBuilder),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      update: jest.fn(),
      findOneOrFail: jest.fn().mockResolvedValue({ id: 'replacement-id' }),
    };
    const transactionUsers = {
      findOne: jest.fn().mockResolvedValue(activeUser),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === RefreshSession ? transactionSessions : transactionUsers,
      ),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );
    jwt.verifyAsync.mockResolvedValue({
      sub: activeUser.id,
      sessionId: currentSession.id,
      familyId: currentSession.familyId,
      type: 'refresh',
    });

    const result = await service.refresh(rawToken, {
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
    });

    expect(result.tokens.refreshToken).toBe('refresh-token');
    expect(currentSession.revokedAt).toBeInstanceOf(Date);
    expect(currentSession.replacedById).toBe('replacement-id');
    expect(transactionSessions.save).toHaveBeenCalledTimes(3);
  });

  it('revokes a refresh session on logout', async () => {
    jwt.verifyAsync.mockResolvedValue({ sessionId: 'session-id' });
    await service.logout('refresh-token');
    expect(sessions.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-id' }),
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });
});
