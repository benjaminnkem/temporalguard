import { TemporalGuardError } from "./errors.js";
import { HttpClient } from "./http.js";
import type {
  EventContext,
  FlushResult,
  TemporalGuardOptions,
  TrackEventPayload,
  TrackOptions,
  TrackResult,
} from "./types.js";

const DEFAULT_FLUSH_INTERVAL_MS = 2000;
const DEFAULT_FLUSH_AT = 20;
const MAX_BATCH_SIZE = 100;

function toIsoTimestamp(value: Date | string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function mergeContext(
  defaults: EventContext | undefined,
  override: EventContext | undefined,
): EventContext | undefined {
  if (!defaults && !override) return undefined;
  return {
    ...(defaults ?? {}),
    ...(override ?? {}),
  };
}

export class TemporalGuard {
  private readonly http: HttpClient;
  private readonly flushIntervalMs: number;
  private readonly flushAt: number;
  private readonly defaultContext?: EventContext;
  private readonly queue: TrackEventPayload[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private closed = false;
  private flushChain: Promise<void> = Promise.resolve();

  constructor(options: TemporalGuardOptions) {
    this.http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      fetchImpl: options.fetch,
    });
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.flushAt = options.flushAt ?? DEFAULT_FLUSH_AT;
    this.defaultContext = options.defaultContext;
    this.startTimer();
  }

  async track(event: string, options: TrackOptions): Promise<void> {
    this.assertOpen();
    this.queue.push(this.toPayload(event, options));
    if (this.queue.length >= this.flushAt) {
      await this.flush();
    }
  }

  async trackAndFlush(
    event: string,
    options: TrackOptions,
  ): Promise<TrackResult> {
    this.assertOpen();
    await this.flush();
    return this.http.trackEvent(this.toPayload(event, options));
  }

  async flush(): Promise<FlushResult | undefined> {
    return this.enqueueFlush(async () => {
      if (this.queue.length === 0) {
        return undefined;
      }

      const pending = this.queue.splice(0, this.queue.length);
      const allResults: Array<{ id: string; duplicate: boolean }> = [];

      for (let offset = 0; offset < pending.length; offset += MAX_BATCH_SIZE) {
        const chunk = pending.slice(offset, offset + MAX_BATCH_SIZE);
        if (chunk.length === 1) {
          const single = await this.http.trackEvent(chunk[0]!);
          allResults.push({ id: single.id, duplicate: single.duplicate });
        } else {
          const batch = await this.http.trackBatch(chunk);
          allResults.push(...batch.results);
        }
      }

      return {
        accepted: true as const,
        count: allResults.length,
        results: allResults,
      };
    });
  }

  async shutdown(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.stopTimer();
    await this.flush();
  }

  private toPayload(event: string, options: TrackOptions): TrackEventPayload {
    if (!event?.trim()) {
      throw new TemporalGuardError({
        message: "event name is required.",
        status: 0,
        code: "SDK_INVALID_OPTIONS",
      });
    }
    if (!options.correlation?.key?.trim() || !options.correlation?.value?.trim()) {
      if (!options.externalId?.trim()) {
        throw new TemporalGuardError({
          message:
            "correlation (key + value) or externalId is required on track().",
          status: 0,
          code: "SDK_INVALID_OPTIONS",
        });
      }
    }

    const context = mergeContext(this.defaultContext, options.context);
    const payload: TrackEventPayload = {
      event: event.trim(),
      timestamp: toIsoTimestamp(options.timestamp),
    };

    if (options.correlation?.key && options.correlation?.value) {
      payload.correlation = {
        key: options.correlation.key,
        value: options.correlation.value,
      };
    }
    if (options.externalId) payload.externalId = options.externalId;
    if (options.properties) payload.properties = options.properties;
    if (context && Object.keys(context).length > 0) payload.context = context;
    if (options.idempotencyKey) payload.idempotencyKey = options.idempotencyKey;

    return payload;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new TemporalGuardError({
        message: "TemporalGuard client has been shut down.",
        status: 0,
        code: "SDK_SHUTDOWN",
      });
    }
  }

  private startTimer(): void {
    if (this.flushIntervalMs <= 0) return;
    this.timer = setInterval(() => {
      void this.flush().catch(() => {
        // Timer flushes are best-effort; next flush/shutdown surfaces errors.
      });
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private enqueueFlush<T>(work: () => Promise<T>): Promise<T> {
    const run = this.flushChain.then(work, work);
    this.flushChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
