import type { Metadata } from "next";
import { SimulationsView } from "@/features/observability/simulations-view";

export const metadata: Metadata = { title: "Historical simulations" };
export default function Page() {
  return <SimulationsView />;
}
