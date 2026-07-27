"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  businessProfileSchema,
  createApiKeySchema,
  settingsClient,
  type ApiKeySummary,
  type BusinessProfileInput,
  type CreateApiKeyInput,
  type CreatedApiKey,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

function relativeDate(value?: string | null) {
  if (!value) return "Never";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return formatDistanceToNow(date, { addSuffix: true });
}

function BusinessProfileCard() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["settings", "business"],
    queryFn: () => settingsClient.getBusiness(),
  });
  const form = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    values: {
      name: query.data?.name ?? "",
      website: query.data?.website ?? "",
      description: query.data?.description ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (input: BusinessProfileInput) =>
      settingsClient.updateBusiness(input),
    onSuccess: async (business) => {
      await queryClient.invalidateQueries({
        queryKey: ["settings", "business"],
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Business profile updated.");
      form.reset({
        name: business.name,
        website: business.website ?? "",
        description: business.description ?? "",
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <DataState
        state="error"
        title="Unable to load business profile"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      >
        <span />
      </DataState>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>
              These details identify your workspace in TemporalGuard and in the
              product UI.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-5">
        <form
          className="grid max-w-xl gap-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <FormField
            label="Business name"
            error={form.formState.errors.name?.message}
          >
            <Input placeholder="Northstar Labs" {...form.register("name")} />
          </FormField>
          <FormField
            label="Website"
            error={form.formState.errors.website?.message}
          >
            <Input
              type="url"
              placeholder="https://company.example"
              {...form.register("website")}
            />
          </FormField>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              placeholder="What does this workspace monitor?"
              {...form.register("description")}
            />
          </FormField>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <Check />}
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Updated {relativeDate(query.data.updatedAt)}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ApiKeysCard() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [showSecret, setShowSecret] = useState(true);

  const query = useQuery({
    queryKey: ["settings", "api-keys"],
    queryFn: () => settingsClient.listApiKeys(),
  });

  const createForm = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "", environment: "live" },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateApiKeyInput) =>
      settingsClient.createApiKey(input),
    onSuccess: async (key) => {
      await queryClient.invalidateQueries({
        queryKey: ["settings", "api-keys"],
      });
      setCreatedKey(key);
      setShowSecret(true);
      createForm.reset({ name: "", environment: "live" });
      setCreateOpen(false);
      toast.success("API key created. Copy it now — it won’t be shown again.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => settingsClient.revokeApiKey(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings", "api-keys"],
      });
      setRevokeTarget(null);
      toast.success("API key revoked.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKeys = useMemo(
    () => (query.data ?? []).filter((key) => !key.revokedAt),
    [query.data],
  );
  const revokedKeys = useMemo(
    () => (query.data ?? []).filter((key) => key.revokedAt),
    [query.data],
  );

  return (
    <>
      <div className="grid gap-4">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="size-5" />
                </span>
                <div>
                  <CardTitle>API keys</CardTitle>
                  <CardDescription>
                    Authenticate machine-to-machine event ingestion with{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                      Authorization: Bearer
                    </code>{" "}
                    or{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                      X-API-Key
                    </code>
                    . Live keys map to production; test keys map to staging.
                  </CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                Create key
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {query.isLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Spinner />
              </div>
            ) : query.isError ? (
              <div className="p-5">
                <DataState
                  state="error"
                  title="Unable to load API keys"
                  onRetry={() => void query.refetch()}
                >
                  <span />
                </DataState>
              </div>
            ) : activeKeys.length === 0 && revokedKeys.length === 0 ? (
              <div className="grid place-items-center gap-3 p-10 text-center">
                <Shield className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No API keys yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a key for each environment or service that will send
                    events.
                  </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus /> Create your first key
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...activeKeys, ...revokedKeys].map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            key.environment === "test" ? "secondary" : "outline"
                          }
                          className="capitalize"
                        >
                          {key.environment === "test" ? "Test" : "Live"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {key.keyPrefix}…
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={key.revokedAt ? "secondary" : "success"}
                          className="capitalize"
                        >
                          {key.revokedAt ? "Revoked" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {relativeDate(key.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {relativeDate(key.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!key.revokedAt ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRevokeTarget(key)}
                          >
                            <Trash2 />
                            Revoke
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 border-dashed py-0">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Ingestion example</CardTitle>
            <CardDescription>
              Send events with your workspace API key so TemporalGuard can
              attribute them correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <pre className="overflow-x-auto rounded-xl bg-muted/50 p-4 font-mono text-xs leading-relaxed">
              {`NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
curl -X POST "$API_BASE/event-logs" \\
  -H "content-type: application/json" \\
  -H "x-api-key: tg_live_••••••••" \\
  -d "{
    "eventName": "document.uploaded",
    "externalWorkflowId": "doc_123",
    "timestamp": "$NOW",
    "payload": { "region": "eu-west-1" }
  }"`}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Choose live for production traffic or test for staging. The secret
              prefix matches the environment (`tg_live_` / `tg_test_`).
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={createForm.handleSubmit((values) =>
              createMutation.mutate(values),
            )}
          >
            <FormField
              label="Key name"
              error={createForm.formState.errors.name?.message}
            >
              <Input
                placeholder="Production ingestion"
                {...createForm.register("name")}
              />
            </FormField>
            <FormField
              label="Environment"
              error={createForm.formState.errors.environment?.message}
            >
              <NativeSelect
                className="w-full"
                value={createForm.watch("environment")}
                onChange={(event) =>
                  createForm.setValue(
                    "environment",
                    event.target.value as CreateApiKeyInput["environment"],
                    { shouldValidate: true },
                  )
                }
              >
                <NativeSelectOption value="live">
                  Live (production) — tg_live_…
                </NativeSelectOption>
                <NativeSelectOption value="test">
                  Test (staging) — tg_test_…
                </NativeSelectOption>
              </NativeSelect>
            </FormField>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner /> : <Plus />}
                Create key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdKey)}
        onOpenChange={(open) => {
          if (!open) setCreatedKey(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time the full secret is shown. Store it in your
              secrets manager before closing this dialog.
            </DialogDescription>
          </DialogHeader>
          {createdKey ? (
            <div className="grid gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  {createdKey.name}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code
                    className={cn(
                      "min-w-0 flex-1 break-all font-mono text-sm",
                      !showSecret && "blur-sm select-none",
                    )}
                  >
                    {createdKey.secret}
                  </code>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setShowSecret((value) => !value)}
                    aria-label={showSecret ? "Hide secret" : "Show secret"}
                  >
                    {showSecret ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(createdKey.secret);
                      toast.success("API key copied.");
                    }}
                    aria-label="Copy API key"
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Environment:{" "}
                <span className="font-medium capitalize">
                  {createdKey.environment}
                </span>
                . Pass as{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  Authorization: Bearer {createdKey.keyPrefix}…
                </code>{" "}
                on{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  POST /api/v1/events
                </code>
                .
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open && !revokeMutation.isPending) setRevokeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? `“${revokeTarget.name}” will stop authenticating immediately. Update any workers still using it first.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" />}
              disabled={revokeMutation.isPending}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!revokeTarget || revokeMutation.isPending}
              onClick={() => {
                if (!revokeTarget) return;
                revokeMutation.mutate(revokeTarget.id);
              }}
            >
              {revokeMutation.isPending ? <Spinner /> : <Trash2 />}
              Revoke key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsView() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage business details and API keys used to identify your workspace when sending events."
      />
      <Tabs defaultValue="business" className="gap-4">
        <TabsList>
          <TabsTrigger value="business" className="gap-1.5">
            <Building2 className="size-3.5" />
            Business
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5">
            <KeyRound className="size-3.5" />
            API keys
          </TabsTrigger>
        </TabsList>
        <TabsContent value="business" className="outline-none">
          <BusinessProfileCard />
        </TabsContent>
        <TabsContent value="api-keys" className="outline-none">
          <ApiKeysCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
