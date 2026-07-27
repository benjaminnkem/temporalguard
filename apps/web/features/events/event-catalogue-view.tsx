"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, KeyRound, Layers3, RefreshCw, Search } from "lucide-react";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { EventDefinition } from "@/lib/contracts";
import { useEvents } from "@/lib/queries";
import { cn, formatDate } from "@/lib/utils";
import { getEventColumns } from "./columns";
import { EventSelector } from "./event-selector";

function relativeDate(value?: string) {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return formatDistanceToNow(date, { addSuffix: true });
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card size="sm" className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-xs font-medium">
            {label}
          </CardDescription>
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/15 p-3",
        className,
      )}
    >
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="text-sm break-words text-foreground">{children}</div>
    </div>
  );
}

export function EventCatalogueView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("all");
  const [selected, setSelected] = useState<EventDefinition | null>(null);
  const query = useEvents({ search });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const domains = useMemo(
    () =>
      [...new Set(items.map((event) => event.domain))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (domain === "all") return items;
    return items.filter((event) => event.domain === domain);
  }, [domain, items]);

  const stats = useMemo(() => {
    const attributeCount = items.reduce(
      (sum, event) => sum + event.attributes.length,
      0,
    );
    const usage = items.reduce((sum, event) => sum + event.usageCount, 0);
    return {
      total: items.length,
      domains: domains.length,
      attributes: attributeCount,
      usage,
    };
  }, [domains.length, items]);

  const columns = useMemo(
    () =>
      getEventColumns({
        onViewDetails: setSelected,
        onUseInRule: (event) => {
          router.push(
            `/explore?event=${encodeURIComponent(event.canonicalName)}`,
          );
        },
      }),
    [router],
  );

  const state = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : items.length === 0
        ? search
          ? "filtered-empty"
          : "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Schema registry"
        title="Event Catalogue"
        description="Search, define, and inspect the business events available to workflow rules."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <div className="w-56">
              <EventSelector
                label="Create or select event"
                selected={selected}
                onSelect={setSelected}
              />
            </div>
          </div>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Catalogue summary"
      >
        <SummaryCard
          label="Events"
          value={stats.total}
          hint="Canonical definitions"
          icon={Database}
        />
        <SummaryCard
          label="Domains"
          value={stats.domains}
          hint="Business domains covered"
          icon={Layers3}
        />
        <SummaryCard
          label="Attributes"
          value={stats.attributes}
          hint="Declared schema fields"
          icon={KeyRound}
        />
        <SummaryCard
          label="Rule usage"
          value={stats.usage}
          hint="Referenced across rules"
          icon={Search}
        />
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Catalogue</CardTitle>
              <CardDescription>
                Sort, filter columns, and inspect event definitions.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <InputGroup className="w-full sm:max-w-xs">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, domain, service, attribute…"
                />
              </InputGroup>
              <NativeSelect
                className="w-full sm:w-44"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              >
                <NativeSelectOption value="all">All domains</NativeSelectOption>
                {domains.map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {item}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataState
            state={state}
            title={search ? "No matching events" : "No events defined"}
            description={
              search
                ? "Adjust the search or create a new canonical event."
                : "Create an event or ingest a structured occurrence to begin."
            }
            onRetry={() => void query.refetch()}
          >
            <DataTable
              columns={columns}
              data={filteredItems}
              getRowId={(row) => row.id}
              filterColumn="displayName"
              filterPlaceholder="Filter visible rows…"
              emptyMessage="No events match the current filters."
              tableClassName="rounded-none border-0"
              className="[&>div:first-child]:px-4"
            />
          </DataState>
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-lg"
        >
          {selected ? (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-start gap-3 pr-8">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Database className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-left">
                      {selected.displayName}
                    </SheetTitle>
                    <SheetDescription className="text-left font-mono text-xs">
                      {selected.canonicalName}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid gap-5 p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selected.domain}</Badge>
                  <Badge variant="secondary" className="capitalize">
                    {selected.origin}
                  </Badge>
                  <Badge variant="outline">
                    {selected.usageCount} rule uses
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {selected.description}
                </p>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Source service">
                    {selected.sourceService ?? "Unknown"}
                  </DetailField>
                  <DetailField label="Attributes">
                    {selected.attributes.length}
                  </DetailField>
                  <DetailField label="First seen">
                    {selected.firstSeenAt
                      ? formatDate(selected.firstSeenAt)
                      : "—"}
                  </DetailField>
                  <DetailField label="Last seen">
                    {selected.lastSeenAt
                      ? relativeDate(selected.lastSeenAt)
                      : "—"}
                  </DetailField>
                  <DetailField label="Updated" className="sm:col-span-2">
                    {formatDate(selected.updatedAt)}
                  </DetailField>
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Correlation keys</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.suggestedCorrelationKeys.map((key) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="font-mono font-normal normal-case"
                      >
                        {key}
                      </Badge>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Attributes</h3>
                  {selected.attributes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No attributes defined for this event.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {selected.attributes.map((attribute) => (
                        <div
                          key={attribute.key}
                          className="rounded-xl border border-border/60 bg-muted/10 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {attribute.key}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {attribute.type}
                            </Badge>
                            {attribute.required ? (
                              <Badge variant="secondary">Required</Badge>
                            ) : null}
                            {attribute.sensitive ? (
                              <Badge variant="warning">Sensitive</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {attribute.label}
                            {attribute.description
                              ? ` · ${attribute.description}`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <SheetFooter className="border-t sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  onClick={() =>
                    router.push(
                      `/explore?event=${encodeURIComponent(selected.canonicalName)}`,
                    )
                  }
                >
                  Use in rule
                </Button>
              </SheetFooter>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <Spinner />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
