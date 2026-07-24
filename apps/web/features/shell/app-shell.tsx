"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  CircleDot,
  Command,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Pause,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useUiStore } from "../../stores/ui-store";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/surface";
import { ThemeSwitch } from "../../components/shared/theme-switch";
import { cn } from "../../lib/utils";

const navigation = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Activity },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/violations", label: "Violations", icon: AlertTriangle },
  { href: "/explore", label: "Explore", icon: FlaskConical },
  { href: "/rules", label: "Rules", icon: ShieldCheck },
];

const deferred = [
  { label: "Alerts", icon: Bell },
  { label: "Integrations", icon: CircleDot },
  { label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <Link href="/overview" className="flex items-center gap-2.5 font-semibold">
      <span className="grid size-9 -rotate-2 place-items-center rounded-[var(--radius-md)] border-2 border-border bg-primary text-lg font-bold text-primary-foreground shadow-[3px_3px_0_var(--shadow-ink)] transition-transform duration-100 hover:rotate-1">
        T
      </span>
      <span>TemporalGuard</span>
    </Link>
  );
}

function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const close = useUiStore((state) => state.setSidebarOpen);
  return (
    <aside
      className={cn(
        "flex h-full w-[var(--sidebar-width)] flex-col border-r-2 border-border bg-surface",
        mobile ? "w-full border-r-0" : "hidden lg:flex",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b-2 border-dashed border-border px-4">
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
                  "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border-2 border-transparent px-3 text-base font-medium text-muted-foreground transition-[background,border,transform,box-shadow] duration-100 hover:rotate-[0.3deg] hover:border-border hover:bg-warning-subtle hover:text-foreground",
                  active &&
                    "-rotate-[0.5deg] border-border bg-primary-subtle text-primary-subtle-foreground shadow-[3px_3px_0_var(--shadow-ink)] before:h-4 before:w-0.5 before:rounded-full before:bg-primary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </div>
        <p className="mt-6 px-2 pb-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Configure
        </p>
        <div className="grid gap-1">
          {deferred.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm text-muted-foreground"
            >
              <Icon className="size-[18px]" />
              <span>{label}</span>
              <Badge className="ml-auto">Soon</Badge>
            </div>
          ))}
        </div>
      </nav>
      <div className="border-t-2 border-dashed border-border p-3">
        <button className="flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 text-left hover:bg-muted">
          <span className="grid size-9 place-items-center rounded-full bg-primary-subtle font-semibold text-primary-subtle-foreground">
            AO
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              Ada Okafor
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Northstar Labs
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
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
    <label className="hidden min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-border bg-surface px-2 shadow-[2px_2px_0_var(--shadow-ink)] xl:flex">
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

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(85vw,280px)] lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Sidebar mobile />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b-2 border-dashed border-border bg-background/95 px-3 sm:px-5">
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
              Northstar Labs
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
            <Button size="icon" variant="ghost" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed top-[15vh] left-1/2 z-50 w-[min(92vw,620px)] -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border-2 border-border bg-popover shadow-[8px_8px_0_var(--shadow-ink)]">
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Command className="size-4 text-muted-foreground" />
              <input
                autoFocus
                className="h-12 flex-1 bg-transparent outline-none"
                placeholder="Search workflows, violations, or navigate…"
              />
            </div>
            <div className="p-2">
              <p className="px-2 py-2 text-xs font-medium text-muted-foreground">
                Navigate
              </p>
              {navigation.map(({ href, label, icon: Icon }) => (
                <Link
                  href={href}
                  key={href}
                  onClick={() => setCommandOpen(false)}
                  className="flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 hover:bg-muted"
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border px-3 py-3 text-xs text-muted-foreground">
                Search is local deterministic mock data in this release.
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
