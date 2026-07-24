"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  Database,
  EyeIcon,
  MoreVerticalIcon,
  PencilIcon,
} from "lucide-react";
import type { EventDefinition } from "@/lib/contracts";
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

interface EventColumnActions {
  onViewDetails: (event: EventDefinition) => void;
  onUseInRule?: (event: EventDefinition) => void;
}

function relativeDate(value?: string) {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getEventColumns({
  onViewDetails,
  onUseInRule,
}: EventColumnActions): ColumnDef<EventDefinition>[] {
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
      accessorKey: "displayName",
      meta: { label: "Event" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Event" />
      ),
      cell: ({ row }) => {
        const event = row.original;
        return (
          <button
            type="button"
            className="flex max-w-[280px] items-start gap-3 text-left"
            onClick={() => onViewDetails(event)}
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Database className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {event.displayName}
              </span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {event.canonicalName}
              </span>
            </span>
          </button>
        );
      },
      filterFn: (row, _id, value) => {
        const event = row.original;
        const needle = String(value).toLowerCase();
        if (!needle) return true;
        return [
          event.displayName,
          event.canonicalName,
          event.domain,
          event.description,
          event.sourceService,
          ...event.suggestedCorrelationKeys,
          ...event.attributes.map((attribute) => attribute.key),
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      },
    },
    {
      accessorKey: "domain",
      meta: { label: "Domain" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Domain" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.domain}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value || value === "all") return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "sourceService",
      meta: { label: "Source" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sourceService ?? "—"}
        </span>
      ),
    },
    {
      id: "correlationKeys",
      meta: { label: "Correlation keys" },
      accessorFn: (row) => row.suggestedCorrelationKeys.join(", "),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Correlation keys" />
      ),
      cell: ({ row }) => (
        <div className="flex max-w-[220px] flex-wrap gap-1">
          {row.original.suggestedCorrelationKeys.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            row.original.suggestedCorrelationKeys.map((key) => (
              <Badge
                key={key}
                variant="secondary"
                className="font-mono text-[10px] font-normal normal-case"
              >
                {key}
              </Badge>
            ))
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "usageCount",
      meta: { label: "Usage" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Usage" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.usageCount}</span>
      ),
    },
    {
      accessorKey: "origin",
      meta: { label: "Origin" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Origin" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.origin}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      meta: { label: "Updated" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {relativeDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className="flex justify-end pr-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open actions for ${event.displayName}`}
                  />
                }
              >
                <MoreVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => onViewDetails(event)}>
                  <EyeIcon />
                  View details
                </DropdownMenuItem>
                {onUseInRule ? (
                  <DropdownMenuItem onClick={() => onUseInRule(event)}>
                    <PencilIcon />
                    Use in rule
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
