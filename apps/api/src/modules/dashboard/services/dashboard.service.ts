import { Injectable } from '@nestjs/common';
import {
  DashboardOverview,
  DashboardViolationItem,
  DashboardWorkflowItem,
} from '../interfaces';

@Injectable()
export class DashboardService {
  getOverview(): DashboardOverview {
    return {
      totalWorkflows: 12,
      activeWorkflows: 4,
      totalViolations: 3,
      openViolations: 1,
      totalRules: 8,
      totalEvents: 142,
    };
  }

  getWorkflows(): DashboardWorkflowItem[] {
    return [
      {
        id: 'wf_001',
        name: 'payment.capture',
        status: 'running',
        startedAt: new Date().toISOString(),
      },
      {
        id: 'wf_002',
        name: 'order.fulfillment',
        status: 'completed',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

  getViolations(): DashboardViolationItem[] {
    return [
      {
        id: 'viol_001',
        ruleName: 'payment-must-resolve-within-15m',
        workflowId: 'pay_123',
        severity: 'high',
        detectedAt: new Date().toISOString(),
      },
    ];
  }
}
