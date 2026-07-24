"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEventInput, RuleDraft } from "./contracts";
import { dataSource, type AnalyticsQuery } from "./data-source";

export const queryKeys = {
  dashboard: (query: AnalyticsQuery) => ["dashboard", query] as const,
  events: (query: AnalyticsQuery) => ["events", query] as const,
  workflows: (query: AnalyticsQuery) => ["workflows", query] as const,
  workflow: (id: string) => ["workflow", id] as const,
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

export const useWorkflows = (query: AnalyticsQuery) =>
  useQuery({
    queryKey: queryKeys.workflows(query),
    queryFn: () => dataSource.listWorkflows(query),
    refetchInterval: query.state === "paused" ? false : 12_000,
  });

export const useWorkflow = (id: string) =>
  useQuery({
    queryKey: queryKeys.workflow(id),
    queryFn: () => dataSource.getWorkflow(id),
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
