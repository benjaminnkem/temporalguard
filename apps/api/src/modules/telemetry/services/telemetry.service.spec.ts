import { createHash } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { Logger } from '@opentelemetry/api-logs';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  it('adds the company hash to workflow logs used by scoped SigNoz queries', () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'telemetry.serviceName' ? 'temporalguard-api' : 'test',
      ),
    } as unknown as ConfigService;
    const service = new TelemetryService(config);
    const logger = (
      service as unknown as {
        logger: Logger;
      }
    ).logger;
    const emit = jest.spyOn(logger, 'emit');
    const businessId = '11111111-1111-4111-8111-111111111111';

    service.workflowStarted(
      'workflow-1',
      'rule-1',
      'Payment rule',
      'waiting',
      businessId,
    );

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          'temporalguard.workflow.id': 'workflow-1',
          'temporalguard.company.id_hash': createHash('sha256')
            .update(businessId)
            .digest('hex'),
        }),
      }),
    );
  });
});
