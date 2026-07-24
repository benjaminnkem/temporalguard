"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  authClient,
  loginSchema,
  signupSchema,
  validateLogo,
  type LoginInput,
  type SignupInput,
} from "./auth";

function ErrorSummary({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  const unique = [...new Set(messages)];
  return (
    <div
      role="alert"
      tabIndex={-1}
      className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <p className="font-medium">Please check the form</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-destructive/90">
        {unique.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: (input: LoginInput) => authClient.login(input),
    onSuccess: () => {
      const returnTo = searchParams.get("returnTo");
      router.push(
        returnTo?.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : "/overview",
      );
    },
  });
  const serverError =
    mutation.error?.message === "AUTH_INVALID_CREDENTIALS"
      ? "Email or password is incorrect."
      : mutation.error
        ? "We could not sign you in. Check your connection and try again."
        : null;
  const messages = [
    ...Object.values(form.formState.errors)
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
    ...(serverError ? [serverError] : []),
  ];
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
      noValidate
    >
      <ErrorSummary messages={messages} />
      <FieldGroup className="gap-4">
        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={emailError ? true : undefined}
            {...form.register("email")}
          />
          <FieldError>{emailError}</FieldError>
        </Field>
        <Field data-invalid={passwordError ? true : undefined}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={passwordError ? true : undefined}
              {...form.register("password")}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError>{passwordError}</FieldError>
        </Field>
        <Field orientation="horizontal" className="items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked === true)}
          />
          <Label htmlFor="remember-me" className="font-normal text-muted-foreground">
            Keep me signed in
          </Label>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Spinner /> : null}
        {mutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
      <Separator />
      <p className="text-center text-sm text-muted-foreground">
        New to TemporalGuard?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create a workspace
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [authorized, setAuthorized] = useState(false);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      businessName: "",
    },
  });
  const logo = form.watch("logo");
  const password = form.watch("password");

  useEffect(() => {
    if (!logo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(logo);
    setPreview(url);
    setUploadProgress(20);
    const timer = window.setInterval(
      () => setUploadProgress((value) => Math.min(value + 20, 100)),
      120,
    );
    return () => {
      URL.revokeObjectURL(url);
      window.clearInterval(timer);
    };
  }, [logo]);

  const mutation = useMutation({
    mutationFn: (input: SignupInput) => authClient.signup(input),
    onSuccess: () => router.push("/overview"),
  });
  const serverError =
    mutation.error?.message === "AUTH_EMAIL_ALREADY_EXISTS"
      ? "An account already exists for this email."
      : mutation.error
        ? "Workspace creation failed. Your draft is preserved; try again."
        : null;
  const messages = [
    ...Object.values(form.formState.errors)
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
    ...(fileError ? [fileError] : []),
    ...(serverError ? [serverError] : []),
    ...(!authorized && form.formState.isSubmitted
      ? ["Confirm you are authorized to create this workspace."]
      : []),
  ];
  const requirements = [
    [password.length >= 12, "12 characters"],
    [/[A-Z]/.test(password), "uppercase"],
    [/[a-z]/.test(password), "lowercase"],
    [/\d/.test(password), "number"],
  ] as const;

  const chooseFile = (file?: File) => {
    if (!file) return;
    const error = validateLogo(file);
    setFileError(error);
    if (!error) form.setValue("logo", file, { shouldValidate: true });
  };

  const firstNameError = form.formState.errors.firstName?.message;
  const lastNameError = form.formState.errors.lastName?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  const businessError = form.formState.errors.businessName?.message;

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((input) => {
        if (!authorized) return;
        mutation.mutate(input);
      })}
      noValidate
    >
      <ErrorSummary messages={messages} />
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={firstNameError ? true : undefined}>
            <FieldLabel htmlFor="signup-first-name">First name</FieldLabel>
            <Input
              id="signup-first-name"
              autoComplete="given-name"
              placeholder="Ada"
              aria-invalid={firstNameError ? true : undefined}
              {...form.register("firstName")}
            />
            <FieldError>{firstNameError}</FieldError>
          </Field>
          <Field data-invalid={lastNameError ? true : undefined}>
            <FieldLabel htmlFor="signup-last-name">Last name</FieldLabel>
            <Input
              id="signup-last-name"
              autoComplete="family-name"
              placeholder="Okafor"
              aria-invalid={lastNameError ? true : undefined}
              {...form.register("lastName")}
            />
            <FieldError>{lastNameError}</FieldError>
          </Field>
        </div>
        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor="signup-email">Work email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={emailError ? true : undefined}
            {...form.register("email")}
          />
          <FieldError>{emailError}</FieldError>
        </Field>
        <Field data-invalid={passwordError ? true : undefined}>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              aria-invalid={passwordError ? true : undefined}
              {...form.register("password")}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {requirements.map(([met, label]) => (
              <Badge key={label} variant={met ? "success" : "secondary"}>
                {met ? <Check className="size-3" /> : null}
                {label}
              </Badge>
            ))}
          </div>
          <FieldError>{passwordError}</FieldError>
        </Field>
        <Field data-invalid={businessError ? true : undefined}>
          <FieldLabel htmlFor="signup-business">Business / workspace name</FieldLabel>
          <Input
            id="signup-business"
            autoComplete="organization"
            placeholder="Acme Inc."
            aria-invalid={businessError ? true : undefined}
            {...form.register("businessName")}
          />
          <FieldError>{businessError}</FieldError>
        </Field>
        <Field data-invalid={fileError ? true : undefined}>
          <FieldLabel>Business logo</FieldLabel>
          <FieldDescription>Optional. PNG, JPEG, or WebP up to 5 MB.</FieldDescription>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
          {preview && logo ? (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 ring-1 ring-foreground/10">
              <Image
                src={preview}
                alt="Business logo preview"
                width={56}
                height={56}
                unoptimized
                className="size-14 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{logo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(logo.size / 1024).toFixed(0)} KB
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Remove logo"
                onClick={() => {
                  form.setValue("logo", undefined);
                  setFileError(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="grid min-h-28 w-full place-items-center rounded-2xl border border-dashed border-input bg-muted/40 p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/70"
              onClick={() => inputRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                chooseFile(event.dataTransfer.files[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
            >
              <span>
                <ImagePlus className="mx-auto mb-2 size-5 text-muted-foreground" />
                <span className="block text-sm font-medium">
                  Drop a logo or choose a file
                </span>
                <span className="block text-xs text-muted-foreground">
                  PNG, JPEG or WebP · maximum 5 MB
                </span>
              </span>
            </button>
          )}
          <FieldError>{fileError}</FieldError>
        </Field>
        <Field orientation="horizontal" className="items-start gap-2.5">
          <Checkbox
            id="signup-authorized"
            checked={authorized}
            onCheckedChange={(checked) => setAuthorized(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="signup-authorized"
            className="text-xs leading-relaxed font-normal text-muted-foreground"
          >
            I confirm that I am authorized to create this workspace for my
            organization.
          </Label>
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Spinner /> : <Upload />}
        {mutation.isPending ? "Creating workspace…" : "Create workspace"}
      </Button>
      <Separator />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function AuthVisual() {
  const steps = [
    { label: "Document uploaded", state: "Completed", tone: "success" as const },
    { label: "Virus scan completed", state: "Completed", tone: "success" as const },
    { label: "Verification completed", state: "Waiting", tone: "warning" as const },
  ];

  return (
    <div className="relative hidden min-h-screen overflow-hidden border-l border-border bg-muted/30 p-10 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)/8%,transparent_55%)]" />
      <div className="relative">
        <Badge variant="outline" className="h-7 gap-1.5 px-3">
          <ShieldCheck className="size-3.5" />
          Workflow reliability, made explicit
        </Badge>
        <h2 className="mt-7 max-w-lg text-4xl font-semibold tracking-tight">
          See the business promise that infrastructure dashboards miss.
        </h2>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Define time-bound expectations, identify affected workflows, and
          investigate correlated technical evidence without losing context.
        </p>
      </div>
      <Card className="relative mx-auto w-full max-w-xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </span>
              <div>
                <CardTitle className="text-sm">Document verification</CardTitle>
                <CardDescription className="text-xs">
                  Live workflow preview
                </CardDescription>
              </div>
            </div>
            <Badge variant="warning">02:18 remaining</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative grid gap-5 pl-7">
            <div className="absolute top-2 bottom-2 left-2.5 w-px bg-border" />
            {steps.map((step) => (
              <div
                key={step.label}
                className="relative flex items-center justify-between gap-3"
              >
                <span
                  className={`absolute -left-6 size-3 rounded-full border-2 border-card ${
                    step.tone === "success" ? "bg-success" : "bg-warning"
                  }`}
                />
                <span className="text-sm font-medium">{step.label}</span>
                <Badge variant={step.tone === "success" ? "success" : "warning"}>
                  {step.state}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <p className="relative text-xs text-muted-foreground">
        Authenticated · workspace-scoped · evidence-led
      </p>
    </div>
  );
}
