import { readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";

const root = new URL("../", import.meta.url);
const readYaml = async (path) =>
  parse(await readFile(new URL(path, root), "utf8"));

function assertUnique(items, label) {
  const names = new Set();
  for (const item of items ?? []) {
    if (!item?.name) throw new Error(`${label} entry is missing a name`);
    if (names.has(item.name))
      throw new Error(`Duplicate ${label}: ${item.name}`);
    names.add(item.name);
  }
}

async function mergeCompose() {
  const generated = await readYaml(
    "infra/foundry/generated/local/deployment/compose.yaml",
  );
  const signozServiceName = Object.keys(generated.services ?? {}).find((name) =>
    name.endsWith("-signoz-0"),
  );
  if (!signozServiceName)
    throw new Error("Foundry Compose SigNoz service missing");
  await writeFile(
    new URL(
      "infra/foundry/generated/local/deployment/ingester/opamp.yaml",
      root,
    ),
    `server_endpoint: ws://${signozServiceName}:4320/v1/opamp\n`,
  );
  const app = await readYaml("infra/docker/compose.app.yaml");
  for (const service of Object.values(generated.services ?? {})) {
    if (!Array.isArray(service.volumes)) continue;
    service.volumes = service.volumes.map((volume) =>
      typeof volume === "string" && volume.startsWith("./")
        ? `./infra/foundry/generated/local/deployment/${volume.slice(2)}`
        : volume,
    );
  }
  const signoz = generated.services?.[signozServiceName];
  signoz.ports = ["${SIGNOZ_UI_PORT:-3301}:8080"];
  signoz.environment = [
    ...(signoz.environment ?? []),
    "SIGNOZ_TOKENIZER_JWT_SECRET=${SIGNOZ_JWT_SECRET:-temporalguard-local-signoz-secret}",
  ];
  signoz.depends_on = {
    ...(signoz.depends_on ?? {}),
    "temporalguard-signoz-metastore-postgres-0": {
      condition: "service_healthy",
    },
    "temporalguard-signoz-telemetrystore-clickhouse-0-0": {
      condition: "service_healthy",
    },
  };
  generated.services.ingester.depends_on = {
    [signozServiceName]: { condition: "service_healthy" },
    "temporalguard-signoz-telemetrystore-migrator": {
      condition: "service_completed_successfully",
    },
  };
  generated.services.ingester.entrypoint = ["/bin/sh", "-c"];
  generated.services.ingester.command = [
    "/signoz-otel-collector migrate sync check && exec /signoz-otel-collector --config=/etc/otel-collector-config.yaml",
  ];
  const services = { ...(generated.services ?? {}), ...(app.services ?? {}) };
  if (
    Object.keys(services).length !==
    Object.keys(generated.services ?? {}).length +
      Object.keys(app.services ?? {}).length
  ) {
    throw new Error("Compose service name conflict");
  }
  const merged = {
    name: "temporalguard",
    services,
    networks: { ...(generated.networks ?? {}), ...(app.networks ?? {}) },
    volumes: { ...(generated.volumes ?? {}), ...(app.volumes ?? {}) },
  };
  await writeFile(new URL("compose.yaml", root), stringify(merged));
}

async function mergeRender() {
  const generated = await readYaml(
    "infra/foundry/generated/render/deployment/render.yaml",
  );
  const app = await readYaml("infra/render/app.yaml");
  const signozService = (generated.services ?? []).find((service) =>
    service.name?.endsWith("-signoz-0"),
  );
  if (!signozService) throw new Error("Foundry Render SigNoz service missing");
  await writeFile(
    new URL(
      "infra/foundry/generated/render/deployment/configs/ingester/opamp.yaml",
      root,
    ),
    `server_endpoint: ws://${signozService.name}:4320/v1/opamp\n`,
  );
  const renderIngesterDockerfile = new URL(
    "infra/foundry/generated/render/deployment/configs/ingester/Dockerfile",
    root,
  );
  await writeFile(
    renderIngesterDockerfile,
    [
      "FROM signoz/signoz-otel-collector:latest",
      "",
      "COPY ingester.yaml /etc/otel/config.yaml",
      "COPY opamp.yaml /etc/otel/manager-config.yaml",
      "",
      'ENTRYPOINT ["/signoz-otel-collector"]',
      'CMD ["--config=/etc/otel/config.yaml"]',
      "",
    ].join("\n"),
  );
  signozService.envVars = [
    ...(signozService.envVars ?? []),
    { key: "SIGNOZ_TOKENIZER_JWT_SECRET", generateValue: true },
  ];
  for (const service of generated.services ?? []) {
    for (const key of ["dockerContext", "dockerfilePath"]) {
      if (
        typeof service[key] === "string" &&
        !service[key].startsWith("./infra/")
      ) {
        service[key] =
          `./infra/foundry/generated/render/deployment/${service[key]}`;
      }
    }
  }
  const services = [...(app.services ?? []), ...(generated.services ?? [])];
  const databases = [...(app.databases ?? []), ...(generated.databases ?? [])];
  assertUnique(services, "Render service");
  assertUnique(databases, "Render database");
  const finalBlueprint = { services, databases };
  await writeFile(new URL("render.yaml", root), stringify(finalBlueprint));
  console.log(
    `Merged ${services.length} services and ${databases.length} databases into render.yaml`,
  );
}

await mergeCompose();
await mergeRender();
