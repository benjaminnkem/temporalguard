"use client";

import { formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import {
  ArrowRight,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RuleSummary } from "@/lib/contracts";
import { useDeleteRule, useRules, useSetRuleEnabled } from "@/lib/queries";
import { cn, statusVariant } from "@/lib/utils";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["value"];

const operatorCopy: Record<RuleSummary["operator"], string> = {
  any: "Any outcome is enough",
  all: "Every outcome required",
  sequence: "Outcomes in exact order",
  forbid: "Must not occur",
};

function relativeUpdated(value: string) {
  const date = parseISO(value);
  if (!isValid(date)) return "Updated recently";
  return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

function SummaryCard({
  label,
  value,
  hint,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active && "ring-2 ring-primary/40",
      )}
    >
      <Card
        size="sm"
        className={cn(
          "h-full gap-2 py-4 transition-colors hover:bg-muted/30",
          active && "bg-muted/40",
        )}
      >
        <CardHeader className="px-4 pb-0">
          <CardDescription className="text-xs font-medium">
            {label}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </button>
  );
}

function RuleCard({
  rule,
  onToggle,
  onDelete,
  toggling,
}: {
  rule: RuleSummary;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  toggling?: boolean;
}) {
  const enabled = rule.status === "active";

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0 transition-colors",
        rule.status === "paused" && "opacity-90",
      )}
    >
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
              enabled
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0 space-y-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/explore?rule=${rule.id}`}
                  className="truncate text-base font-semibold hover:text-primary"
                >
                  {rule.name}
                </Link>
                <Badge
                  variant={statusVariant(rule.status)}
                  className="capitalize"
                >
                  {rule.status}
                </Badge>
                <Badge
                  variant={statusVariant(rule.severity)}
                  className="capitalize"
                >
                  {rule.severity}
                </Badge>
              </div>
              {rule.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {rule.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant="outline" className="font-mono font-normal">
                {rule.triggerEvent}
              </Badge>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <Badge
                variant={rule.operator === "forbid" ? "destructive" : "secondary"}
                className="uppercase"
              >
                {rule.operator}
              </Badge>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              {rule.expectedEvents.slice(0, 3).map((event) => (
                <Badge
                  key={event}
                  variant="outline"
                  className="font-mono font-normal"
                >
                  {event}
                </Badge>
              ))}
              {rule.expectedEvents.length > 3 ? (
                <Badge variant="secondary">
                  +{rule.expectedEvents.length - 3}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{operatorCopy[rule.operator]}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Window {rule.window.value} {rule.window.unit}
              </span>
              <span aria-hidden="true">·</span>
              <span>{relativeUpdated(rule.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              disabled={toggling || rule.status === "draft"}
              onCheckedChange={(checked) => onToggle(checked)}
              aria-label={
                enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`
              }
            />
            <span className="text-xs text-muted-foreground sm:hidden">
              {enabled ? "On" : "Off"}
            </span>
            {toggling ? <Spinner className="size-3.5" /> : null}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/explore?rule=${rule.id}`} />}
            >
              <Pencil />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button size="icon-sm" variant="ghost" />}
              >
                <MoreHorizontal />
                <span className="sr-only">Open actions for {rule.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem
                  render={<Link href={`/explore?rule=${rule.id}`} />}
                >
                  <Pencil />
                  Open in Rule Studio
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={toggling || rule.status === "draft"}
                  onClick={() => onToggle(!enabled)}
                >
                  {enabled ? <Pause /> : <Play />}
                  {enabled ? "Pause evaluation" : "Activate rule"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 />
                  Delete rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RulesView() {
  const [deleteTarget, setDeleteTarget] = useState<RuleSummary | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const query = useRules();
  const statusMutation = useSetRuleEnabled();
  const deleteMutation = useDeleteRule();

  const items = useMemo(() => {
    const source = query.data?.items ?? [];
    const needle = search.trim().toLowerCase();
    return source.filter((rule) => {
      const matchesStatus =
        statusFilter === "all" ? true : rule.status === statusFilter;
      const matchesSearch =
        !needle ||
        [
          rule.name,
          rule.description,
          rule.triggerEvent,
          rule.operator,
          rule.severity,
          ...rule.expectedEvents,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      return matchesStatus && matchesSearch;
    });
  }, [query.data?.items, search, statusFilter]);

  const counts = useMemo(() => {
    const source = query.data?.items ?? [];
    return {
      total: source.length,
      active: source.filter((rule) => rule.status === "active").length,
      paused: source.filter((rule) => rule.status === "paused").length,
      draft: source.filter((rule) => rule.status === "draft").length,
      critical: source.filter((rule) => rule.severity === "critical").length,
    };
  }, [query.data?.items]);

  const state = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : (query.data?.items.length ?? 0) === 0
        ? "empty"
        : items.length === 0
          ? "filtered-empty"
          : "ready";

  const toggleRule = (rule: RuleSummary, enabled: boolean) => {
    statusMutation.mutate(
      { id: rule.id, enabled },
      {
        onSuccess: () =>
          toast.success(enabled ? "Rule enabled." : "Rule paused."),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Policy"
        title="Rules"
        description="Time-bound expectations that turn event streams into explainable workflow health."
        actions={
          <Button render={<Link href="/explore" />}>
            <Plus /> New rule
          </Button>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Rules summary"
      >
        <SummaryCard
          label="Total rules"
          value={counts.total}
          hint="Defined in this workspace"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <SummaryCard
          label="Active"
          value={counts.active}
          hint="Evaluating live events"
          active={statusFilter === "active"}
          onClick={() => setStatusFilter("active")}
        />
        <SummaryCard
          label="Paused"
          value={counts.paused}
          hint="Not evaluating new events"
          active={statusFilter === "paused"}
          onClick={() => setStatusFilter("paused")}
        />
        <SummaryCard
          label="Critical"
          value={counts.critical}
          hint="Highest severity policies"
        />
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={(value) => {
                if (statusFilters.some((item) => item.value === value)) {
                  setStatusFilter(value as StatusFilter);
                }
              }}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start xl:w-auto">
                {statusFilters.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="px-2.5 text-xs sm:text-sm"
                  >
                    {item.label}
                    {item.value !== "all" ? (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {item.value === "active"
                          ? counts.active
                          : item.value === "paused"
                            ? counts.paused
                            : counts.draft}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <InputGroup className="w-full xl:max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, event, operator, severity…"
              />
            </InputGroup>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 p-4 sm:p-5">
          <DataState
            state={state}
            title={
              state === "empty"
                ? "No rules yet"
                : state === "filtered-empty"
                  ? "No rules match these filters"
                  : "Rules unavailable"
            }
            description={
              state === "empty"
                ? "Create the first workflow rule for this workspace."
                : state === "filtered-empty"
                  ? "Try another status tab or clear the search."
                  : "Something went wrong while loading rules."
            }
            onRetry={() => void query.refetch()}
          >
            {items.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                toggling={
                  statusMutation.isPending &&
                  statusMutation.variables?.id === rule.id
                }
                onToggle={(enabled) => toggleRule(rule, enabled)}
                onDelete={() => setDeleteTarget(rule)}
              />
            ))}
          </DataState>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete rule?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will stop evaluating new events. Existing workflow and violation history will be preserved.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </DialogClose>
            <Button
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
              {deleteMutation.isPending ? <Spinner /> : <Trash2 />}
              {deleteMutation.isPending ? "Deleting…" : "Delete rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
