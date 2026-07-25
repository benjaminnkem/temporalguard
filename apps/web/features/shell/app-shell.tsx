"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Pause,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { authClient, type AuthSession } from "../auth/auth";

const navigation = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Activity },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/events", label: "Events", icon: Database },
  { href: "/violations", label: "Violations", icon: AlertTriangle },
  { href: "/explore", label: "Explore", icon: FlaskConical },
  { href: "/rules", label: "Rules", icon: ShieldCheck },
] as const;

const utilityNavigation = [
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const environmentOptions = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "all", label: "All" },
] as const;

const rangeOptions = [
  { value: "last_24_hours", label: "Last 24 hours" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
] as const;

const compareOptions = [
  { value: "previous_period", label: "Previous period" },
  { value: "previous_week", label: "Previous week" },
  { value: "none", label: "None" },
] as const;

function AppSidebar({ session }: { session?: AuthSession | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useMutation({
    mutationFn: () => authClient.logout(),
    onSettled: () => router.replace("/login"),
  });
  const initials = session
    ? `${session.user.firstName.charAt(0)}${session.user.lastName.charAt(0)}`
    : "—";
  const fullName = session
    ? `${session.user.firstName} ${session.user.lastName}`
    : "Loading…";

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-active:bg-transparent"
              render={<Link href="/overview" />}
            >
              <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                T
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">TemporalGuard</span>
                <span className="truncate text-xs text-muted-foreground">
                  Workflow reliability
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analyze</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/overview" && pathname.startsWith(`${href}/`));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={<Link href={href} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          {utilityNavigation.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={label}
                  render={<Link href={href} />}
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-active:bg-sidebar-accent"
                  />
                }
              >
                <Avatar size="sm" className="rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {session?.workspace.name ?? "TemporalGuard"}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-xl"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar size="sm" className="rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{fullName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session?.user.email ?? "—"}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={logout.isPending}
                    onClick={() => logout.mutate()}
                  >
                    <LogOut />
                    {logout.isPending ? "Signing out…" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ContextSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger size="sm" className={cn("min-w-36", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = [...navigation, ...utilityNavigation].filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18vh] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="Navigate to a product area…"
          />
          <Badge variant="outline" className="shrink-0 font-normal">
            Esc
          </Badge>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Navigate
          </p>
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No matching destinations.
            </p>
          ) : (
            filtered.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant="ghost"
                className="h-10 w-full justify-start gap-3 rounded-xl px-3"
                render={<Link href={href} />}
                onClick={() => onOpenChange(false)}
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const livePaused = useUiStore((state) => state.livePaused);
  const toggleLive = useUiStore((state) => state.toggleLive);
  const sessionQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authClient.me(),
    retry: false,
  });
  const queryClient = useQueryClient();

  const updateContext = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  useEffect(() => {
    if (sessionQuery.isError) router.replace("/login");
  }, [router, sessionQuery.isError]);

  useEffect(() => {
    if (livePaused || !sessionQuery.data) return;
    const source = new EventSource(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api"}/workflows/stream`,
      { withCredentials: true },
    );
    const seen = new Set<string>();
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as {
          type?: string;
          payload?: { workflowId?: string; violationId?: string };
        };
        if (!event.type || event.type === "heartbeat") return;
        const identity =
          event.payload?.workflowId ??
          event.payload?.violationId ??
          `${event.type}:${message.lastEventId}`;
        if (seen.has(identity)) return;
        seen.add(identity);
        if (seen.size > 200) seen.delete(seen.values().next().value ?? "");
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["workflows"] }),
          queryClient.invalidateQueries({ queryKey: ["violations"] }),
          queryClient.invalidateQueries({ queryKey: ["events"] }),
        ]);
      } catch {
        // Ignore malformed SSE payloads from the live stream.
      }
    };
    return () => source.close();
  }, [livePaused, queryClient, sessionQuery.data]);

  return (
    <SidebarProvider>
      <AppSidebar session={sessionQuery.data} />
      <SidebarInset className="max-h-svh overflow-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden max-w-48 sm:inline-flex"
                />
              }
            >
              <span className="size-2 shrink-0 rounded-full bg-primary" />
              <span className="truncate">
                {sessionQuery.data?.workspace.name ?? "Workspace"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuItem disabled>
                  {sessionQuery.data?.workspace.name ?? "TemporalGuard"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden items-center gap-2 lg:flex">
            <ContextSelect
              value={searchParams.get("environment") ?? "production"}
              options={environmentOptions}
              onChange={(value) => updateContext("environment", value)}
            />
            <ContextSelect
              value={searchParams.get("range") ?? "last_24_hours"}
              options={rangeOptions}
              onChange={(value) => updateContext("range", value)}
            />
            <ContextSelect
              value={searchParams.get("compare") ?? "previous_period"}
              options={compareOptions}
              onChange={(value) => updateContext("compare", value)}
              className="hidden xl:flex"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLive}
              aria-pressed={!livePaused}
              className="hidden sm:inline-flex"
            >
              {livePaused ? <Play /> : <Pause />}
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  livePaused ? "bg-muted-foreground" : "live-dot bg-success",
                )}
              />
              {livePaused ? "Resume" : "Live"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden min-w-44 justify-start text-muted-foreground md:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search />
              <span className="flex-1 text-left">Search</span>
              <kbd className="pointer-events-none rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setCommandOpen(true)}
              aria-label="Open search"
            >
              <Search />
            </Button>
            <ThemeSwitch />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </SidebarInset>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  );
}
