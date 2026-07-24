"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  LoaderCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Field, Input, Textarea } from "../../components/ui/input";
import { Badge } from "../../components/ui/surface";
import {
  type CreateEventInput,
  type EventDefinition,
} from "../../lib/contracts";
import { useCreateEvent, useEvents } from "../../lib/queries";
import { findEventDuplicates } from "../../lib/rules";

const createEventSchema = z.object({
  canonicalName: z
    .string()
    .regex(
      /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/,
      "Use lower-case dot notation, for example document.uploaded",
    ),
  displayName: z.string().min(2),
  domain: z.string().min(2),
  description: z.string().min(8),
  sourceService: z.string().min(2),
  correlationKey: z.string().min(2),
  attributeKey: z.string().optional(),
});

type CreateEventFields = z.infer<typeof createEventSchema>;

function EventCreator({
  initialName,
  events,
  onCreated,
  onCancel,
}: {
  initialName: string;
  events: EventDefinition[];
  onCreated: (event: EventDefinition) => void;
  onCancel: () => void;
}) {
  const mutation = useCreateEvent();
  const form = useForm<CreateEventFields>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      canonicalName: initialName,
      displayName: initialName
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      domain: initialName.split(".")[0] ?? "",
      description: "",
      sourceService: "",
      correlationKey: `${initialName.split(".")[0] ?? "entity"}.id`,
      attributeKey: "",
    },
  });
  const canonicalName = form.watch("canonicalName");
  const duplicates = useMemo(
    () => findEventDuplicates(canonicalName, events),
    [canonicalName, events],
  );

  const submit = form.handleSubmit(async (fields) => {
    if (duplicates.exact) {
      form.setError("canonicalName", {
        message: "This event already exists. Select it from the catalogue.",
      });
      return;
    }
    const input: CreateEventInput = {
      canonicalName: fields.canonicalName,
      displayName: fields.displayName,
      domain: fields.domain,
      description: fields.description,
      sourceService: fields.sourceService,
      suggestedCorrelationKeys: [fields.correlationKey],
      attributes: fields.attributeKey
        ? [
            {
              key: fields.attributeKey,
              label: fields.attributeKey,
              type: "string",
              required: false,
              sensitive: false,
            },
          ]
        : [],
    };
    const event = await mutation.mutateAsync(input);
    onCreated(event);
  });

  return (
    <form
      onSubmit={submit}
      className="grid max-h-[88vh] gap-4 overflow-y-auto p-4"
      noValidate
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Create event definition</h3>
          <p className="text-xs text-muted-foreground">
            The active rule draft remains intact until this event is saved.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel event creation"
        >
          <X className="size-4" />
        </Button>
      </div>
      {mutation.error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] bg-destructive-subtle p-3 text-sm text-destructive"
        >
          {mutation.error.message}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Canonical name"
          error={form.formState.errors.canonicalName?.message}
        >
          <Input className="font-mono" {...form.register("canonicalName")} />
        </Field>
        <Field
          label="Display name"
          error={form.formState.errors.displayName?.message}
        >
          <Input {...form.register("displayName")} />
        </Field>
      </div>
      {duplicates.near.length > 0 ? (
        <div className="flex gap-2 rounded-[var(--radius-md)] bg-warning-subtle p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Similar event:{" "}
            <strong className="font-mono">
              {duplicates.near[0]?.canonicalName}
            </strong>
            . Confirm this is intentionally different.
          </span>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Domain" error={form.formState.errors.domain?.message}>
          <Input {...form.register("domain")} />
        </Field>
        <Field
          label="Source service"
          error={form.formState.errors.sourceService?.message}
        >
          <Input
            placeholder="documents-api"
            {...form.register("sourceService")}
          />
        </Field>
      </div>
      <Field
        label="Description"
        error={form.formState.errors.description?.message}
      >
        <Textarea
          placeholder="Describe the business fact represented by this event."
          {...form.register("description")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Suggested correlation key"
          error={form.formState.errors.correlationKey?.message}
        >
          <Input className="font-mono" {...form.register("correlationKey")} />
        </Field>
        <Field label="First attribute (optional)">
          <Input
            className="font-mono"
            placeholder="document.type"
            {...form.register("attributeKey")}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {mutation.isPending ? "Creating…" : "Create and select"}
        </Button>
      </div>
    </form>
  );
}

export function EventSelector({
  label,
  selected,
  usedIds = [],
  onSelect,
}: {
  label: string;
  selected?: EventDefinition | null;
  usedIds?: string[];
  onSelect: (event: EventDefinition) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<EventDefinition | null>(null);
  const query = useEvents({ search });
  const events = query.data?.items ?? [];
  const exact = events.some(
    (event) => event.canonicalName.toLowerCase() === search.toLowerCase(),
  );
  const grouped = events.reduce<Record<string, EventDefinition[]>>(
    (groups, event) => {
      groups[event.domain] ??= [];
      groups[event.domain]?.push(event);
      return groups;
    },
    {},
  );

  const select = (event: EventDefinition) => {
    onSelect(event);
    setOpen(false);
    setCreating(false);
    setSearch("");
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between px-3"
        >
          <span className="min-w-0 truncate text-left">
            {selected ? (
              <>
                <span className="block text-xs font-medium">
                  {selected.displayName}
                </span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {selected.canonicalName}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[min(94vw,920px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-xl)] border-[3px] border-border bg-popover shadow-[8px_8px_0_var(--shadow-ink)]">
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {creating ? (
            <EventCreator
              initialName={search}
              events={query.data?.items ?? []}
              onCreated={select}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <div className="grid min-h-[560px] md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="border-r border-border">
                <div className="flex items-center gap-2 border-b border-border px-4">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-12 flex-1 bg-transparent outline-none"
                    placeholder="Search canonical name, domain, service, attribute…"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    aria-label="Close event catalogue"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="scrollbar-thin max-h-[508px] overflow-y-auto p-2">
                  {query.isLoading ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      Loading catalogue…
                    </p>
                  ) : null}
                  {search && !exact ? (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="mb-2 flex w-full items-center gap-3 rounded-[var(--radius-md)] border-2 border-primary bg-primary-subtle p-3 text-left text-primary-subtle-foreground shadow-[3px_3px_0_var(--shadow-ink)] transition-transform duration-100 hover:-rotate-[0.3deg]"
                    >
                      <Plus className="size-4" />
                      <span>
                        Create{" "}
                        <strong className="font-mono">
                          {search || "new event"}
                        </strong>
                      </span>
                    </button>
                  ) : null}
                  {Object.entries(grouped).map(([domain, domainEvents]) => (
                    <div key={domain} className="mb-4">
                      <p className="px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                        {domain}
                      </p>
                      {domainEvents.map((event) => (
                        <button
                          type="button"
                          key={event.id}
                          onMouseEnter={() => setPreview(event)}
                          onFocus={() => setPreview(event)}
                          onClick={() => select(event)}
                          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-left hover:bg-muted focus:bg-muted"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary-subtle text-primary-subtle-foreground">
                            {selected?.id === event.id ? (
                              <Check className="size-4" />
                            ) : (
                              event.displayName.charAt(0)
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {event.displayName}
                            </span>
                            <span className="block truncate font-mono text-[11px] text-muted-foreground">
                              {event.canonicalName}
                            </span>
                          </span>
                          {usedIds.includes(event.id) ? (
                            <Badge tone="primary">Used</Badge>
                          ) : null}
                          <span className="text-[10px] text-muted-foreground">
                            {event.usageCount} uses
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {!query.isLoading && events.length === 0 && !search ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No events available.
                    </p>
                  ) : null}
                </div>
              </div>
              <aside className="hidden bg-surface-subtle p-5 md:block">
                {preview ? (
                  <div className="grid gap-4">
                    <div>
                      <Badge>{preview.domain}</Badge>
                      <h3 className="mt-3 text-lg font-semibold">
                        {preview.displayName}
                      </h3>
                      <p className="font-mono text-xs text-primary">
                        {preview.canonicalName}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {preview.description}
                    </p>
                    <dl className="grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Source
                        </dt>
                        <dd>{preview.sourceService ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Correlation keys
                        </dt>
                        <dd className="font-mono text-xs">
                          {preview.suggestedCorrelationKeys.join(", ")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Attributes
                        </dt>
                        <dd>
                          {preview.attributes.map((attribute) => (
                            <span
                              key={attribute.key}
                              className="mt-1 mr-1 inline-block rounded bg-muted px-1.5 py-1 font-mono text-[10px]"
                            >
                              {attribute.key}
                            </span>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Focus an event to inspect source, usage, attributes, and
                    suggested correlation keys.
                  </p>
                )}
              </aside>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
