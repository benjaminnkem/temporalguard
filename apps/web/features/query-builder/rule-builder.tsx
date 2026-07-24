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
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { EventSelector } from "../events/event-selector";
import { Button } from "../../components/ui/button";
import { Field, Input, Textarea } from "../../components/ui/input";
import { Badge, Card } from "../../components/ui/surface";
import {
  ruleDraftSchema,
  type EventDefinition,
  type RuleDraft,
} from "../../lib/contracts";
import { useEvents, useTestRule } from "../../lib/queries";
import { ruleSentence } from "../../lib/rules";

const draftKey = "temporalguard.mock.ruleDrafts.v1";

const defaultDraft: RuleDraft = {
  name: "Document verification within ten minutes",
  description:
    "Protect the customer onboarding flow from incomplete document verification.",
  trigger: null,
  triggerFilters: [],
  operator: "all",
  outcomes: [],
  correlationKey: "document.id",
  window: { value: 10, unit: "minutes" },
  severity: "critical",
  environments: ["production"],
  status: "draft",
};

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
      className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-2"
    >
      <button
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
        className="grid size-8 place-items-center text-muted-foreground"
        aria-label={`Drag ${event.displayName}`}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="grid size-7 place-items-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
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
          size="icon"
          variant="ghost"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label={`Move ${event.displayName} earlier`}
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          aria-label={`Move ${event.displayName} later`}
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Remove ${event.displayName}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function RuleBuilder() {
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "failed" | "restored"
  >("saved");
  const [activePane, setActivePane] = useState<
    "catalogue" | "canvas" | "properties"
  >("canvas");
  const hydrated = useRef(false);
  const eventsQuery = useEvents();
  const testMutation = useTestRule();
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
    if (hydrated.current) return;
    hydrated.current = true;
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
  }, [form]);

  useEffect(() => {
    if (!hydrated.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft]);

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
      result.push("The window is shorter than the mock p95 duration.");
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

  const activate = form.handleSubmit(() => {
    toast.success("Rule saved in mock mode.");
    form.setValue("status", "active");
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rule Studio</h1>
          <p className="text-sm text-muted-foreground">
            Build and test a time-bound workflow promise with mock history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${
              saveState === "failed"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "failed"
                ? "Save failed"
                : saveState === "restored"
                  ? "Draft restored"
                  : "Saved locally"}
          </span>
          <Button
            type="button"
            onClick={() => {
              localStorage.removeItem(draftKey);
              form.reset(defaultDraft);
              toast.success("Draft reset to seed.");
            }}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void activate()}
          >
            <Save className="size-4" />
            Save rule
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-[var(--radius-md)] bg-muted p-1 lg:hidden">
        {(["catalogue", "canvas", "properties"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            onClick={() => setActivePane(pane)}
            className={`flex-1 rounded-[var(--radius-sm)] px-2 py-2 text-xs font-medium capitalize ${
              activePane === pane
                ? "bg-surface shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {pane}
          </button>
        ))}
      </div>

      <div className="grid min-h-[680px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)_330px]">
        <Card
          className={`p-4 ${activePane !== "catalogue" ? "hidden lg:block" : ""}`}
        >
          <h2 className="font-semibold">Building blocks</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Select known events or create one without losing this draft.
          </p>
          <div className="mt-5 grid gap-4">
            <Field
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
            </Field>
            <Field
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
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium">Operator</p>
              <div className="grid grid-cols-2 gap-2">
                {(["any", "all", "sequence", "forbid"] as const).map(
                  (operator) => (
                    <button
                      key={operator}
                      type="button"
                      onClick={() =>
                        form.setValue("operator", operator, {
                          shouldValidate: true,
                        })
                      }
                      className={`rounded-[var(--radius-md)] border p-3 text-left ${
                        draft.operator === operator
                          ? operator === "forbid"
                            ? "border-destructive bg-destructive-subtle text-destructive"
                            : "border-primary bg-primary-subtle text-primary-subtle-foreground"
                          : "border-border bg-surface"
                      }`}
                    >
                      <span className="block text-xs font-bold uppercase">
                        {operator}
                      </span>
                      <span className="mt-1 block text-[10px] opacity-75">
                        {operator === "any"
                          ? "One is enough"
                          : operator === "all"
                            ? "Every event"
                            : operator === "sequence"
                              ? "In exact order"
                              : "Must not happen"}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={`min-w-0 p-4 sm:p-6 ${
            activePane !== "canvas" ? "hidden lg:block" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Rule canvas</h2>
              <p className="text-xs text-muted-foreground">
                One model drives this canvas and readable sentence.
              </p>
            </div>
            <Badge tone={draft.status === "active" ? "success" : "neutral"}>
              {draft.status}
            </Badge>
          </div>
          <div className="mt-6 grid gap-5">
            <div className="rounded-[var(--radius-lg)] border border-primary bg-primary-subtle p-4">
              <p className="text-[10px] font-bold tracking-[0.12em] text-primary-subtle-foreground uppercase">
                When
              </p>
              <p className="mt-1 font-medium">
                {draft.trigger?.displayName ?? "Choose a trigger event"}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {draft.trigger?.canonicalName}
              </p>
            </div>
            <div className="mx-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-8 w-px bg-border-strong" />
              <Badge tone={draft.operator === "forbid" ? "danger" : "primary"}>
                {draft.operator.toUpperCase()}
              </Badge>
              <Clock3 className="size-3.5" />
              {draft.window.value} {draft.window.unit}
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
                    <div className="grid min-h-28 place-items-center rounded-[var(--radius-md)] border border-dashed border-border-strong text-center text-sm text-muted-foreground">
                      <span>
                        <Plus className="mx-auto mb-2 size-5" />
                        Add an outcome from the Event Catalogue
                      </span>
                    </div>
                  ) : null}
                </div>
              </SortableContext>
            </DndContext>
            <div className="rounded-[var(--radius-lg)] bg-surface-subtle p-4">
              <p className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Readable rule
              </p>
              <p className="leading-6">{ruleSentence(draft)}</p>
            </div>
          </div>
        </Card>

        <Card
          className={`p-4 ${activePane !== "properties" ? "hidden lg:block" : ""}`}
        >
          <h2 className="font-semibold">Properties & validation</h2>
          <div className="mt-4 grid gap-4">
            <Field
              label="Rule name"
              error={form.formState.errors.name?.message}
            >
              <Input {...form.register("name")} />
            </Field>
            <Field label="Description">
              <Textarea {...form.register("description")} />
            </Field>
            <Field
              label="Correlation key"
              error={form.formState.errors.correlationKey?.message}
            >
              <Input
                className="font-mono"
                {...form.register("correlationKey")}
              />
            </Field>
            <div className="grid grid-cols-[1fr_1.25fr] gap-2">
              <Field
                label="Window"
                error={form.formState.errors.window?.value?.message}
              >
                <Input
                  type="number"
                  min={1}
                  {...form.register("window.value", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Unit">
                <select
                  className="min-h-10 rounded-[var(--radius-md)] border border-border bg-input px-2"
                  {...form.register("window.unit")}
                >
                  {["seconds", "minutes", "hours", "days"].map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Severity">
                <select
                  className="min-h-10 rounded-[var(--radius-md)] border border-border bg-input px-2"
                  {...form.register("severity")}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
              <Field label="Environment">
                <select
                  className="min-h-10 rounded-[var(--radius-md)] border border-border bg-input px-2"
                  value={draft.environments[0]}
                  onChange={(event) =>
                    form.setValue("environments", [event.target.value], {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </Field>
            </div>
            {Object.keys(form.formState.errors).length > 0 ? (
              <div className="rounded-[var(--radius-md)] bg-destructive-subtle p-3 text-xs text-destructive">
                <p className="font-semibold">Activation blocked</p>
                <ul className="mt-1 list-disc pl-4">
                  {Object.values(form.formState.errors).map((error, index) => (
                    <li key={index}>
                      {"message" in error && typeof error.message === "string"
                        ? error.message
                        : "Complete the highlighted field."}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-subtle p-3 text-xs text-success">
                <Check className="size-4" />
                Rule is valid for activation.
              </div>
            )}
            {warnings.map((warning) => (
              <div
                key={warning}
                className="flex gap-2 rounded-[var(--radius-md)] bg-warning-subtle p-3 text-xs text-warning"
              >
                <AlertTriangle className="size-4 shrink-0" />
                {warning}
              </div>
            ))}
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Historical test</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Simulated mock data
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => testMutation.mutate(draft)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Beaker className="size-3.5" />
                  )}
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
                    <div
                      key={label}
                      className="rounded-[var(--radius-sm)] bg-surface-subtle p-2"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Test this draft against 248 deterministic historical
                  workflows.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
