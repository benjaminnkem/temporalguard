#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const gateway = (
  process.env.TEMPORALGUARD_URL ?? "http://localhost:8088"
).replace(/\/+$/, "");
const signoz = (process.env.SIGNOZ_UI_URL ?? "http://localhost:3301").replace(
  /\/+$/,
  "",
);
const collector = (
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"
).replace(/\/+$/, "");

async function expectStatus(url, expected, options) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!expected.includes(response.status)) {
        throw new Error(
          `${url} returned ${response.status}; expected ${expected.join(" or ")}`,
        );
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error(`${url} verification failed`, { cause: lastError });
}

await Promise.all([
  expectStatus(`${gateway}/healthz`, [200]),
  expectStatus(`${gateway}/`, [200, 307]),
  expectStatus(`${gateway}/explorer`, [200]),
  expectStatus(`${gateway}/api/health/live`, [200]),
  expectStatus(`${gateway}/api/health/ready`, [200]),
  expectStatus(`${gateway}/api/health/dependencies`, [200]),
  expectStatus(`${signoz}/api/v1/health`, [200]),
]);

const signozRoute = await expectStatus(
  `${gateway}/signoz`,
  [301, 302, 307, 308],
  { redirect: "manual" },
);
if (!signozRoute.headers.get("location")?.startsWith(signoz)) {
  throw new Error("/signoz did not redirect to the configured SigNoz UI");
}

execFileSync(
  "docker",
  [
    "compose",
    "-f",
    "compose.yaml",
    "exec",
    "-T",
    "worker",
    "wget",
    "--spider",
    "-q",
    "http://127.0.0.1:3002/health/ready",
  ],
  { stdio: "inherit" },
);

const marker = `temporalguard-local-${Date.now()}`;
const traceId = randomBytes(16).toString("hex");
const spanId = randomBytes(8).toString("hex");
const time = String(BigInt(Date.now()) * 1_000_000n);
const attributes = [
  { key: "service.name", value: { stringValue: "temporalguard-verifier" } },
  { key: "temporalguard.verification.id", value: { stringValue: marker } },
];
const payloads = {
  traces: {
    resourceSpans: [
      {
        resource: { attributes },
        scopeSpans: [
          {
            scope: { name: "temporalguard.local-verifier" },
            spans: [
              {
                traceId,
                spanId,
                name: marker,
                kind: 1,
                startTimeUnixNano: time,
                endTimeUnixNano: String(BigInt(time) + 1_000_000n),
                attributes,
              },
            ],
          },
        ],
      },
    ],
  },
  logs: {
    resourceLogs: [
      {
        resource: { attributes },
        scopeLogs: [
          {
            scope: { name: "temporalguard.local-verifier" },
            logRecords: [
              {
                timeUnixNano: time,
                severityNumber: 9,
                severityText: "INFO",
                body: { stringValue: marker },
                traceId,
                spanId,
                attributes,
              },
            ],
          },
        ],
      },
    ],
  },
  metrics: {
    resourceMetrics: [
      {
        resource: { attributes },
        scopeMetrics: [
          {
            scope: { name: "temporalguard.local-verifier" },
            metrics: [
              {
                name: "temporalguard.verification",
                gauge: {
                  dataPoints: [{ timeUnixNano: time, asDouble: 1, attributes }],
                },
              },
            ],
          },
        ],
      },
    ],
  },
};

for (const [signal, body] of Object.entries(payloads)) {
  await expectStatus(`${collector}/v1/${signal}`, [200], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

console.log(
  JSON.stringify({
    ok: true,
    gateway,
    signoz,
    marker,
    traceId,
    acceptedSignals: Object.keys(payloads),
  }),
);
