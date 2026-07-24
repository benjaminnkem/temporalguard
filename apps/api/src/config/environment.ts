import { z } from 'zod';

const booleanFromEnvironment = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
);

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().min(1).max(65_535).default(5432),
    DB_USERNAME: z.string().min(1).default('postgres'),
    DB_PASSWORD: z.string().default('postgres'),
    DB_DATABASE: z.string().min(1).default('temporalguard'),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().min(1).max(65_535).default(6379),
    FRONTEND_ORIGIN: z.url().default('http://localhost:3000'),
    JWT_ACCESS_SECRET: z.string().min(16).default('development-access-secret'),
    JWT_ACCESS_TTL: z.string().min(1).default('15m'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16)
      .default('development-refresh-secret'),
    JWT_REFRESH_TTL: z.string().min(1).default('30d'),
    COOKIE_SECURE: booleanFromEnvironment,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),
    OTEL_SERVICE_NAME: z.string().min(1).default('temporalguard-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
    OTEL_EXPORTER_OTLP_PROTOCOL: z
      .enum(['http/protobuf', 'grpc'])
      .default('http/protobuf'),
    SIGNOZ_MODE: z.enum(['self_hosted', 'cloud']).default('self_hosted'),
    SIGNOZ_API_URL: optionalUrl,
    SIGNOZ_UI_URL: optionalUrl,
    SIGNOZ_API_KEY: z.string().optional(),
    SIGNOZ_INGESTION_ENDPOINT: optionalUrl,
    SIGNOZ_INGESTION_KEY: z.string().optional(),
    SIGNOZ_QUERY_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(120_000)
      .default(10_000),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default('temporalguard/workspaces'),
    FEATURE_INVESTIGATIONS: booleanFromEnvironment,
    FEATURE_COMPARISONS: booleanFromEnvironment,
    FEATURE_RULE_SIMULATION: booleanFromEnvironment,
    FEATURE_DEPLOYMENT_ANALYSIS: booleanFromEnvironment,
    FEATURE_TELEMETRY_QUALITY: booleanFromEnvironment,
    FEATURE_SIGNOZ_ASSET_PROVISIONING: booleanFromEnvironment,
    FEATURE_DEMO_SYSTEM: booleanFromEnvironment,
  })
  .passthrough()
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production') {
      if (environment.JWT_ACCESS_SECRET === 'development-access-secret') {
        context.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'must be replaced in production',
        });
      }
      if (environment.JWT_REFRESH_SECRET === 'development-refresh-secret') {
        context.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'must be replaced in production',
        });
      }
      if (!environment.COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'must be true in production',
        });
      }
    }
    if (
      environment.SIGNOZ_MODE === 'cloud' &&
      (!environment.SIGNOZ_INGESTION_ENDPOINT ||
        !environment.SIGNOZ_INGESTION_KEY)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SIGNOZ_MODE'],
        message:
          'cloud mode requires SIGNOZ_INGESTION_ENDPOINT and SIGNOZ_INGESTION_KEY',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const reasons = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${reasons}`);
  }
  return result.data;
}
