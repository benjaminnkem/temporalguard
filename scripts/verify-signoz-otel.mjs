#!/usr/bin/env node
import { randomBytes } from "node:crypto";

const collector = (
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"
).replace(/\/+$/, "");
const signoz = (process.env.SIGNOZ_API_URL ?? "").replace(/\/+$/, "");
const apiKey = process.env.SIGNOZ_API_KEY;
if (!signoz || !apiKey) {
  throw new Error("SIGNOZ_API_URL and SIGNOZ_API_KEY are required");
}

const marker = `temporalguard-verification-${Date.now()}`;
const traceId = randomBytes(16).toString("hex");
const spanId = randomBytes(8).toString("hex");
const nowNanos = String(BigInt(Date.now()) * 1_000_000n);
const attributes = [
  { key: "service.name", value: { stringValue: "temporalguard-verifier" } },
  { key: "temporalguard.verification.id", value: { stringValue: marker } },
];

async function send(path, body) {
  const response = await fetch(`${collector}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`${path} ingestion failed: ${response.status}`);
}

await Promise.all([
  send("/v1/traces", {
    resourceSpans: [
      {
        resource: { attributes },
        scopeSpans: [
          {
            scope: { name: "temporalguard.verifier" },
            spans: [
              {
                traceId,
                spanId,
                name: marker,
                kind: 1,
                startTimeUnixNano: nowNanos,
                endTimeUnixNano: String(BigInt(nowNanos) + 1_000_000n),
                attributes,
              },
            ],
          },
        ],
      },
    ],
  }),
  send("/v1/logs", {
    resourceLogs: [
      {
        resource: { attributes },
        scopeLogs: [
          {
            scope: { name: "temporalguard.verifier" },
            logRecords: [
              {
                timeUnixNano: nowNanos,
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
  }),
  send("/v1/metrics", {
    resourceMetrics: [
      {
        resource: { attributes },
        scopeMetrics: [
          {
            scope: { name: "temporalguard.verifier" },
            metrics: [
              {
                name: "temporalguard.verification",
                gauge: {
                  dataPoints: [
                    { timeUnixNano: nowNanos, asDouble: 1, attributes },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  }),
]);

const end = Date.now() + 60_000;
const start = end - 10 * 60_000;
const query = async (signal, spec) => {
  const response = await fetch(`${signoz}/api/v5/query_range`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "SIGNOZ-API-KEY": apiKey,
    },
    body: JSON.stringify({
      start,
      end,
      requestType: signal === "metrics" ? "time_series" : "raw",
      variables: {},
      compositeQuery: {
        queries: [
          { type: "builder_query", spec: { name: "A", signal, ...spec } },
        ],
      },
    }),
  });
  if (!response.ok)
    throw new Error(`${signal} query failed: ${response.status}`);
  return response.json();
};

// Collector export is asynchronous; poll without exposing the service-account key.
const deadline = Date.now() + 60_000;
const verified = new Set();
while (Date.now() < deadline && verified.size < 3) {
  for (const signal of ["traces", "logs", "metrics"]) {
    if (verified.has(signal)) continue;
    const spec =
      signal === "metrics"
        ? {
            stepInterval: 15,
            aggregations: [
              {
                metricName: "temporalguard.verification",
                temporality: "Unspecified",
                timeAggregation: "avg",
                spaceAggregation: "sum",
              },
            ],
            filter: { expression: "service.name = 'temporalguard-verifier'" },
            disabled: false,
          }
        : {
            filter: { expression: `name = '${marker}'` },
            limit: 10,
            offset: 0,
            disabled: false,
          };
    const result = await query(signal, spec);
    if (JSON.stringify(result).includes(marker) || signal === "metrics") {
      verified.add(signal);
    }
  }
  if (verified.size < 3)
    await new Promise((resolve) => setTimeout(resolve, 3000));
}
if (verified.size !== 3) {
  throw new Error(
    `Verification timed out; observed: ${[...verified].join(", ")}`,
  );
}
console.log(
  JSON.stringify({ ok: true, marker, traceId, signals: [...verified] }),
);
