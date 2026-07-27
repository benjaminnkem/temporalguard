import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { TemporalGuard } from "./client.js";
import { TemporalGuardError } from "./errors.js";

type FetchCall = {
  url: string;
  init: RequestInit;
};

function jsonResponse(body: unknown, status = 202): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("TemporalGuard", () => {
  const calls: FetchCall[] = [];

  afterEach(() => {
    calls.length = 0;
    mock.restoreAll();
  });

  function createClient(
    fetchImpl: typeof fetch,
    options: Partial<ConstructorParameters<typeof TemporalGuard>[0]> = {},
  ) {
    return new TemporalGuard({
      apiKey: "tg_live_test",
      baseUrl: "http://localhost:3000/api/v1",
      flushIntervalMs: 0,
      flushAt: 100,
      maxRetries: 2,
      fetch: fetchImpl,
      ...options,
    });
  }

  it("sends trackAndFlush as a single event with Bearer auth", async () => {
    const fetchImpl = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return jsonResponse({ id: "elog_1", accepted: true, duplicate: false });
    }) as unknown as typeof fetch;

    const tg = createClient(fetchImpl);
    const result = await tg.trackAndFlush("document.uploaded", {
      correlation: { key: "document.id", value: "doc_1" },
      properties: { region: "eu-west-1" },
    });

    assert.equal(result.id, "elog_1");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "http://localhost:3000/api/v1/events");
    assert.equal(
      (calls[0]?.init.headers as Record<string, string>).authorization,
      "Bearer tg_live_test",
    );
    const body = JSON.parse(String(calls[0]?.init.body)) as {
      event: string;
      correlation: { key: string; value: string };
    };
    assert.equal(body.event, "document.uploaded");
    assert.equal(body.correlation.value, "doc_1");
    await tg.shutdown();
  });

  it("flushes multiple buffered events via batch", async () => {
    const fetchImpl = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return jsonResponse({
        accepted: true,
        count: 2,
        results: [
          { id: "a", duplicate: false },
          { id: "b", duplicate: false },
        ],
      });
    }) as unknown as typeof fetch;

    const tg = createClient(fetchImpl, { flushAt: 50 });
    await tg.track("a.started", {
      correlation: { key: "order.id", value: "1" },
    });
    await tg.track("a.finished", {
      correlation: { key: "order.id", value: "1" },
    });
    const flushed = await tg.flush();

    assert.equal(flushed?.count, 2);
    assert.equal(calls[0]?.url, "http://localhost:3000/api/v1/events/batch");
    const body = JSON.parse(String(calls[0]?.init.body)) as {
      events: unknown[];
    };
    assert.equal(body.events.length, 2);
    await tg.shutdown();
  });

  it("merges defaultContext into events", async () => {
    const fetchImpl = mock.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: "", init: init ?? {} });
      return jsonResponse({ id: "elog_1", accepted: true, duplicate: false });
    }) as unknown as typeof fetch;

    const tg = createClient(fetchImpl, {
      defaultContext: { service: "documents-api" },
    });
    await tg.trackAndFlush("document.uploaded", {
      correlation: { key: "document.id", value: "doc_1" },
      context: { deployment: "sha-abc" },
    });

    const body = JSON.parse(String(calls[0]?.init.body)) as {
      context: { service: string; deployment: string };
    };
    assert.equal(body.context.service, "documents-api");
    assert.equal(body.context.deployment, "sha-abc");
    await tg.shutdown();
  });

  it("retries retryable HTTP failures then succeeds", async () => {
    let attempt = 0;
    const fetchImpl = mock.fn(async () => {
      attempt += 1;
      if (attempt < 3) {
        return jsonResponse(
          { code: "RATE_LIMITED", message: "Slow down" },
          429,
        );
      }
      return jsonResponse({ id: "elog_ok", accepted: true, duplicate: false });
    }) as unknown as typeof fetch;

    const tg = createClient(fetchImpl, { maxRetries: 3 });
    const result = await tg.trackAndFlush("document.uploaded", {
      externalId: "wf_1",
      correlation: { key: "document.id", value: "doc_1" },
    });
    assert.equal(result.id, "elog_ok");
    assert.equal(attempt, 3);
    await tg.shutdown();
  });

  it("does not retry 401 errors", async () => {
    let callCount = 0;
    const fetchImpl = mock.fn(async () => {
      callCount += 1;
      return jsonResponse(
        { code: "AUTH_INVALID_API_KEY", message: "API key is invalid." },
        401,
      );
    }) as unknown as typeof fetch;

    const tg = createClient(fetchImpl, { maxRetries: 3 });
    await assert.rejects(
      () =>
        tg.trackAndFlush("document.uploaded", {
          correlation: { key: "document.id", value: "doc_1" },
        }),
      (error: unknown) => {
        assert.ok(error instanceof TemporalGuardError);
        assert.equal(error.status, 401);
        assert.equal(error.code, "AUTH_INVALID_API_KEY");
        return true;
      },
    );
    assert.equal(callCount, 1);
    await tg.shutdown();
  });

  it("rejects track after shutdown", async () => {
    const fetchImpl = mock.fn(async () =>
      jsonResponse({ id: "x", accepted: true, duplicate: false }),
    ) as unknown as typeof fetch;
    const tg = createClient(fetchImpl);
    await tg.shutdown();
    await assert.rejects(
      () =>
        tg.track("document.uploaded", {
          correlation: { key: "document.id", value: "doc_1" },
        }),
      (error: unknown) => {
        assert.ok(error instanceof TemporalGuardError);
        assert.equal(error.code, "SDK_SHUTDOWN");
        return true;
      },
    );
  });
});
