"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLinkIcon,
  EyeIcon,
  MoreVerticalIcon,
  Workflow,
} from "lucide-react";
import type { WorkflowState, WorkflowSummary } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, statusVariant } from "@/lib/utils";

interface WorkflowColumnActions {
  onOpen: (workflow: WorkflowSummary) => void;
  onViewRule?: (workflow: WorkflowSummary) => void;
  queryString?: string;
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function relativeDate(value?: string) {
  const date = parseDate(value);
  if (!date) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

function remainingLabel(workflow: WorkflowSummary) {
  if (workflow.completedAt) return "Completed";
  const deadline = parseDate(workflow.deadlineAt);
  if (!deadline) return "No deadline";
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "Overdue";
  return `${formatDistanceToNowStrict(deadline, { addSuffix: false })} left`;
}

function remainingTone(workflow: WorkflowSummary) {
  if (workflow.state === "violated") return "text-destructive";
  if (workflow.completedAt) return "text-success";
  const deadline = parseDate(workflow.deadlineAt);
  if (!deadline) return "text-muted-foreground";
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "text-destructive";
  if (ms < 15 * 60_000) return "text-warning";
  return "text-muted-foreground";
}

const statePriority: Record<WorkflowState, number> = {
  violated: 0,
  near_deadline: 1,
  waiting: 2,
  recovered: 3,
  completed: 4,
};

export function getWorkflowColumns({
  onOpen,
  onViewRule,
}: WorkflowColumnActions): ColumnDef<WorkflowSummary>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="pl-1">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="pl-1">
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "state",
      meta: { label: "State" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="State" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={statusVariant(row.original.state)}
          className="capitalize"
        >
          {row.original.state.replaceAll("_", " ")}
        </Badge>
      ),
      sortingFn: (left, right) =>
        (statePriority[left.original.state] ?? 99) -
        (statePriority[right.original.state] ?? 99),
      filterFn: (row, id, value) => {
        if (!value || value === "all") return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "workflowType",
      meta: { label: "Workflow" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Workflow" />
      ),
      cell: ({ row }) => {
        const workflow = row.original;
        return (
          <button
            type="button"
            className="flex max-w-[260px] items-start gap-3 text-left"
            onClick={() => onOpen(workflow)}
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Workflow className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium hover:text-primary">
                {workflow.workflowType}
              </span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {workflow.id} · {workflow.entityId}
              </span>
            </span>
          </button>
        );
      },
      filterFn: (row, _id, value) => {
        const workflow = row.original;
        const needle = String(value).toLowerCase();
        if (!needle) return true;
        return [
          workflow.id,
          workflow.workflowType,
          workflow.entityId,
          workflow.ruleName,
          workflow.lastEventName,
          workflow.serviceName,
          workflow.deploymentVersion,
          workflow.state,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      },
    },
    {
      accessorKey: "ruleName",
      meta: { label: "Rule" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rule" />
      ),
      cell: ({ row }) => (
        <span className="max-w-[180px] truncate text-sm">
          {row.original.ruleName}
        </span>
      ),
    },
    {
      accessorKey: "lastEventName",
      meta: { label: "Last event" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last event" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.lastEventName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "serviceName",
      meta: { label: "Service" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Service" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.serviceName ?? "—"}</span>
      ),
    },
    {
      id: "deadline",
      meta: { label: "Deadline" },
      accessorFn: (row) => row.deadlineAt ?? row.completedAt ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deadline" />
      ),
      cell: ({ row }) => {
        const workflow = row.original;
        return (
          <div className="min-w-[120px]">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                remainingTone(workflow),
              )}
            >
              {workflow.completedAt ? (
                <CheckCircle2 className="size-3.5" />
              ) : workflow.state === "violated" ? (
                <AlertTriangle className="size-3.5" />
              ) : (
                <Clock3 className="size-3.5" />
              )}
              {remainingLabel(workflow)}
            </span>
            {workflow.deadlineAt || workflow.completedAt ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDate(
                  workflow.completedAt ?? workflow.deadlineAt ?? "",
                )}
              </p>
            ) : null}
          </div>
        );
      },
      sortingFn: (left, right) => {
        const leftTime =
          parseDate(left.original.deadlineAt)?.getTime() ??
          Number.MAX_SAFE_INTEGER;
        const rightTime =
          parseDate(right.original.deadlineAt)?.getTime() ??
          Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      },
    },
    {
      accessorKey: "startedAt",
      meta: { label: "Started" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Started" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {relativeDate(row.original.startedAt)}
        </span>
      ),
    },
    {
      accessorKey: "deploymentVersion",
      meta: { label: "Deployment" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deployment" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.deploymentVersion ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const workflow = row.original;
        return (
          <div className="flex justify-end pr-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open actions for ${workflow.id}`}
                  />
                }
              >
                <MoreVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => onOpen(workflow)}>
                  <EyeIcon />
                  Open workflow
                </DropdownMenuItem>
                {onViewRule ? (
                  <DropdownMenuItem onClick={() => onViewRule(workflow)}>
                    <ExternalLinkIcon />
                    Open rule
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
