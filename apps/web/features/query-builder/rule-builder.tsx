"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Beaker,
  Check,
  Clock3,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { EventSelector } from "@/features/events/event-selector";
import { DataState } from "@/components/shared/data-state";
import { FormField } from "@/components/shared/form-field";
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
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ruleDraftSchema,
  type EventDefinition,
  type RuleDraft,
} from "@/lib/contracts";
import {
  useCreateRule,
  useEvents,
  useRule,
  useTestRule,
  useUpdateRule,
} from "@/lib/queries";
import { ruleSentence } from "@/lib/rules";
import { cn, statusVariant } from "@/lib/utils";

const draftKey = "temporalguard.ruleDrafts.v1";

const defaultDraft: RuleDraft = {
  name: "",
  description: "",
  trigger: null,
  triggerFilters: [],
  operator: "all",
  outcomes: [],
  correlationKey: "",
  window: { value: 15, unit: "minutes" },
  severity: "info",
  environments: ["production"],
  status: "draft",
};

const operators = [
  { value: "any", label: "Any", hint: "One is enough" },
  { value: "all", label: "All", hint: "Every event" },
  { value: "sequence", label: "Sequence", hint: "In exact order" },
  { value: "forbid", label: "Forbid", hint: "Must not happen" },
] as const;

function toReference(event: EventDefinition) {
  return {
    eventId: event.id,
    canonicalName: event.canonicalName,
    displayName: event.displayName,
  };
}

function SortableOutcome({
  event,
  index,
  total,
  onRemove,
  onMove,
}: {
  event: RuleDraft["outcomes"][number];
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const sortable = useSortable({ id: event.eventId });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm ring-1 ring-foreground/5"
    >
      <button
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        aria-label={`Drag ${event.displayName}`}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {event.displayName}
        </span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {event.canonicalName}
        </span>
      </span>
      <div className="flex">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label={`Move ${event.displayName} earlier`}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          aria-label={`Move ${event.displayName} later`}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Remove ${event.displayName}`}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

export function RuleBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ruleId = searchParams.get("rule") ?? undefined;
  const hydrationKey = ruleId ?? "new";
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "failed" | "restored"
  >("saved");
  const [activePane, setActivePane] = useState<
    "catalogue" | "canvas" | "properties"
  >("canvas");
  const hydratedKey = useRef<string | null>(null);
  const eventsQuery = useEvents();
  const ruleQuery = useRule(ruleId);
  const testMutation = useTestRule();
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();
  const savePending = createMutation.isPending || updateMutation.isPending;
  const form = useForm<RuleDraft>({
    resolver: zodResolver(ruleDraftSchema),
    defaultValues: defaultDraft,
    mode: "onChange",
  });
  const draft = useWatch({ control: form.control }) as RuleDraft;
  const events = useMemo(
    () => eventsQuery.data?.items ?? [],
    [eventsQuery.data?.items],
  );
  const triggerEvent =
    events.find((event) => event.id === draft.trigger?.eventId) ?? null;
  const usedIds = [
    ...(draft.trigger ? [draft.trigger.eventId] : []),
    ...draft.outcomes.map((outcome) => outcome.eventId),
  ];
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (hydratedKey.current === hydrationKey) return;
    if (ruleId) {
      if (!ruleQuery.data) return;
      form.reset(ruleQuery.data);
      hydratedKey.current = hydrationKey;
      setSaveState("saved");
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const stored = ruleDraftSchema.safeParse(JSON.parse(raw));
        if (stored.success) {
          form.reset(stored.data);
          setSaveState("restored");
        } else {
          localStorage.removeItem(draftKey);
        }
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
    hydratedKey.current = hydrationKey;
  }, [form, hydrationKey, ruleId, ruleQuery.data]);

  useEffect(() => {
    if (hydratedKey.current !== hydrationKey) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          ruleId ? `${draftKey}.${ruleId}` : draftKey,
          JSON.stringify(draft),
        );
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, hydrationKey, ruleId]);

  const warnings = useMemo(() => {
    const result: string[] = [];
    if (
      draft.outcomes.some(
        (outcome) =>
          !events.find((event) => event.id === outcome.eventId)?.lastSeenAt,
      )
    )
      result.push("One or more outcomes have never been observed.");
    const keys = draft.outcomes.flatMap(
      (outcome) =>
        events.find((event) => event.id === outcome.eventId)
          ?.suggestedCorrelationKeys ?? [],
    );
    if (keys.length > 0 && !keys.includes(draft.correlationKey))
      result.push("Selected events suggest a different correlation key.");
    if (draft.window.value < 2 && draft.window.unit === "minutes")
      result.push("The window may be shorter than recent p95 duration.");
    return result;
  }, [draft, events]);

  const addOutcome = (event: EventDefinition) => {
    if (usedIds.includes(event.id)) {
      toast.error("This event is already used in the rule.");
      return;
    }
    form.setValue("outcomes", [...draft.outcomes, toReference(event)], {
      shouldValidate: true,
    });
    if (!draft.correlationKey && event.suggestedCorrelationKeys[0]) {
      form.setValue("correlationKey", event.suggestedCorrelationKeys[0]);
    }
  };

  const reorder = (from: number, to: number) => {
    form.setValue("outcomes", arrayMove(draft.outcomes, from, to), {
      shouldValidate: true,
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || event.active.id === overId) return;
    const from = draft.outcomes.findIndex(
      (outcome) => outcome.eventId === event.active.id,
    );
    const to = draft.outcomes.findIndex(
      (outcome) => outcome.eventId === overId,
    );
    if (from >= 0 && to >= 0) reorder(from, to);
  };

  const activate = form.handleSubmit((values) => {
    setSaveState("saving");
    const input: RuleDraft = {
      ...values,
      status: ruleId ? values.status : "active",
      environments:
        values.environments.length > 0 ? values.environments : ["production"],
    };
    const callbacks = {
      onSuccess: (savedRule: { id: string }) => {
        form.setValue("status", input.status);
        setSaveState("saved" as const);
        if (ruleId) {
          toast.success("Rule updated.");
        } else {
          toast.success("Rule saved and activated.");
          router.replace(`/rules`);
        }
      },
      onError: (error: Error) => {
        setSaveState("failed" as const);
        toast.error(error.message);
      },
    };
    if (ruleId) {
      updateMutation.mutate({ id: ruleId, input }, callbacks);
    } else {
      createMutation.mutate(input, callbacks);
    }
  });

  if (ruleId && ruleQuery.isError) {
    return (
      <DataState
        state="error"
        title="Rule unavailable"
        description={ruleQuery.error.message}
        onRetry={() => void ruleQuery.refetch()}
      >
        <span />
      </DataState>
    );
  }

  if (ruleId && (ruleQuery.isLoading || !ruleQuery.data)) {
    return (
      <DataState state="loading" title="Loading rule">
        <span />
      </DataState>
    );
  }

  const errorMessages = Object.values(form.formState.errors)
    .map((error) =>
      error && "message" in error && typeof error.message === "string"
        ? error.message
        : null,
    )
    .filter((message): message is string => Boolean(message));

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Rule Studio"
        title={ruleId ? "Edit rule" : "Explore & build"}
        description={
          ruleId
            ? "Update this persisted workflow promise."
            : "Compose a time-bound workflow promise, validate it, and test against history."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-xs",
                saveState === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "failed"
                  ? "Save failed"
                  : saveState === "restored"
                    ? "Draft restored"
                    : "Draft autosaved"}
            </span>
            {ruleId ? (
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href="/rules" />}
              >
                Back to rules
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem(
                  ruleId ? `${draftKey}.${ruleId}` : draftKey,
                );
                form.reset(
                  ruleId && ruleQuery.data ? ruleQuery.data : defaultDraft,
                );
                toast.success(
                  ruleId ? "Changes reset." : "Draft reset to defaults.",
                );
              }}
            >
              <RotateCcw />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void activate()}
              disabled={savePending}
            >
              {savePending ? <Spinner /> : <Save />}
              {savePending ? "Saving…" : ruleId ? "Update rule" : "Save rule"}
            </Button>
          </div>
        }
      />

      <Tabs
        value={activePane}
        onValueChange={(value) => {
          if (
            value === "catalogue" ||
            value === "canvas" ||
            value === "properties"
          ) {
            setActivePane(value);
          }
        }}
        className="lg:hidden"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalogue">Blocks</TabsTrigger>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid min-h-[680px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)_330px]">
        <Card
          className={cn(
            "gap-0 py-0",
            activePane !== "catalogue" && "hidden lg:flex",
          )}
        >
          <CardHeader className="border-b py-4">
            <CardTitle>Building blocks</CardTitle>
            <CardDescription>
              Select known events or create one without losing this draft.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-4">
            <FormField
              label="Trigger"
              error={form.formState.errors.trigger?.message}
            >
              <EventSelector
                label="Select trigger event"
                selected={triggerEvent}
                usedIds={usedIds}
                onSelect={(event) => {
                  form.setValue("trigger", toReference(event), {
                    shouldValidate: true,
                  });
                  if (
                    !draft.correlationKey &&
                    event.suggestedCorrelationKeys[0]
                  )
                    form.setValue(
                      "correlationKey",
                      event.suggestedCorrelationKeys[0],
                    );
                }}
              />
            </FormField>
            <FormField
              label={
                draft.operator === "forbid" ? "Forbidden event" : "Outcome"
              }
              error={form.formState.errors.outcomes?.message}
            >
              <EventSelector
                label="Add outcome event"
                usedIds={usedIds}
                onSelect={addOutcome}
              />
            </FormField>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Operator</p>
              <div className="grid grid-cols-2 gap-2">
                {operators.map((operator) => {
                  const active = draft.operator === operator.value;
                  return (
                    <button
                      key={operator.value}
                      type="button"
                      onClick={() =>
                        form.setValue("operator", operator.value, {
                          shouldValidate: true,
                        })
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        active
                          ? operator.value === "forbid"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted/40",
                      )}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wide">
                        {operator.label}
                      </span>
                      <span className="mt-1 block text-[11px] opacity-75">
                        {operator.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "min-w-0 gap-0 py-0",
            activePane !== "canvas" && "hidden lg:flex",
          )}
        >
          <CardHeader className="border-b py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Rule canvas</CardTitle>
                <CardDescription>
                  One model drives this canvas and readable sentence.
                </CardDescription>
              </div>
              <Badge
                variant={statusVariant(draft.status)}
                className="capitalize"
              >
                {draft.status || "draft"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 py-5">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-primary uppercase">
                When
              </p>
              <p className="mt-1 font-medium">
                {draft.trigger?.displayName ?? "Choose a trigger event"}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {draft.trigger?.canonicalName ?? "No trigger selected"}
              </p>
            </div>

            <div className="mx-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-8 w-px bg-border" />
              <Badge
                variant={
                  draft.operator === "forbid" ? "destructive" : "default"
                }
                className="uppercase"
              >
                {draft.operator}
              </Badge>
              <Clock3 className="size-3.5" />
              <span className="tabular-nums">
                {draft.window.value || "—"} {draft.window.unit}
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={draft.outcomes.map((outcome) => outcome.eventId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-2">
                  {draft.outcomes.map((outcome, index) => (
                    <SortableOutcome
                      key={outcome.eventId}
                      event={outcome}
                      index={index}
                      total={draft.outcomes.length}
                      onRemove={() =>
                        form.setValue(
                          "outcomes",
                          draft.outcomes.filter(
                            (event) => event.eventId !== outcome.eventId,
                          ),
                          { shouldValidate: true },
                        )
                      }
                      onMove={(direction) => reorder(index, index + direction)}
                    />
                  ))}
                  {draft.outcomes.length === 0 ? (
                    <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-center text-sm text-muted-foreground">
                      <span>
                        <Plus className="mx-auto mb-2 size-5" />
                        Add an outcome from Building blocks
                      </span>
                    </div>
                  ) : null}
                </div>
              </SortableContext>
            </DndContext>

            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Readable rule
              </p>
              <p className="leading-6 text-sm">{ruleSentence(draft)}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "gap-0 py-0",
            activePane !== "properties" && "hidden lg:flex",
          )}
        >
          <CardHeader className="border-b py-4">
            <CardTitle>Properties & validation</CardTitle>
            <CardDescription>
              Name, window, severity, and historical test.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-4">
            <FormField
              label="Rule name"
              htmlFor="rule-name"
              error={form.formState.errors.name?.message}
            >
              <Input
                id="rule-name"
                placeholder="Documents verified within 10m"
                {...form.register("name")}
              />
            </FormField>
            <FormField label="Description" htmlFor="rule-description">
              <Textarea
                id="rule-description"
                placeholder="Describe the business promise this rule enforces."
                {...form.register("description")}
              />
            </FormField>
            <FormField
              label="Correlation key"
              htmlFor="rule-correlation-key"
              error={form.formState.errors.correlationKey?.message}
            >
              <Input
                id="rule-correlation-key"
                className="font-mono"
                placeholder="document.id"
                {...form.register("correlationKey")}
              />
            </FormField>
            <div className="grid grid-cols-[1fr_1.25fr] gap-2">
              <FormField
                label="Window"
                htmlFor="rule-window"
                error={form.formState.errors.window?.value?.message}
              >
                <Input
                  id="rule-window"
                  type="number"
                  min={1}
                  {...form.register("window.value", { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Unit" htmlFor="rule-window-unit">
                <NativeSelect
                  id="rule-window-unit"
                  className="w-full"
                  {...form.register("window.unit")}
                >
                  {["seconds", "minutes", "hours", "days"].map((unit) => (
                    <NativeSelectOption key={unit} value={unit}>
                      {unit}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Severity" htmlFor="rule-severity">
                <NativeSelect
                  id="rule-severity"
                  className="w-full"
                  {...form.register("severity")}
                >
                  <NativeSelectOption value="info">Info</NativeSelectOption>
                  <NativeSelectOption value="warning">
                    Warning
                  </NativeSelectOption>
                  <NativeSelectOption value="critical">
                    Critical
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Environment" htmlFor="rule-environment">
                <NativeSelect
                  id="rule-environment"
                  className="w-full"
                  value={draft.environments[0] ?? "production"}
                  onChange={(event) =>
                    form.setValue("environments", [event.target.value], {
                      shouldValidate: true,
                    })
                  }
                >
                  <NativeSelectOption value="production">
                    Production
                  </NativeSelectOption>
                  <NativeSelectOption value="staging">
                    Staging
                  </NativeSelectOption>
                  <NativeSelectOption value="development">
                    Development
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
            </div>

            {errorMessages.length > 0 ? (
              <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <p className="font-semibold">Activation blocked</p>
                <ul className="mt-1 list-disc pl-4">
                  {errorMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-success-subtle p-3 text-xs text-success">
                <Check className="size-4" />
                Rule is valid for activation.
              </div>
            )}

            {warnings.map((warning) => (
              <div
                key={warning}
                className="flex gap-2 rounded-xl bg-warning-subtle p-3 text-xs text-warning"
              >
                <AlertTriangle className="size-4 shrink-0" />
                {warning}
              </div>
            ))}

            <Separator />

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Historical test</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Persisted workspace history
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => testMutation.mutate(draft)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Spinner /> : <Beaker />}
                  Test
                </Button>
              </div>
              {testMutation.data ? (
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Evaluated", testMutation.data.evaluatedCount],
                    ["Would complete", testMutation.data.completedCount],
                    ["Would violate", testMutation.data.violatedCount],
                    ["Would remain open", testMutation.data.openCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-muted/40 p-2.5">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Test this draft against recent persisted workflow history.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
