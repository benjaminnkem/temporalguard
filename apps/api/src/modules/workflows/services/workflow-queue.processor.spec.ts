import { Job } from 'bullmq';
import { RuleOperator } from '../../rules/enums/rule-operator.enum';
import { ViolationsService } from '../../violations/services/violations.service';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { WorkflowsService } from './workflows.service';
import { WorkflowQueueProcessor } from './workflow-queue.processor';

describe('WorkflowQueueProcessor', () => {
  const job = {
    data: {
      businessId: 'business-1',
      workflowId: 'workflow-1',
      ruleId: 'rule-1',
    },
  } as Job<{
    businessId: string;
    workflowId: string;
    ruleId: string;
  }>;

  let workflowsService: {
    findOne: jest.Mock;
    updateStatus: jest.Mock;
  };
  let violationsService: {
    create: jest.Mock;
  };
  let processor: WorkflowQueueProcessor;

  beforeEach(() => {
    workflowsService = {
      findOne: jest.fn(),
      updateStatus: jest.fn(),
    };
    violationsService = {
      create: jest.fn(),
    };
    processor = new WorkflowQueueProcessor(
      workflowsService as unknown as WorkflowsService,
      violationsService as unknown as ViolationsService,
    );
  });

  it('completes a FORBID workflow when its window expires cleanly', async () => {
    workflowsService.findOne.mockResolvedValue({
      id: 'workflow-1',
      status: WorkflowStatus.WAITING,
      rule: {
        id: 'rule-1',
        operator: RuleOperator.FORBID,
      },
    });

    await processor.process(job);

    expect(workflowsService.updateStatus).toHaveBeenCalledWith(
      'business-1',
      'workflow-1',
      WorkflowStatus.COMPLETED,
    );
    expect(violationsService.create).not.toHaveBeenCalled();
  });
});
