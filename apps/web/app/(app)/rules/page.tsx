import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../../components/shared/page-header";
import { Button } from "../../../components/ui/button";
import { Badge, Card } from "../../../components/ui/surface";

export const metadata: Metadata = { title: "Rules" };

const rules = [
  ["Documents verified within 10m", "all", "critical", "active", "96.8%"],
  ["Decision issued within 4h", "sequence", "critical", "active", "91.2%"],
  ["No processing after withdrawal", "forbid", "critical", "active", "99.1%"],
  ["Video publish sequence", "sequence", "warning", "paused", "97.4%"],
];

export default function RulesPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Policy"
        title="Rules"
        description="Time-bound expectations that turn event streams into explainable workflow health."
        actions={
          <Button asChild variant="primary">
            <Link href="/explore">
              <Plus className="size-4" /> New rule
            </Link>
          </Button>
        }
      />
      <div className="grid gap-3">
        {rules.map(([name, operator, severity, status, completion]) => (
          <Card
            key={name}
            className="grid gap-4 p-4 transition-colors hover:border-border-strong sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-primary-subtle text-primary-subtle-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <Link
                  href="/explore"
                  className="font-semibold hover:text-primary"
                >
                  {name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Production · updated 18 minutes ago
                </p>
              </div>
            </div>
            <Badge tone="primary">{operator}</Badge>
            <Badge tone={severity === "critical" ? "danger" : "warning"}>
              {severity}
            </Badge>
            <div className="text-right">
              <p className="font-semibold tabular-nums">{completion}</p>
              <p className="text-[10px] text-muted-foreground">
                completion · {status}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
