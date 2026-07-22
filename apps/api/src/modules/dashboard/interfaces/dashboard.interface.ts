export interface DashboardOverview {
  totalWorkflows: number;
  activeWorkflows: number;
  totalViolations: number;
  openViolations: number;
  totalRules: number;
  totalEvents: number;
}

export interface DashboardWorkflowItem {
  id: string;
  name: string;
  status: string;
  startedAt: string;
}

export interface DashboardViolationItem {
  id: string;
  ruleName: string;
  workflowId: string;
  severity: string;
  detectedAt: string;
}
