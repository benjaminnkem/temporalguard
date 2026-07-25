import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import type {
  TrackEventDto,
  TrackEventsBatchDto,
} from '../dto/track-event.dto';
import { EventIngestIdempotency } from '../entities/event-ingest-idempotency.entity';
import { mapPublicEventToIngest } from '../utils/map-public-event';
import { EventLogsService } from './event-logs.service';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type TrackEventResult = {
  id: string;
  accepted: true;
  duplicate: boolean;
};

export type TrackBatchResult = {
  accepted: true;
  count: number;
  results: Array<{ id: string; duplicate: boolean }>;
};

@Injectable()
export class PublicEventsService {
  constructor(
    private readonly eventLogsService: EventLogsService,
    @InjectRepository(EventIngestIdempotency)
    private readonly idempotencyRepository: Repository<EventIngestIdempotency>,
  ) {}

  async track(
    businessId: string,
    input: TrackEventDto,
  ): Promise<TrackEventResult> {
    const mapped = mapPublicEventToIngest(input);

    if (mapped.idempotencyKey) {
      const existing = await this.findActiveIdempotency(
        businessId,
        mapped.idempotencyKey,
      );
      if (existing) {
        return {
          id: existing.eventLogId,
          accepted: true,
          duplicate: true,
        };
      }
    }

    const { eventLog } = await this.eventLogsService.ingest(
      businessId,
      mapped.dto,
      {
        traceId: mapped.traceId,
        spanId: mapped.spanId,
      },
    );

    if (mapped.idempotencyKey) {
      const remembered = await this.rememberIdempotency(
        businessId,
        mapped.idempotencyKey,
        eventLog.id,
      );
      if (remembered.eventLogId !== eventLog.id) {
        return {
          id: remembered.eventLogId,
          accepted: true,
          duplicate: true,
        };
      }
    }

    return {
      id: eventLog.id,
      accepted: true,
      duplicate: false,
    };
  }

  async trackBatch(
    businessId: string,
    input: TrackEventsBatchDto,
  ): Promise<TrackBatchResult> {
    const results: Array<{ id: string; duplicate: boolean }> = [];

    for (const event of input.events) {
      const result = await this.track(businessId, event);
      results.push({ id: result.id, duplicate: result.duplicate });
    }

    return {
      accepted: true,
      count: results.length,
      results,
    };
  }

  private findActiveIdempotency(businessId: string, idempotencyKey: string) {
    return this.idempotencyRepository.findOne({
      where: {
        businessId,
        idempotencyKey,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  private async rememberIdempotency(
    businessId: string,
    idempotencyKey: string,
    eventLogId: string,
  ): Promise<{ eventLogId: string }> {
    try {
      await this.idempotencyRepository.save(
        this.idempotencyRepository.create({
          businessId,
          idempotencyKey,
          eventLogId,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        }),
      );
      return { eventLogId };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const existing = await this.idempotencyRepository.findOne({
          where: { businessId, idempotencyKey },
        });
        if (existing) {
          return { eventLogId: existing.eventLogId };
        }
      }
      throw error;
    }
  }
}
