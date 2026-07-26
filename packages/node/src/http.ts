import { TemporalGuardError } from "./errors.js";
import type {
  FlushResult,
  PublicErrorBody,
  TrackEventPayload,
  TrackResult,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.temporalguard.com/api/v1";

export type HttpClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const asInt = Number(header);
  if (!Number.isNaN(asInt) && asInt >= 0) {
    return asInt * 1000;
  }
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return undefined;
}

async function readErrorBody(response: Response): Promise<PublicErrorBody> {
  try {
    return (await response.json()) as PublicErrorBody;
  } catch {
    return {};
  }
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpClientOptions) {
    if (!options.apiKey?.trim()) {
      throw new TemporalGuardError({
        message: "apiKey is required.",
        status: 0,
        code: "SDK_INVALID_OPTIONS",
      });
    }

    this.apiKey = options.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  trackEvent(payload: TrackEventPayload): Promise<TrackResult> {
    return this.requestJson<TrackResult>("POST", "/events", payload);
  }

  trackBatch(events: TrackEventPayload[]): Promise<FlushResult> {
    return this.requestJson<FlushResult>("POST", "/events/batch", { events });
  }

  private async requestJson<T>(
    method: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.send(method, path, body);
        if (response.ok) {
          return (await response.json()) as T;
        }

        if (!isRetryableStatus(response.status) || attempt === this.maxRetries) {
          const errorBody = await readErrorBody(response);
          throw new TemporalGuardError({
            message:
              errorBody.message ??
              `TemporalGuard API request failed with status ${response.status}.`,
            status: response.status,
            code: errorBody.code ?? "HTTP_ERROR",
            details: errorBody.details,
            requestId: errorBody.requestId,
          });
        }

        const retryAfter = parseRetryAfterMs(response.headers.get("retry-after"));
        const backoff = retryAfter ?? 250 * 2 ** attempt;
        await sleep(backoff);
        attempt += 1;
        continue;
      } catch (error) {
        lastError = error;
        if (error instanceof TemporalGuardError) {
          throw error;
        }
        if (attempt === this.maxRetries) {
          throw new TemporalGuardError({
            message:
              error instanceof Error
                ? error.message
                : "TemporalGuard API request failed.",
            status: 0,
            code: "NETWORK_ERROR",
          });
        }
        await sleep(250 * 2 ** attempt);
        attempt += 1;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new TemporalGuardError({
          message: "TemporalGuard API request failed.",
          status: 0,
          code: "NETWORK_ERROR",
        });
  }

  private async send(
    method: string,
    path: string,
    body: unknown,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
