import { Injectable, MessageEvent, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { DataSource, MoreThan, Repository } from 'typeorm';
import {
  Investigation,
  InvestigationStreamEvent,
} from '../processing/entities';

@Injectable()
export class InvestigationStreamService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(InvestigationStreamEvent)
    private readonly events: Repository<InvestigationStreamEvent>,
    @InjectRepository(Investigation)
    private readonly investigations: Repository<Investigation>,
  ) {}

  append(
    businessId: string,
    investigationId: string,
    type: string,
    data: Record<string, unknown> = {},
  ): Promise<InvestigationStreamEvent> {
    return this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Investigation)
        .createQueryBuilder('investigation')
        .setLock('pessimistic_write')
        .where('investigation.id = :investigationId', { investigationId })
        .andWhere('investigation.businessId = :businessId', { businessId })
        .getOneOrFail();
      const row = await manager
        .getRepository(InvestigationStreamEvent)
        .createQueryBuilder('event')
        .select('COALESCE(MAX(event.sequence), 0)', 'sequence')
        .where('event.investigationId = :investigationId', { investigationId })
        .getRawOne<{ sequence: string }>();
      return manager.getRepository(InvestigationStreamEvent).save({
        businessId,
        investigationId,
        sequence: String(BigInt(row?.sequence ?? '0') + 1n),
        type,
        data,
      });
    });
  }

  async after(
    businessId: string,
    investigationId: string,
    sequence: string,
  ): Promise<InvestigationStreamEvent[]> {
    return this.events.find({
      where: {
        businessId,
        investigationId,
        sequence: MoreThan(sequence),
      },
      order: { sequence: 'ASC' },
      take: 200,
    });
  }

  stream(
    businessId: string,
    investigationId: string,
    lastEventId?: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let cursor = /^\d+$/.test(lastEventId ?? '') ? lastEventId! : '0';
      let stopped = false;
      let running = false;
      const poll = async () => {
        if (stopped || running) return;
        running = true;
        try {
          const exists = await this.investigations.existsBy({
            id: investigationId,
            businessId,
          });
          if (!exists) throw new NotFoundException('Investigation not found');
          const events = await this.after(businessId, investigationId, cursor);
          for (const event of events) {
            cursor = event.sequence;
            subscriber.next({
              id: event.sequence,
              type: event.type,
              data: event.data,
              retry: 1500,
            });
          }
        } catch (error: unknown) {
          subscriber.error(error);
        } finally {
          running = false;
        }
      };
      void poll();
      const timer = setInterval(() => void poll(), 1000);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    });
  }
}
