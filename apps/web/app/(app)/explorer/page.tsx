import type { Metadata } from "next";
import { ExplorerView } from "@/features/observability/explorer-view";

export const metadata: Metadata = { title: "Telemetry explorer" };
export default function Page() {
  return <ExplorerView />;
}
