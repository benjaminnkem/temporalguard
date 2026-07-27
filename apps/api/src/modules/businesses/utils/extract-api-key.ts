import type { Request } from 'express';

export function extractApiKeyFromRequest(request: Request): string | undefined {
  const header = request.headers['x-api-key'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader?.trim()) {
    return fromHeader.trim();
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  if (!token.startsWith('tg_')) {
    return undefined;
  }

  return token;
}
