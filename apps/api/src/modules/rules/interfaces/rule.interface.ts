export interface RuleResponse {
  id: string;
  businessId: string;
  name?: string;
  description?: string;
  definition?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
