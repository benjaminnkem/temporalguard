"use client";

import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflows } from "@/lib/queries";
import { formatDate, statusVariant } from "@/lib/utils";

const tabs = [
  "all",
  "waiting",
  "near_deadline",
  "violated",
  "completed",
] as const;

export function WorkflowsView() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const [search, setSearch] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const environment = searchParams.get("environment") ?? "production";
  const query = useWorkflows({
    environment,
    search,
    state: searchParams.get("state") === "error" ? "error" : tab,
  });
  const dataState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : query.data?.items.length === 0
        ? search || tab !== "all"
          ? "filtered-empty"
          : "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Workflow explorer"
        title="Workflows"
        description="Search, filter, and inspect workflow instances while preserving analytical context."
      />
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-3 border-b py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Tabs
              value={tab}
              onValueChange={(value) => {
                if (tabs.includes(value as (typeof tabs)[number])) {
                  setTab(value as (typeof tabs)[number]);
                }
              }}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start xl:w-auto">
                {tabs.map((item) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    className="px-2.5 text-xs capitalize sm:text-sm"
                  >
                    {item.replaceAll("_", " ")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex min-w-0 flex-1 gap-2 xl:justify-end">
              <InputGroup className="min-w-0 flex-1 xl:max-w-sm">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Workflow, event, rule, service, entity…"
                />
              </InputGroup>
              <Button
                size="icon"
                variant="outline"
                aria-label="Configure columns"
                aria-pressed={columnsOpen}
                onClick={() => setColumnsOpen((value) => !value)}
              >
                <Columns3 />
              </Button>
              <Button size="icon" variant="outline" aria-label="Sort by urgency">
                <ArrowUpDown />
              </Button>
            </div>
          </div>
        </CardHeader>
        {columnsOpen ? (
          <div className="flex flex-wrap gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs">
            {["Rule", "Service", "Deployment", "Deadline", "Last event"].map(
              (column) => (
                <Label
                  key={column}
                  className="flex items-center gap-2 font-normal"
                >
                  <Checkbox defaultChecked />
                  {column}
                </Label>
              ),
            )}
          </div>
        ) : null}
        <CardContent className="p-0">
          <DataState
            state={dataState}
            onRetry={() => void query.refetch()}
            title={
              dataState === "filtered-empty"
                ? "No workflows match these filters"
                : undefined
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>State</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Last event</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Deployment</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.items.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Badge
                        variant={statusVariant(workflow.state)}
                        className="capitalize"
                      >
                        {workflow.state.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal">
                      <Link
                        href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                        className="font-medium hover:text-primary"
                      >
                        {workflow.workflowType}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {workflow.id} · {workflow.entityId}
                      </p>
                    </TableCell>
                    <TableCell>{workflow.ruleName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {workflow.lastEventName}
                    </TableCell>
                    <TableCell>{workflow.serviceName ?? "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {workflow.completedAt ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="size-3.5" />
                          {formatDate(workflow.completedAt)}
                        </span>
                      ) : workflow.deadlineAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          {formatDate(workflow.deadlineAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {workflow.deploymentVersion}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        render={
                          <Link
                            href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                            aria-label={`Open ${workflow.id}`}
                          />
                        }
                      >
                        <ChevronRight />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataState>
        </CardContent>
        <CardFooter className="justify-between border-t text-xs text-muted-foreground">
          <span>{query.data?.total ?? 0} results · cursor pagination</span>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={!query.data?.nextCursor}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
