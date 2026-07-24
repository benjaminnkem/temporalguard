import { EventEmitter2 } from '@nestjs/event-emitter';
import { Rule } from '../../rules/entities';
import { RuleOperator } from '../../rules/enums/rule-operator.enum';
import { TimeoutUnit } from '../../rules/enums/timeout-unit.enum';
import { RulesService } from '../../rules/services/rules.service';
import { ExternalWorkflow, Workflow } from '../../workflows/entities';
import { WorkflowStatus } from '../../workflows/enums/workflow-status.enum';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { BusinessEvent, EventLog } from '../entities';
import { WorkflowEngineService } from './workflow-engine.service';

describe('WorkflowEngineService', () => {
  const authorized = { id: 'event-trigger', name: 'payment.authorized' };
  const captured = { id: 'event-captured', name: 'payment.captured' };
  const reversed = { id: 'event-reversed', name: 'payment.reversed' };
  const externalWorkflow = {
    id: 'external-workflow',
    externalId: 'payment_123',
  };

  let rulesService: jest.Mocked<
    Pick<
      RulesService,
      'findEnabledByTriggerEvent' | 'findEnabledExpectingEvent'
    >
  >;
  let workflowsService: jest.Mocked<
    Pick<
      WorkflowsService,
      | 'findWaitingForRuleAndExternalWorkflow'
      | 'findWaitingByExternalWorkflowAndRules'
      | 'createFromRule'
      | 'saveState'
    >
  >;
  let service: WorkflowEngineService;

  const makeRule = (operator: RuleOperator): Rule =>
    ({
      id: 'rule-1',
      name: 'payment-resolution',
      operator,
      timeoutValue: 15,
      timeoutUnit: TimeoutUnit.MINUTES,
      expectedEventDefinitions: [captured, reversed] as BusinessEvent[],
    }) as Rule;

  const makeLog = (event: typeof authorized): EventLog =>
    ({
      eventId: event.id,
      event,
      timestamp: new Date('2026-07-24T10:00:00.000Z'),
      externalWorkflowRecordId: externalWorkflow.id,
      externalWorkflow,
    }) as EventLog;

  const makeWorkflow = (rule: Rule): Workflow =>
    ({
      id: 'workflow-1',
      ruleId: rule.id,
      rule,
      status: WorkflowStatus.WAITING,
      externalWorkflowId: externalWorkflow.id,
      externalWorkflow: externalWorkflow as ExternalWorkflow,
      currentState: {
        receivedEvents: [],
        expectedEvents: ['payment.captured', 'payment.reversed'],
        operator: rule.operator,
      },
    }) as unknown as Workflow;

  beforeEach(() => {
    rulesService = {
      findEnabledByTriggerEvent: jest.fn(),
      findEnabledExpectingEvent: jest.fn(),
    };
    workflowsService = {
      findWaitingForRuleAndExternalWorkflow: jest.fn(),
      findWaitingByExternalWorkflowAndRules: jest.fn(),
      createFromRule: jest.fn(),
      saveState: jest.fn(),
    };
    service = new WorkflowEngineService(
      rulesService as unknown as RulesService,
      workflowsService as unknown as WorkflowsService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  it('does not process standalone logs', async () => {
    const log = makeLog(authorized);
    log.externalWorkflowRecordId = null;
    log.externalWorkflow = null;

    await expect(service.processEvent(log)).resolves.toEqual([]);
    expect(rulesService.findEnabledByTriggerEvent).not.toHaveBeenCalled();
  });

  it('reuses an existing workflow for repeated trigger logs', async () => {
    const rule = makeRule(RuleOperator.ANY);
    const workflow = makeWorkflow(rule);
    rulesService.findEnabledByTriggerEvent.mockResolvedValue([rule]);
    rulesService.findEnabledExpectingEvent.mockResolvedValue([]);
    workflowsService.findWaitingForRuleAndExternalWorkflow.mockResolvedValue(
      workflow,
    );
    workflowsService.findWaitingByExternalWorkflowAndRules.mockResolvedValue(
      [],
    );

    await expect(service.processEvent(makeLog(authorized))).resolves.toEqual([
      workflow,
    ]);
    expect(workflowsService.createFromRule).not.toHaveBeenCalled();
  });

  it('completes an ANY workflow after one expected event', async () => {
    const rule = makeRule(RuleOperator.ANY);
    const workflow = makeWorkflow(rule);
    const completed = {
      ...workflow,
      status: WorkflowStatus.COMPLETED,
    } as Workflow;
    rulesService.findEnabledByTriggerEvent.mockResolvedValue([]);
    rulesService.findEnabledExpectingEvent.mockResolvedValue([rule]);
    workflowsService.findWaitingByExternalWorkflowAndRules.mockResolvedValue([
      workflow,
    ]);
    workflowsService.saveState.mockResolvedValue(completed);

    await service.processEvent(makeLog(captured));

    expect(workflowsService.saveState).toHaveBeenCalledWith(
      workflow,
      expect.objectContaining({
        receivedEvents: ['payment.captured'],
      }),
      true,
    );
  });

  it('completes an ALL workflow only after every distinct expected event', async () => {
    const rule = makeRule(RuleOperator.ALL);
    const workflow = makeWorkflow(rule);
    workflow.currentState.receivedEvents = ['payment.captured'];
    rulesService.findEnabledByTriggerEvent.mockResolvedValue([]);
    rulesService.findEnabledExpectingEvent.mockResolvedValue([rule]);
    workflowsService.findWaitingByExternalWorkflowAndRules.mockResolvedValue([
      workflow,
    ]);
    workflowsService.saveState.mockImplementation((value, state, completed) => {
      value.currentState = state;
      if (completed) value.status = WorkflowStatus.COMPLETED;
      return Promise.resolve(value);
    });

    await service.processEvent(makeLog(reversed));

    expect(workflowsService.saveState).toHaveBeenCalledWith(
      workflow,
      expect.objectContaining({
        receivedEvents: ['payment.captured', 'payment.reversed'],
      }),
      true,
    );
  });
});
