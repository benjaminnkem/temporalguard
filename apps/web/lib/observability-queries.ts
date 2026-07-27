"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { observabilityDataSource } from "./observability-data-source";

export const observabilityKeys = {
  investigations: ["investigations"] as const,
  investigation: (id: string) => ["investigation", id] as const,
  comparisons: ["comparisons"] as const,
  simulations: ["simulations"] as const,
  deployments: ["deployments"] as const,
  quality: ["telemetry-quality"] as const,
  health: ["platform-health"] as const,
  assets: ["observability-assets"] as const,
  connection: ["signoz-connection"] as const,
  explorer: (workflowId: string, signal: string) =>
    ["explorer", workflowId, signal] as const,
};

export const useInvestigations = () =>
  useQuery({
    queryKey: observabilityKeys.investigations,
    queryFn: observabilityDataSource.listInvestigations,
  });

export const useInvestigation = (id: string) =>
  useQuery({
    queryKey: observabilityKeys.investigation(id),
    queryFn: () => observabilityDataSource.getInvestigation(id),
    refetchOnReconnect: true,
  });

export function useInvestigationStream(id: string) {
  const client = useQueryClient();
  const [state, setState] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );
  useEffect(() => {
    let source: EventSource | undefined;
    const connect = () => {
      if (!navigator.onLine) {
        setState("offline");
        return;
      }
      source = new EventSource(
        observabilityDataSource.investigationEventsUrl(id),
        { withCredentials: true },
      );
      source.onopen = () => setState("live");
      const refresh = () => {
        void client.invalidateQueries({
          queryKey: observabilityKeys.investigation(id),
        });
        void client.invalidateQueries({
          queryKey: observabilityKeys.investigations,
        });
      };
      source.onmessage = refresh;
      [
        "queued",
        "started",
        "tool_completed",
        "tool_failed",
        "completed",
        "cancellation_requested",
        "cancelled",
        "dead_letter",
      ].forEach((eventName) => source?.addEventListener(eventName, refresh));
      source.onerror = () =>
        setState(navigator.onLine ? "connecting" : "offline");
    };
    const online = () => {
      source?.close();
      connect();
    };
    const offline = () => {
      source?.close();
      setState("offline");
    };
    connect();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      source?.close();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [client, id]);
  return state;
}

export const useComparisons = () =>
  useQuery({
    queryKey: observabilityKeys.comparisons,
    queryFn: observabilityDataSource.listComparisons,
  });
export const useCreateComparison = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: observabilityDataSource.createComparison,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: observabilityKeys.comparisons }),
  });
};
export const useSimulations = () =>
  useQuery({
    queryKey: observabilityKeys.simulations,
    queryFn: observabilityDataSource.listSimulations,
  });
export const useCreateSimulation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: observabilityDataSource.createSimulation,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: observabilityKeys.simulations }),
  });
};
export const useDeployments = () =>
  useQuery({
    queryKey: observabilityKeys.deployments,
    queryFn: observabilityDataSource.listDeployments,
  });
export const useTelemetryQuality = () =>
  useQuery({
    queryKey: observabilityKeys.quality,
    queryFn: observabilityDataSource.listQuality,
  });
export const usePlatformHealth = () =>
  useQuery({
    queryKey: observabilityKeys.health,
    queryFn: observabilityDataSource.platformHealth,
    refetchInterval: 15_000,
  });
export const useObservabilityAssets = () =>
  useQuery({
    queryKey: observabilityKeys.assets,
    queryFn: observabilityDataSource.assets,
  });
export const useConnectionHealth = () =>
  useQuery({
    queryKey: observabilityKeys.connection,
    queryFn: observabilityDataSource.connectionHealth,
    retry: false,
  });
export const useExplorer = (workflowId: string, signal: string) =>
  useQuery({
    queryKey: observabilityKeys.explorer(workflowId, signal),
    queryFn: () => observabilityDataSource.exploreWorkflow(workflowId, signal),
    enabled: Boolean(workflowId),
  });
