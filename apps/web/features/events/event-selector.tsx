"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type CreateEventInput,
  type EventDefinition,
} from "@/lib/contracts";
import { useCreateEvent, useEvents } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { findEventDuplicates } from "@/lib/rules";

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
      className="grid max-h-[min(88vh,720px)] gap-4 overflow-y-auto p-1"
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
          size="icon-sm"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel event creation"
        >
          <X />
        </Button>
      </div>
      {mutation.error ? (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {mutation.error.message}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Canonical name"
          error={form.formState.errors.canonicalName?.message}
        >
          <Input className="font-mono" {...form.register("canonicalName")} />
        </FormField>
        <FormField
          label="Display name"
          error={form.formState.errors.displayName?.message}
        >
          <Input {...form.register("displayName")} />
        </FormField>
      </div>
      {duplicates.near.length > 0 ? (
        <div className="flex gap-2 rounded-xl bg-warning-subtle p-3 text-sm text-warning">
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
        <FormField label="Domain" error={form.formState.errors.domain?.message}>
          <Input {...form.register("domain")} />
        </FormField>
        <FormField
          label="Source service"
          error={form.formState.errors.sourceService?.message}
        >
          <Input
            placeholder="documents-api"
            {...form.register("sourceService")}
          />
        </FormField>
      </div>
      <FormField
        label="Description"
        error={form.formState.errors.description?.message}
      >
        <Textarea
          placeholder="Describe the business fact represented by this event."
          {...form.register("description")}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Suggested correlation key"
          error={form.formState.errors.correlationKey?.message}
        >
          <Input className="font-mono" {...form.register("correlationKey")} />
        </FormField>
        <FormField label="First attribute (optional)">
          <Input
            className="font-mono"
            placeholder="document.type"
            {...form.register("attributeKey")}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner /> : <Plus />}
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCreating(false);
          setSearch("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full justify-between px-3 py-2"
          />
        }
      >
        <span className="min-w-0 truncate text-left">
          {selected ? (
            <>
              <span className="block text-sm font-medium">
                {selected.displayName}
              </span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {selected.canonicalName}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(88vh,760px)] max-w-[min(94vw,920px)] gap-0 overflow-hidden p-0 sm:max-w-[920px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Search the event catalogue or create a new event definition.
          </DialogDescription>
        </DialogHeader>
        {creating ? (
          <div className="p-5">
            <EventCreator
              initialName={search}
              events={query.data?.items ?? []}
              onCreated={select}
              onCancel={() => setCreating(false)}
            />
          </div>
        ) : (
          <div className="grid min-h-[560px] md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="border-r border-border">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <InputGroup className="flex-1 border-0 bg-transparent shadow-none">
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search canonical name, domain, service…"
                  />
                </InputGroup>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  aria-label="Close event catalogue"
                >
                  <X />
                </Button>
              </div>
              <ScrollArea className="h-[508px]">
                <div className="p-2">
                  {query.isLoading ? (
                    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                      <Spinner /> Loading catalogue…
                    </div>
                  ) : null}
                  {search && !exact ? (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="mb-2 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary hover:text-primary-foreground"
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
                    <div key={domain} className="mb-3">
                      <p className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {domain}
                      </p>
                      {domainEvents.map((event) => {
                        const isSelected = selected?.id === event.id;
                        const isUsed = usedIds.includes(event.id);
                        return (
                          <button
                            type="button"
                            key={event.id}
                            onMouseEnter={() => setPreview(event)}
                            onFocus={() => setPreview(event)}
                            onClick={() => select(event)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted focus:bg-muted",
                              isSelected && "bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {isSelected ? (
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
                            {isUsed ? <Badge variant="info">Used</Badge> : null}
                            <span className="text-[10px] text-muted-foreground">
                              {event.usageCount} uses
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {!query.isLoading && events.length === 0 && !search ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No events available.
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
            <aside className="hidden bg-muted/30 p-5 md:block">
              {preview ? (
                <div className="grid gap-4">
                  <div>
                    <Badge variant="outline">{preview.domain}</Badge>
                    <h3 className="mt-3 text-lg font-semibold">
                      {preview.displayName}
                    </h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {preview.canonicalName}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {preview.description}
                  </p>
                  <Separator />
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Source</dt>
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
                      <dt className="mb-1 text-xs text-muted-foreground">
                        Attributes
                      </dt>
                      <dd className="flex flex-wrap gap-1">
                        {preview.attributes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            None defined
                          </span>
                        ) : (
                          preview.attributes.map((attribute) => (
                            <Badge
                              key={attribute.key}
                              variant="secondary"
                              className="font-mono font-normal normal-case"
                            >
                              {attribute.key}
                            </Badge>
                          ))
                        )}
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
      </DialogContent>
    </Dialog>
  );
}
