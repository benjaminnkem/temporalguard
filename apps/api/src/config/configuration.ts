export default () => {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL
    ? new URL(process.env.REDIS_URL)
    : undefined;
  const httpUrl = (value: string | undefined) =>
    value && (/^https?:\/\//.test(value) ? value : `http://${value}`);
  return {
    port: Number(process.env.PORT ?? 3000),
    database: {
      url: databaseUrl,
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'temporalguard',
      schema: process.env.DB_SCHEMA ?? 'public',
    },
    redis: {
      host: redisUrl?.hostname ?? process.env.REDIS_HOST ?? 'localhost',
      port: Number(redisUrl?.port ?? process.env.REDIS_PORT ?? 6379),
      username: redisUrl?.username || undefined,
      password: redisUrl?.password || undefined,
      tls: redisUrl?.protocol === 'rediss:',
    },
    encryptionKey: process.env.ENCRYPTION_KEY,
    queue: {
      prefix: process.env.QUEUE_PREFIX ?? 'temporalguard',
      retryAttempts: Number(process.env.JOB_RETRY_ATTEMPTS ?? 5),
      stalledIntervalMs: Number(process.env.JOB_STALLED_INTERVAL_MS ?? 30_000),
      investigationConcurrency: Number(
        process.env.INVESTIGATION_QUEUE_CONCURRENCY ?? 4,
      ),
      maxConcurrentPerCompany: Number(
        process.env.INVESTIGATION_MAX_CONCURRENT_PER_COMPANY ?? 3,
      ),
    },
    worker: {
      healthPort: Number(process.env.WORKER_HEALTH_PORT ?? 3002),
      runProcessingInApi: process.env.RUN_PROCESSING_WORKER_IN_API === 'true',
    },
    nodeEnv: process.env.NODE_ENV ?? 'development',
    telemetry: {
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'temporalguard-api',
      exporterEndpoint: httpUrl(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
      exporterProtocol:
        process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf',
    },
    signoz: {
      mode: process.env.SIGNOZ_MODE ?? 'self_hosted',
      apiUrl: httpUrl(process.env.SIGNOZ_API_URL)?.replace(/\/+$/, ''),
      apiKey: process.env.SIGNOZ_API_KEY,
      uiUrl:
        (process.env.SIGNOZ_UI_URL ?? process.env.NEXT_PUBLIC_SIGNOZ_UI_URL)
          ? httpUrl(
              process.env.SIGNOZ_UI_URL ??
                process.env.NEXT_PUBLIC_SIGNOZ_UI_URL,
            )?.replace(/\/+$/, '')
          : undefined,
      queryTimeoutMs: Number(process.env.SIGNOZ_QUERY_TIMEOUT_MS ?? 10_000),
      queryMaxRangeHours: Number(
        process.env.SIGNOZ_QUERY_MAX_RANGE_HOURS ?? 24,
      ),
      comparisonMaxRangeDays: Number(
        process.env.SIGNOZ_COMPARISON_MAX_RANGE_DAYS ?? 30,
      ),
      queryMaxRetries: Number(process.env.SIGNOZ_QUERY_MAX_RETRIES ?? 2),
      circuitBreakerThreshold: Number(
        process.env.SIGNOZ_QUERY_CIRCUIT_BREAKER_THRESHOLD ?? 5,
      ),
      circuitBreakerResetMs: Number(
        process.env.SIGNOZ_QUERY_CIRCUIT_BREAKER_RESET_MS ?? 30_000,
      ),
      rateLimitPerMinute: Number(
        process.env.SIGNOZ_QUERY_RATE_LIMIT_PER_MINUTE ?? 120,
      ),
    },
    auth: {
      accessSecret:
        process.env.JWT_ACCESS_SECRET ?? 'development-access-secret',
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
    features: {
      investigations: process.env.FEATURE_INVESTIGATIONS === 'true',
      comparisons: process.env.FEATURE_COMPARISONS === 'true',
      ruleSimulation: process.env.FEATURE_RULE_SIMULATION === 'true',
      deploymentAnalysis: process.env.FEATURE_DEPLOYMENT_ANALYSIS === 'true',
      telemetryQuality: process.env.FEATURE_TELEMETRY_QUALITY === 'true',
      signozAssetProvisioning:
        process.env.FEATURE_SIGNOZ_ASSET_PROVISIONING === 'true',
      demoSystem: process.env.FEATURE_DEMO_SYSTEM === 'true',
    },
    agent: {
      enabled: process.env.INVESTIGATION_AGENT_ENABLED === 'true',
      provider: process.env.AI_PROVIDER ?? 'disabled',
      apiKey: process.env.AI_API_KEY,
      baseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
      model: process.env.AI_MODEL ?? 'gpt-5.6-terra',
      maxSteps: Number(process.env.AI_MAX_STEPS ?? 8),
      requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30_000),
      maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS ?? 60_000),
    },
  };
};
