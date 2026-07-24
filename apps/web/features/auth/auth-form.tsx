"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { Field, Input } from "../../components/ui/input";
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
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-md)] border-2 border-destructive bg-destructive-subtle p-3 text-sm text-destructive shadow-[3px_3px_0_var(--shadow-ink)]"
      tabIndex={-1}
    >
      <p className="font-semibold">Please check the form</p>
      <ul className="mt-1 list-disc pl-5">
        {[...new Set(messages)].map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: (input: LoginInput) => authClient.login(input),
    onSuccess: () => router.push("/overview"),
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

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
      noValidate
    >
      <ErrorSummary messages={messages} />
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...form.register("email")}
        />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" />
          Keep me signed in
        </label>
        <span className="text-muted-foreground">
          Password reset coming soon
        </span>
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : null}
        {mutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to TemporalGuard?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create a workspace
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Mock mode: use any email and password. Use error@example.com to test an
        invalid login.
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

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
      noValidate
    >
      <ErrorSummary messages={messages} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          error={form.formState.errors.firstName?.message}
        >
          <Input autoComplete="given-name" {...form.register("firstName")} />
        </Field>
        <Field
          label="Last name"
          error={form.formState.errors.lastName?.message}
        >
          <Input autoComplete="family-name" {...form.register("lastName")} />
        </Field>
      </div>
      <Field label="Work email" error={form.formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...form.register("email")}
        />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-11"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {requirements.map(([met, label]) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                met
                  ? "bg-success-subtle text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {met ? <Check className="size-3" /> : null}
              {label}
            </span>
          ))}
        </div>
      </Field>
      <Field
        label="Business / workspace name"
        error={form.formState.errors.businessName?.message}
      >
        <Input
          autoComplete="organization"
          placeholder="Northstar Labs"
          {...form.register("businessName")}
        />
      </Field>
      <Field label="Business logo" error={fileError ?? undefined}>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        {preview && logo ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border-2 border-border bg-surface-subtle p-3 shadow-[3px_3px_0_var(--shadow-ink)]">
            <Image
              src={preview}
              alt="Business logo preview"
              width={56}
              height={56}
              unoptimized
              className="size-14 rounded-[var(--radius-md)] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{logo.name}</p>
              <p className="text-xs text-muted-foreground">
                {(logo.size / 1024).toFixed(0)} KB
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove logo"
              onClick={() => {
                form.setValue("logo", undefined);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="grid min-h-28 place-items-center rounded-[var(--radius-md)] border-[3px] border-dashed border-border-strong bg-surface-subtle p-4 text-center shadow-[3px_3px_0_var(--shadow-ink)] transition-[border,transform,box-shadow] duration-100 hover:-rotate-[0.4deg] hover:border-primary hover:shadow-[5px_5px_0_var(--shadow-ink)]"
            onClick={() => inputRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files[0]);
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            <span>
              <ImagePlus className="mx-auto mb-2 size-5 text-primary" />
              <span className="block text-sm font-medium">
                Drop a logo or choose a file
              </span>
              <span className="block text-xs text-muted-foreground">
                PNG, JPEG or WebP · maximum 5 MB
              </span>
            </span>
          </button>
        )}
      </Field>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          required
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>
          I agree to the placeholder Terms and Privacy Policy. Legal routes will
          be added before public launch.
        </span>
      </label>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {mutation.isPending ? "Creating workspace…" : "Create workspace"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function AuthVisual() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden border-l-[3px] border-dashed border-border bg-surface-subtle p-10 lg:flex lg:flex-col lg:justify-between">
      <div>
        <div className="inline-flex -rotate-1 items-center gap-2 rounded-[var(--radius-md)] border-2 border-border bg-primary-subtle px-3 py-1 text-sm font-medium text-primary-subtle-foreground shadow-[3px_3px_0_var(--shadow-ink)]">
          <ShieldCheck className="size-3.5" />
          Workflow reliability, made explicit
        </div>
        <h2 className="mt-7 max-w-lg text-4xl font-bold tracking-tight">
          See the business promise that infrastructure dashboards miss.
        </h2>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Define time-bound expectations, identify affected workflows, and
          investigate correlated technical evidence without losing context.
        </p>
      </div>
      <div className="relative mx-auto w-full max-w-xl rotate-1 rounded-[var(--radius-xl)] border-[3px] border-border bg-card p-6 shadow-[8px_8px_0_var(--shadow-ink)]">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 bg-muted/80"
        />
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <span className="font-medium">Document verification</span>
          </div>
          <span className="text-xs text-warning">02:18 remaining</span>
        </div>
        <div className="relative grid gap-5 pl-7">
          <div className="absolute top-2 bottom-2 left-2.5 w-px bg-border" />
          {[
            ["Document uploaded", "Completed", "success"],
            ["Virus scan completed", "Completed", "success"],
            ["Verification completed", "Waiting", "warning"],
          ].map(([label, state, tone]) => (
            <div
              key={label}
              className="relative flex items-center justify-between"
            >
              <span
                className={`absolute -left-6 size-3 rounded-full border-2 border-card ${
                  tone === "success" ? "bg-success" : "bg-warning"
                }`}
              />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{state}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Deterministic mock product data · real authentication backend available
        through an environment adapter
      </p>
    </div>
  );
}
