import type { Metadata } from "next";
import { InvestigationsView } from "@/features/observability/investigations-view";

export const metadata: Metadata = { title: "Investigations" };
export default function Page() {
  return <InvestigationsView />;
}
