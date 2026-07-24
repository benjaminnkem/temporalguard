export interface ViolationResponse {
  id: string;
  businessId: string;
  ruleId?: string;
  workflowId?: string;
  severity?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
