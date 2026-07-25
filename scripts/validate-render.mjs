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
  ["temporalguard-gateway", "web"],
  ["temporalguard-web", "pserv"],
  ["temporalguard-api", "pserv"],
  ["temporalguard-worker", "worker"],
  ["temporalguard-redis", "keyvalue"],
]);
for (const [name, type] of required) {
  const service = services.find((candidate) => candidate.name === name);
  if (service?.type !== type) throw new Error(`${name} must be type ${type}`);
}
if (!databaseNames.has("temporalguard-postgres")) {
  throw new Error("Managed application PostgreSQL is missing");
}
console.log(
  `Render Blueprint valid: ${services.length} services, ${databases.length} databases`,
);
