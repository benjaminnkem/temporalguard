export enum ApiKeyEnvironment {
  LIVE = 'live',
  TEST = 'test',
}

export type ProductEnvironment = 'production' | 'staging';

export function toProductEnvironment(
  environment: ApiKeyEnvironment | string,
): ProductEnvironment {
  return String(environment) === 'test' ? 'staging' : 'production';
}

export function apiKeyPrefixForEnvironment(
  environment: ApiKeyEnvironment,
): string {
  return environment === ApiKeyEnvironment.TEST ? 'tg_test_' : 'tg_live_';
}
