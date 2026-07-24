import type { Request } from 'express';
import type { User } from '../../users/entities';

export type AccessTokenPayload = {
  sub: string;
  businessId: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
  familyId: string;
  type: 'refresh';
};

export type AuthenticatedRequest = Request & { user: User };

export type ClientContext = {
  userAgent: string | null;
  ipAddress: string | null;
};
