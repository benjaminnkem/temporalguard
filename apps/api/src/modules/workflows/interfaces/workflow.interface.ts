export interface WorkflowResponse {
  id: string;
  externalId?: string;
  name?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
