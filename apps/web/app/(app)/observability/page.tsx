import type { Metadata } from "next";
import { ObservabilityView } from "@/features/observability/observability-view";

export const metadata: Metadata = { title: "Observability" };
export default function Page() {
  return <ObservabilityView />;
}
