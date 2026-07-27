import type { Request } from 'express';
import { extractApiKeyFromRequest } from './extract-api-key';

function req(headers: Record<string, string | string[] | undefined>): Request {
  return { headers } as Request;
}

describe('extractApiKeyFromRequest', () => {
  it('prefers X-API-Key over Authorization', () => {
    expect(
      extractApiKeyFromRequest(
        req({
          'x-api-key': 'tg_live_from_header',
          authorization: 'Bearer tg_live_from_bearer',
        }),
      ),
    ).toBe('tg_live_from_header');
  });

  it('accepts Bearer secrets that start with tg_', () => {
    expect(
      extractApiKeyFromRequest(req({ authorization: 'Bearer tg_live_secret' })),
    ).toBe('tg_live_secret');
  });

  it('ignores Bearer JWTs that do not start with tg_', () => {
    expect(
      extractApiKeyFromRequest(
        req({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.xxx' }),
      ),
    ).toBeUndefined();
  });

  it('returns undefined when no credentials are present', () => {
    expect(extractApiKeyFromRequest(req({}))).toBeUndefined();
  });
});
