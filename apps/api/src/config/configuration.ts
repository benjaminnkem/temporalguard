export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'temporalguard',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
  telemetry: {
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'temporalguard-api',
    exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    exporterProtocol:
      process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAME_SITE ?? 'lax',
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? 'temporalguard/workspaces',
  },
});
