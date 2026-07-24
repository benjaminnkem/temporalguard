"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  AlertTriangle,
  EyeIcon,
  ExternalLinkIcon,
  MoreVerticalIcon,
  Workflow,
} from "lucide-react";
import type { ViolationSummary } from "@/lib/contracts";
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
import { formatDuration, statusVariant } from "@/lib/utils";

interface ViolationColumnActions {
  onOpen: (violation: ViolationSummary) => void;
  onOpenWorkflow?: (violation: ViolationSummary) => void;
  onOpenRule?: (violation: ViolationSummary) => void;
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

function typeLabel(type: ViolationSummary["type"]) {
  return type.replaceAll("_", " ");
}

const severityOrder: Record<ViolationSummary["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function getViolationColumns({
  onOpen,
  onOpenWorkflow,
  onOpenRule,
}: ViolationColumnActions): ColumnDef<ViolationSummary>[] {
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
      accessorKey: "severity",
      meta: { label: "Severity" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Severity" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={statusVariant(row.original.severity)}
          className="capitalize"
        >
          {row.original.severity}
        </Badge>
      ),
      sortingFn: (left, right) =>
        severityOrder[left.original.severity] -
        severityOrder[right.original.severity],
      filterFn: (row, id, value) => {
        if (!value || value === "all") return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "explanation",
      meta: { label: "Violation" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Violation" />
      ),
      cell: ({ row }) => {
        const violation = row.original;
        return (
          <button
            type="button"
            className="flex max-w-[320px] items-start gap-3 text-left"
            onClick={() => onOpen(violation)}
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm font-medium hover:text-primary">
                {violation.explanation}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground capitalize">
                {typeLabel(violation.type)}
              </span>
            </span>
          </button>
        );
      },
      filterFn: (row, _id, value) => {
        const violation = row.original;
        const needle = String(value).toLowerCase();
        if (!needle) return true;
        return [
          violation.explanation,
          violation.ruleName,
          violation.workflowId,
          violation.serviceName,
          violation.triggerEventName,
          violation.lastObservedEventName,
          violation.type,
          violation.status,
          violation.severity,
          violation.deploymentVersion,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      },
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.status}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value || value === "all") return true;
        return row.getValue(id) === value;
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
      accessorKey: "workflowId",
      meta: { label: "Workflow" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Workflow" />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Workflow className="size-3.5" />
          {row.original.workflowId}
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
      accessorKey: "overdueMs",
      meta: { label: "Overdue" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Overdue" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {row.original.overdueMs
            ? formatDuration(row.original.overdueMs)
            : "—"}
        </span>
      ),
      sortingFn: (left, right) =>
        (left.original.overdueMs ?? 0) - (right.original.overdueMs ?? 0),
    },
    {
      accessorKey: "occurredAt",
      meta: { label: "Occurred" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Occurred" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {relativeDate(row.original.occurredAt)}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const violation = row.original;
        return (
          <div className="flex justify-end pr-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open actions for ${violation.id}`}
                  />
                }
              >
                <MoreVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => onOpen(violation)}>
                  <EyeIcon />
                  Open violation
                </DropdownMenuItem>
                {onOpenWorkflow ? (
                  <DropdownMenuItem onClick={() => onOpenWorkflow(violation)}>
                    <Workflow />
                    Open workflow
                  </DropdownMenuItem>
                ) : null}
                {onOpenRule ? (
                  <DropdownMenuItem onClick={() => onOpenRule(violation)}>
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
