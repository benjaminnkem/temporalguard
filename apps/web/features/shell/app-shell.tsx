"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Command,
  Database,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUiStore } from "../../stores/ui-store";
import { Button } from "../../components/ui/button";
import { ThemeSwitch } from "../../components/shared/theme-switch";
import { cn } from "../../lib/utils";
import { authClient, type AuthSession } from "../auth/auth";

const navigation = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Activity },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/events", label: "Events", icon: Database },
  { href: "/violations", label: "Violations", icon: AlertTriangle },
  { href: "/explore", label: "Explore", icon: FlaskConical },
  { href: "/rules", label: "Rules", icon: ShieldCheck },
];

function Brand() {
  return (
    <Link href="/overview" className="flex items-center gap-2.5 font-semibold">
      <span className="grid size-9 place-items-center border border-primary bg-primary font-mono text-sm font-bold text-primary-foreground">
        T
      </span>
      <span>TemporalGuard</span>
    </Link>
  );
}

function Sidebar({
  mobile = false,
  session,
}: {
  mobile?: boolean;
  session?: AuthSession | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const close = useUiStore((state) => state.setSidebarOpen);
  const logout = useMutation({
    mutationFn: () => authClient.logout(),
    onSettled: () => router.replace("/login"),
  });
  const initials = session
    ? `${session.user.firstName.charAt(0)}${session.user.lastName.charAt(0)}`
    : "—";
  return (
    <aside
      className={cn(
        "flex w-[var(--sidebar-width)] flex-col border-r border-border-strong bg-surface h-screen",
        mobile ? "w-full border-r-0" : "hidden lg:flex",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border-strong px-4">
        <Brand />
        {mobile ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => close(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <nav
        className="scrollbar-thin flex-1 overflow-y-auto p-3"
        aria-label="Main"
      >
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Analyze
        </p>
        <div className="grid gap-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/overview" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => close(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 border-l-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors duration-100 hover:border-primary hover:bg-primary-subtle hover:text-foreground",
                  active &&
                    "border-primary bg-primary-subtle text-primary-subtle-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-border-strong p-3">
        <div className="flex w-full items-center gap-3 p-2">
          <span className="grid size-9 place-items-center border border-primary bg-primary-subtle font-mono text-xs font-semibold text-primary-subtle-foreground">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {session
                ? `${session.user.firstName} ${session.user.lastName}`
                : "Loading session…"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {session?.workspace.name ?? "TemporalGuard"}
            </span>
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Sign out"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ContextSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="hidden min-h-11 items-center gap-1.5 border border-border-strong bg-surface px-2 xl:flex">
      <span className="sr-only">{label}</span>
      <select
        className="h-8 bg-transparent text-xs font-medium outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option
            key={option}
            value={option.toLowerCase().replaceAll(" ", "_")}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const livePaused = useUiStore((state) => state.livePaused);
  const toggleLive = useUiStore((state) => state.toggleLive);
  const [commandSearch, setCommandSearch] = useState("");
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
        // EventSource reconnects automatically; malformed messages are ignored.
      }
    };
    return () => source.close();
  }, [livePaused, queryClient, sessionQuery.data]);

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar session={sessionQuery.data} />
      <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(85vw,280px)] lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Sidebar mobile session={sessionQuery.data} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="min-w-0 flex-1 max-h-screen overflow-y-scroll">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border-strong bg-background/95 px-3 sm:px-5">
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden items-center gap-2 xl:flex">
            <button className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm font-medium">
              <span className="size-2 rounded-full bg-primary" />
              {sessionQuery.data?.workspace.name ?? "Workspace"}
              <ChevronDown className="size-3.5" />
            </button>
          </div>
          <ContextSelect
            label="Environment"
            value={searchParams.get("environment") ?? "production"}
            options={["Production", "Staging", "All"]}
            onChange={(value) => updateContext("environment", value)}
          />
          <ContextSelect
            label="Time range"
            value={searchParams.get("range") ?? "last_24_hours"}
            options={["Last 24 hours", "Last 7 days", "Last 30 days"]}
            onChange={(value) => updateContext("range", value)}
          />
          <ContextSelect
            label="Comparison"
            value={searchParams.get("compare") ?? "previous_period"}
            options={["Previous period", "Previous week", "None"]}
            onChange={(value) => updateContext("compare", value)}
          />
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLive}
              aria-pressed={!livePaused}
              className="hidden sm:inline-flex"
            >
              {livePaused ? (
                <Play className="size-3.5" />
              ) : (
                <Pause className="size-3.5" />
              )}
              <motion.span
                layout
                className={cn(
                  "size-1.5 rounded-full",
                  livePaused ? "bg-muted-foreground" : "live-dot bg-success",
                )}
              />
              {livePaused ? "Resume" : "Live"}
            </Button>
            <Button
              variant="secondary"
              className="hidden min-w-48 justify-start text-muted-foreground sm:flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-4" />
              Search
              <kbd className="ml-auto font-mono text-[10px]">⌘ K</kbd>
            </Button>
            <ThemeSwitch />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed top-[15vh] left-1/2 z-50 w-[min(92vw,620px)] -translate-x-1/2 overflow-hidden border border-border-strong bg-popover">
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Command className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={commandSearch}
                onChange={(event) => setCommandSearch(event.target.value)}
                className="h-12 flex-1 bg-transparent outline-none"
                placeholder="Navigate to a product area…"
              />
            </div>
            <div className="p-2">
              <p className="px-2 py-2 text-xs font-medium text-muted-foreground">
                Navigate
              </p>
              {navigation
                .filter((item) =>
                  item.label
                    .toLowerCase()
                    .includes(commandSearch.trim().toLowerCase()),
                )
                .map(({ href, label, icon: Icon }) => (
                  <Link
                    href={href}
                    key={href}
                    onClick={() => {
                      setCommandOpen(false);
                      setCommandSearch("");
                    }}
                    className="flex min-h-10 items-center gap-3 px-3 hover:bg-muted"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
