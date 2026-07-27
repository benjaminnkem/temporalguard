"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEventInput, RuleDraft } from "./contracts";
import { dataSource, type AnalyticsQuery } from "./data-source";

export const queryKeys = {
  dashboard: (query: AnalyticsQuery) => ["dashboard", query] as const,
  events: (query: AnalyticsQuery) => ["events", query] as const,
  rules: (query: AnalyticsQuery) => ["rules", query] as const,
  rule: (id: string) => ["rule", id] as const,
  workflows: (query: AnalyticsQuery) => ["workflows", query] as const,
  workflow: (id: string) => ["workflow", id] as const,
  workflowObservability: (id: string, signal: "traces" | "logs" | "metrics") =>
    ["workflow", id, "observability", signal] as const,
  violations: (query: AnalyticsQuery) => ["violations", query] as const,
  violation: (id: string) => ["violation", id] as const,
};

export const useDashboard = (query: AnalyticsQuery) =>
  useQuery({
    queryKey: queryKeys.dashboard(query),
    queryFn: () => dataSource.getDashboardOverview(query),
  });

export const useEvents = (query: AnalyticsQuery = {}) =>
  useQuery({
    queryKey: queryKeys.events(query),
    queryFn: () => dataSource.listEvents(query),
  });

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => dataSource.createEvent(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export const useRules = (query: AnalyticsQuery = {}) =>
  useQuery({
    queryKey: queryKeys.rules(query),
    queryFn: () => dataSource.listRules(query),
  });

export const useRule = (id?: string) =>
  useQuery({
    queryKey: ["rule", id],
    queryFn: () => dataSource.getRule(id as string),
    enabled: Boolean(id),
  });

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RuleDraft) => dataSource.createRule(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RuleDraft }) =>
      dataSource.updateRule(id, input),
    onSuccess: async (rule) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rules"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rule(rule.id) }),
      ]);
    },
  });
}

export function useSetRuleEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      dataSource.setRuleEnabled(id, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataSource.deleteRule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export const useWorkflows = (
  query: AnalyticsQuery,
  options?: {
    refetchInterval?: number | false;
  },
) =>
  useQuery({
    queryKey: queryKeys.workflows(query),
    queryFn: () => dataSource.listWorkflows(query),
    refetchInterval:
      options?.refetchInterval ?? (query.state === "paused" ? false : 12_000),
  });

export const useWorkflow = (id: string) =>
  useQuery({
    queryKey: queryKeys.workflow(id),
    queryFn: () => dataSource.getWorkflow(id),
  });

export const useWorkflowTraces = (id: string) =>
  useQuery({
    queryKey: queryKeys.workflowObservability(id, "traces"),
    queryFn: () => dataSource.getWorkflowTraces(id),
  });

export const useWorkflowLogs = (id: string) =>
  useQuery({
    queryKey: queryKeys.workflowObservability(id, "logs"),
    queryFn: () => dataSource.getWorkflowLogs(id),
  });

export const useWorkflowMetrics = (id: string) =>
  useQuery({
    queryKey: queryKeys.workflowObservability(id, "metrics"),
    queryFn: () => dataSource.getWorkflowMetrics(id),
  });

export const useViolations = (query: AnalyticsQuery) =>
  useQuery({
    queryKey: queryKeys.violations(query),
    queryFn: () => dataSource.listViolations(query),
  });

export const useViolation = (id: string) =>
  useQuery({
    queryKey: queryKeys.violation(id),
    queryFn: () => dataSource.getViolation(id),
  });

export const useTestRule = () =>
  useMutation({ mutationFn: (input: RuleDraft) => dataSource.testRule(input) });
