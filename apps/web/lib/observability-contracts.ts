export type EvidenceRecord = {
  id: string;
  investigationId: string;
  type: string;
  signal: string;
  title: string;
  summary: string;
  serviceName: string | null;
  serviceVersion: string | null;
  traceId: string | null;
  reference: string | null;
  confidence: number | null;
  createdAt: string;
};

export type InvestigationRecord = {
  id: string;
  violationId: string;
  workflowId: string;
  ruleId: string;
  status: string;
  summary: string | null;
  confidence: string | null;
  topContributor: string | null;
  dataGapCount: number;
  evidenceCount: number;
  report: {
    schemaVersion: "1.0";
    summary: string;
    confidence: "low" | "medium" | "high";
    telemetryCompleteness: { score: number; gaps: string[] };
    contributors: Array<{
      rank: number;
      name: string;
      score: number;
      evidenceIds: string[];
    }>;
    claims: Array<{ text: string; evidenceIds: string[] }>;
    noRemediationPerformed: true;
  } | null;
  evidence?: EvidenceRecord[];
  steps?: Array<{ id: string; sequence: number; name: string; status: string }>;
  createdAt: string;
  updatedAt: string;
};

export type ComparisonRecord = {
  id: string;
  name: string;
  status: string;
  configuration: Record<string, unknown>;
  cohortASize: number;
  cohortBSize: number;
  resultSummary: {
    kind: string;
    cohortA: CohortMetrics;
    cohortB: CohortMetrics;
    telemetryQualityDimension: { available: number; total: number };
  } | null;
  createdAt: string;
};

export type CohortMetrics = {
  count: number;
  completionRate: number;
  violationRate: number;
  medianDurationMs: number | null;
  versions: Record<string, number>;
};

export type SimulationRecord = {
  id: string;
  status: string;
  from: string;
  to: string;
  workflowsEvaluated: number;
  wouldComplete: number;
  wouldCompleteLate: number;
  wouldViolate: number;
  result: Record<string, unknown> | null;
  createdAt: string;
};

export type DeploymentRecord = {
  id: string;
  serviceName: string;
  environment: string;
  version: string;
  firstObservedAt: string;
  lastObservedAt: string;
  source: string;
};

export type QualityRecord = {
  id: string;
  scopeType: string;
  scopeKey: string;
  from: string;
  to: string;
  score: number;
  dimensions: Record<string, unknown>;
  criticalGaps: unknown[];
  createdAt: string;
};

export type PlatformHealth = {
  status: "healthy" | "degraded" | "critical";
  generatedAt: string;
  metrics: Record<string, number | null>;
  connections: Array<{
    id: string;
    name: string;
    mode: string;
    status: string;
    lastValidatedAt: string | null;
    errorCode: string | null;
  }>;
};

export type ObservabilityAssets = {
  managedBy: string;
  dashboards: string[];
  alerts: string[];
  sourcePath: string;
  applyRequiresConfirmation: boolean;
};
