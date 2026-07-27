import type {
  ComparisonRecord,
  DeploymentRecord,
  InvestigationRecord,
  ObservabilityAssets,
  PlatformHealth,
  QualityRecord,
  SimulationRecord,
} from "./observability-contracts";
import type { WorkflowObservabilityPreview } from "./contracts";

class ObservabilityDataSource {
  readonly baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

  async request<T>(
    path: string,
    init?: RequestInit,
    retryAfterRefresh = true,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401 && retryAfterRefresh) {
        const refreshed = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { accept: "application/json" },
        });
        if (refreshed.ok) return this.request<T>(path, init, false);
      }
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(body?.message ?? `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  listInvestigations = () =>
    this.request<InvestigationRecord[]>("/investigations");
  getInvestigation = (id: string) =>
    this.request<InvestigationRecord>(
      `/investigations/${encodeURIComponent(id)}`,
    );
  startInvestigation = (violationId: string) =>
    this.request<InvestigationRecord>("/investigations", {
      method: "POST",
      body: JSON.stringify({ violationId }),
    });
  cancelInvestigation = (id: string) =>
    this.request<InvestigationRecord>(
      `/investigations/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
    );
  rerunInvestigation = (id: string) =>
    this.request<InvestigationRecord>(
      `/investigations/${encodeURIComponent(id)}/rerun`,
      { method: "POST" },
    );
  investigationExportUrl = (id: string) =>
    `${this.baseUrl}/investigations/${encodeURIComponent(id)}/export`;
  investigationEventsUrl = (id: string) =>
    `${this.baseUrl}/investigations/${encodeURIComponent(id)}/events`;

  listComparisons = () => this.request<ComparisonRecord[]>("/comparisons");
  createComparison = (input: Record<string, unknown>) =>
    this.request<ComparisonRecord>("/comparisons", {
      method: "POST",
      body: JSON.stringify(input),
    });
  listSimulations = () => this.request<SimulationRecord[]>("/simulations");
  createSimulation = (input: Record<string, unknown>) =>
    this.request<SimulationRecord>("/simulations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  listDeployments = () => this.request<DeploymentRecord[]>("/deployments");
  listQuality = () => this.request<QualityRecord[]>("/telemetry-quality");
  platformHealth = () => this.request<PlatformHealth>("/platform-health");
  assets = () => this.request<ObservabilityAssets>("/observability/assets");
  connectionHealth = () =>
    this.request<Record<string, unknown>>("/observability/connection/health");
  validateConnection = () =>
    this.request<Record<string, unknown>>(
      "/observability/connection/validate",
      {
        method: "POST",
      },
    );
  saveConnection = (input: Record<string, unknown>) =>
    this.request<Record<string, unknown>>("/observability/connection", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  exploreWorkflow = (workflowId: string, signal: string) =>
    this.request<WorkflowObservabilityPreview>(
      `/workflows/${encodeURIComponent(workflowId)}/observability/${signal}`,
    );
}

export const observabilityDataSource = new ObservabilityDataSource();
