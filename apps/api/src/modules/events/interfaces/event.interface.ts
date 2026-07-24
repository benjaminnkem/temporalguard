export interface IngestedEvent {
  eventName: string;
  externalWorkflowId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
