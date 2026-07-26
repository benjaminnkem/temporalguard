import { ApiKeyEnvironment } from '../../businesses/enums/api-key-environment.enum';
import { PublicEventsService } from './public-events.service';
import type { EventLogsService } from './event-logs.service';
import type { EventIngestIdempotency } from '../entities/event-ingest-idempotency.entity';

describe('PublicEventsService', () => {
  const businessId = 'biz_1';
  const timestamp = new Date().toISOString();
  const env = ApiKeyEnvironment.LIVE;

  const eventLogsService = {
    ingest: jest.fn(),
  };

  const idempotencyRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value: Partial<EventIngestIdempotency>) => value),
  };

  let service: PublicEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublicEventsService(
      eventLogsService as unknown as EventLogsService,
      idempotencyRepository as never,
    );
  });

  it('tracks a new event and returns accepted result', async () => {
    idempotencyRepository.findOne.mockResolvedValue(null);
    eventLogsService.ingest.mockResolvedValue({
      eventLog: { id: 'elog_1' },
      workflows: [],
    });
    idempotencyRepository.save.mockResolvedValue({});

    const result = await service.track(
      businessId,
      {
        event: 'document.uploaded',
        timestamp,
        correlation: { key: 'document.id', value: 'doc_1' },
        idempotencyKey: 'key-1',
      },
      env,
    );

    expect(result).toEqual({
      id: 'elog_1',
      accepted: true,
      duplicate: false,
    });
    expect(eventLogsService.ingest).toHaveBeenCalledTimes(1);
    const [calledBusinessId, calledDto, calledOptions] = eventLogsService.ingest
      .mock.calls[0] as [
      string,
      {
        eventName: string;
        externalWorkflowId: string;
        payload: { _tg: { apiEnvironment: string; environment: string } };
      },
      unknown,
    ];
    expect(calledBusinessId).toBe(businessId);
    expect(calledDto.eventName).toBe('document.uploaded');
    expect(calledDto.externalWorkflowId).toBe('document.id:doc_1');
    expect(calledDto.payload._tg).toMatchObject({
      apiEnvironment: 'live',
      environment: 'production',
    });
    expect(calledOptions).toEqual(expect.any(Object));
    expect(idempotencyRepository.save).toHaveBeenCalled();
  });

  it('returns duplicate without re-ingesting when idempotency hits', async () => {
    idempotencyRepository.findOne.mockResolvedValue({
      eventLogId: 'elog_existing',
    });

    const result = await service.track(
      businessId,
      {
        event: 'document.uploaded',
        timestamp,
        externalId: 'wf_1',
        idempotencyKey: 'key-1',
      },
      env,
    );

    expect(result).toEqual({
      id: 'elog_existing',
      accepted: true,
      duplicate: true,
    });
    expect(eventLogsService.ingest).not.toHaveBeenCalled();
  });

  it('tracks a batch in order', async () => {
    idempotencyRepository.findOne.mockResolvedValue(null);
    eventLogsService.ingest
      .mockResolvedValueOnce({ eventLog: { id: 'a' }, workflows: [] })
      .mockResolvedValueOnce({ eventLog: { id: 'b' }, workflows: [] });

    const result = await service.trackBatch(
      businessId,
      {
        events: [
          {
            event: 'a.started',
            timestamp,
            externalId: 'wf_1',
          },
          {
            event: 'a.finished',
            timestamp,
            externalId: 'wf_1',
          },
        ],
      },
      env,
    );

    expect(result).toEqual({
      accepted: true,
      count: 2,
      results: [
        { id: 'a', duplicate: false },
        { id: 'b', duplicate: false },
      ],
    });
  });
});
