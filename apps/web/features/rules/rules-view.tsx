"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pause, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../components/shared/page-header";
import { DataState } from "../../components/shared/data-state";
import { Button } from "../../components/ui/button";
import { Badge, Card } from "../../components/ui/surface";
import type { RuleSummary } from "../../lib/contracts";
import { useDeleteRule, useRules, useSetRuleEnabled } from "../../lib/queries";

export function RulesView() {
  const [deleteTarget, setDeleteTarget] = useState<RuleSummary | null>(null);
  const query = useRules();
  const statusMutation = useSetRuleEnabled();
  const deleteMutation = useDeleteRule();
  const state = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : query.data?.items.length === 0
        ? "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Policy"
        title="Rules"
        description="Time-bound expectations that turn event streams into explainable workflow health."
        actions={
          <Button asChild variant="primary">
            <Link href="/explore">
              <Plus className="size-4" /> New rule
            </Link>
          </Button>
        }
      />
      <DataState
        state={state}
        title="Rules unavailable"
        description="Create the first workflow rule for this workspace."
        onRetry={() => void query.refetch()}
      >
        <div className="grid gap-3">
          {query.data?.items.map((rule) => (
            <Card
              key={rule.id}
              className="grid gap-4 p-4 transition-colors hover:border-primary sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-center"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center border border-primary bg-primary-subtle text-primary-subtle-foreground">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <Link
                    href={`/explore?rule=${rule.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {rule.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {rule.triggerEvent} → {rule.expectedEvents.join(", ")}
                  </p>
                </div>
              </div>
              <Badge tone="primary">{rule.operator}</Badge>
              <Badge tone={rule.severity === "critical" ? "danger" : "warning"}>
                {rule.severity}
              </Badge>
              <Badge tone={rule.status === "active" ? "success" : "neutral"}>
                {rule.status}
              </Badge>
              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {rule.window.value} {rule.window.unit}
                </p>
                <p className="text-[10px] text-muted-foreground">deadline</p>
              </div>
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    rule.status === "active"
                      ? `Disable ${rule.name}`
                      : `Enable ${rule.name}`
                  }
                  title={
                    rule.status === "active" ? "Disable rule" : "Enable rule"
                  }
                  disabled={
                    statusMutation.isPending &&
                    statusMutation.variables?.id === rule.id
                  }
                  onClick={() => {
                    const enabled = rule.status !== "active";
                    statusMutation.mutate(
                      { id: rule.id, enabled },
                      {
                        onSuccess: () =>
                          toast.success(
                            enabled ? "Rule enabled." : "Rule disabled.",
                          ),
                        onError: (error) => toast.error(error.message),
                      },
                    );
                  }}
                >
                  {rule.status === "active" ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete ${rule.name}`}
                  title="Delete rule"
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === rule.id
                  }
                  onClick={() => setDeleteTarget(rule)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </DataState>
      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 border border-border-strong bg-popover p-6 text-popover-foreground">
            <Dialog.Title className="text-lg font-semibold">
              Delete rule?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {deleteTarget
                ? `“${deleteTarget.name}” will stop evaluating new events. Existing workflow and violation history will be preserved.`
                : ""}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" disabled={deleteMutation.isPending}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="destructive"
                disabled={!deleteTarget || deleteMutation.isPending}
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      toast.success("Rule deleted.");
                    },
                    onError: (error) => toast.error(error.message),
                  });
                }}
              >
                <Trash2 className="size-4" />
                {deleteMutation.isPending ? "Deleting…" : "Delete rule"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
