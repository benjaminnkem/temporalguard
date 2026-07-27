import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";

const blueprint = parse(
  await readFile(new URL("../render.yaml", import.meta.url), "utf8"),
);
const schemaResponse = await fetch(
  "https://render.com/schema/render.yaml.json",
);
if (!schemaResponse.ok)
  throw new Error("Unable to download Render Blueprint schema");
const schema = await schemaResponse.json();
const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});
const validateSchema = ajv.compile(schema);
if (!validateSchema(blueprint)) {
  throw new Error(
    `Render schema validation failed: ${ajv.errorsText(validateSchema.errors)}`,
  );
}
const services = blueprint.services ?? [];
const databases = blueprint.databases ?? [];
const serviceNames = new Set(services.map((service) => service.name));
const databaseNames = new Set(databases.map((database) => database.name));

if (serviceNames.size !== services.length)
  throw new Error("Duplicate Render service names");
if (databaseNames.size !== databases.length)
  throw new Error("Duplicate Render database names");
for (const service of services) {
  if (!service.name || !service.type)
    throw new Error("Every service needs name and type");
  if (service.type === "pserv" && service.healthCheckPath) {
    throw new Error(
      `${service.name} is a private service and cannot define healthCheckPath`,
    );
  }
  if (service.type !== "keyvalue" && !service.runtime) {
    throw new Error(`${service.name} is missing runtime`);
  }
  for (const variable of service.envVars ?? []) {
    const dependency = variable.fromService?.name;
    if (dependency && !serviceNames.has(dependency)) {
      throw new Error(
        `${service.name} references missing service ${dependency}`,
      );
    }
    const database = variable.fromDatabase?.name;
    if (database && !databaseNames.has(database)) {
      throw new Error(
        `${service.name} references missing database ${database}`,
      );
    }
  }
}
const required = new Map([
  ["temporalguard", "web"],
  ["temporalguard-redis", "keyvalue"],
]);
for (const [name, type] of required) {
  const service = services.find((candidate) => candidate.name === name);
  if (service?.type !== type) throw new Error(`${name} must be type ${type}`);
}
const applicationDatabase = databases.find(
  (database) => database.name === "temporalguard-postgres",
);
if (!applicationDatabase) {
  throw new Error("Managed application PostgreSQL is missing");
}
if (
  services.some((service) => service.plan !== "free") ||
  databases.some((database) => database.plan !== "free")
) {
  throw new Error("The Render demo Blueprint may contain only free plans");
}
if (
  services.some(
    (service) => service.type === "pserv" || service.type === "worker",
  )
) {
  throw new Error(
    "The Render demo Blueprint cannot contain private services or workers",
  );
}
if (services.some((service) => service.preDeployCommand)) {
  throw new Error(
    "Free Render web services cannot define a pre-deploy command",
  );
}

const requiredEnvironment = {
  temporalguard: [
    "NODE_ENV",
    "DATABASE_URL",
    "REDIS_URL",
    "DB_SCHEMA",
    "ENCRYPTION_KEY",
    "QUEUE_PREFIX",
    "JOB_RETRY_ATTEMPTS",
    "JOB_STALLED_INTERVAL_MS",
    "INVESTIGATION_QUEUE_CONCURRENCY",
    "INVESTIGATION_MAX_CONCURRENT_PER_COMPANY",
    "RUN_PROCESSING_WORKER_IN_API",
    "FRONTEND_ORIGIN",
    "JWT_ACCESS_SECRET",
    "JWT_ACCESS_TTL",
    "JWT_REFRESH_SECRET",
    "JWT_REFRESH_TTL",
    "COOKIE_SECURE",
    "COOKIE_SAME_SITE",
    "COOKIE_DOMAIN",
    "CLOUDINARY_FOLDER",
    "OTEL_SERVICE_NAME",
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_COMPRESSION",
    "OTEL_LOGS_EXPORTER",
    "SIGNOZ_MODE",
    "SIGNOZ_INGESTION_ENDPOINT",
    "SIGNOZ_INGESTION_KEY",
    "SIGNOZ_API_URL",
    "SIGNOZ_UI_URL",
    "SIGNOZ_API_KEY",
    "SIGNOZ_QUERY_TIMEOUT_MS",
    "SIGNOZ_QUERY_MAX_RANGE_HOURS",
    "SIGNOZ_COMPARISON_MAX_RANGE_DAYS",
    "SIGNOZ_QUERY_MAX_RETRIES",
    "SIGNOZ_QUERY_CIRCUIT_BREAKER_THRESHOLD",
    "SIGNOZ_QUERY_CIRCUIT_BREAKER_RESET_MS",
    "SIGNOZ_QUERY_RATE_LIMIT_PER_MINUTE",
    "INVESTIGATION_AGENT_ENABLED",
    "AI_PROVIDER",
    "AI_BASE_URL",
    "AI_MODEL",
    "AI_MAX_STEPS",
    "AI_REQUEST_TIMEOUT_MS",
    "AI_MAX_INPUT_CHARS",
    "FEATURE_INVESTIGATIONS",
    "FEATURE_COMPARISONS",
    "FEATURE_RULE_SIMULATION",
    "FEATURE_DEPLOYMENT_ANALYSIS",
    "FEATURE_TELEMETRY_QUALITY",
    "FEATURE_SIGNOZ_ASSET_PROVISIONING",
    "FEATURE_DEMO_SYSTEM",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_DATA_MODE",
    "NEXT_PUBLIC_AUTH_MODE",
    "NEXT_PUBLIC_SIGNOZ_UI_URL",
    "NEXT_PUBLIC_DEFAULT_ENVIRONMENT",
    "NEXT_PUBLIC_SIGNOZ_MODE",
  ],
};

for (const [serviceName, keys] of Object.entries(requiredEnvironment)) {
  const service = services.find((candidate) => candidate.name === serviceName);
  const configuredKeys = new Set(
    (service?.envVars ?? []).map((variable) => variable.key),
  );
  const missing = keys.filter((key) => !configuredKeys.has(key));
  if (missing.length > 0) {
    throw new Error(
      `${serviceName} is missing environment variables: ${missing.join(", ")}`,
    );
  }
}

const application = services.find(
  (service) => service.name === "temporalguard",
);
if (!application?.domains?.includes("temporalguard.oluwadunsin.dev")) {
  throw new Error("TemporalGuard custom domain is missing");
}
const applicationEnvironment = new Map(
  (application?.envVars ?? []).map((variable) => [variable.key, variable]),
);
if (applicationEnvironment.get("SIGNOZ_MODE")?.value !== "cloud") {
  throw new Error("The Render demo must use SigNoz Cloud");
}
if (
  applicationEnvironment.get("RUN_PROCESSING_WORKER_IN_API")?.value !== "true"
) {
  throw new Error("The free demo must process queues inside the API");
}
for (const secret of [
  "SIGNOZ_INGESTION_ENDPOINT",
  "SIGNOZ_INGESTION_KEY",
  "SIGNOZ_API_URL",
  "SIGNOZ_UI_URL",
  "SIGNOZ_API_KEY",
  "NEXT_PUBLIC_SIGNOZ_UI_URL",
]) {
  if (applicationEnvironment.get(secret)?.sync !== false) {
    throw new Error(`${secret} must be supplied during Blueprint creation`);
  }
}
console.log(
  `Render Blueprint valid: ${services.length} services, ${databases.length} databases`,
);
