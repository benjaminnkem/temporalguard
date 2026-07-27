import { validateEnvironment } from './environment';

describe('environment validation', () => {
  it('applies safe development defaults and parses typed flags', () => {
    const environment = validateEnvironment({
      NODE_ENV: 'development',
      FEATURE_INVESTIGATIONS: 'true',
    });

    expect(environment.PORT).toBe(3000);
    expect(environment.FEATURE_INVESTIGATIONS).toBe(true);
    expect(environment.FEATURE_COMPARISONS).toBe(false);
  });

  it('rejects development secrets and insecure cookies in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET.*COOKIE_SECURE/s);
  });

  it('requires cloud ingestion settings in cloud mode', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        SIGNOZ_MODE: 'cloud',
      }),
    ).toThrow(/SIGNOZ_INGESTION_ENDPOINT/);
  });

  it('requires cloud query settings when telemetry features are enabled', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        SIGNOZ_MODE: 'cloud',
        SIGNOZ_INGESTION_ENDPOINT: 'https://ingest.us.signoz.cloud:443',
        SIGNOZ_INGESTION_KEY: 'ingestion-key',
        FEATURE_INVESTIGATIONS: 'true',
      }),
    ).toThrow(/SIGNOZ_API_URL.*SIGNOZ_API_KEY/);
  });
});
