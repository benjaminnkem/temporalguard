export interface IngestedEvent {
  event: string;
  workflowId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
