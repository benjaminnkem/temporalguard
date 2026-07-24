export interface IngestedEvent {
  businessId: string;
  eventName: string;
  externalWorkflowId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
