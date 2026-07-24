"use client";

import { Database, Search } from "lucide-react";
import { useState } from "react";
import { DataState } from "../../components/shared/data-state";
import { PageHeader } from "../../components/shared/page-header";
import { Input } from "../../components/ui/input";
import { Badge, Card } from "../../components/ui/surface";
import type { EventDefinition } from "../../lib/contracts";
import { useEvents } from "../../lib/queries";
import { formatDate } from "../../lib/utils";
import { EventSelector } from "./event-selector";

export function EventCatalogueView() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EventDefinition | null>(null);
  const query = useEvents({ search });
  const state = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : query.data?.items.length === 0
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
          <div className="w-56">
            <EventSelector
              label="Create or select event"
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border-strong p-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, domain, service, or attribute…"
            className="border-0 focus:border-0"
          />
        </div>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="bg-surface-subtle font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Correlation keys</th>
                  <th className="px-4 py-3 text-right">Usage</th>
                  <th className="px-4 py-3">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.items.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t border-border hover:bg-primary-subtle"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-start gap-3 text-left"
                        onClick={() => setSelected(event)}
                      >
                        <span className="grid size-8 place-items-center border border-primary text-primary">
                          <Database className="size-4" />
                        </span>
                        <span>
                          <span className="block font-medium">
                            {event.displayName}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {event.canonicalName}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">{event.domain}</td>
                    <td className="px-4 py-3">{event.sourceService ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {event.suggestedCorrelationKeys.map((key) => (
                          <Badge key={key}>{key}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {event.usageCount}
                    </td>
                    <td className="px-4 py-3">{formatDate(event.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Card>
      {selected ? (
        <Card className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="font-mono text-[10px] tracking-[0.08em] text-primary uppercase">
              Selected event
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {selected.displayName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {selected.description}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{selected.attributes.length} attributes</p>
            <p>{selected.usageCount} rule usages</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
