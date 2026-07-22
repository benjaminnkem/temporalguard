export interface RuleResponse {
  id: string;
  name?: string;
  description?: string;
  definition?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
