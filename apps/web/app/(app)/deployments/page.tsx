import type { Metadata } from "next";
import { DeploymentsView } from "@/features/observability/deployments-view";

export const metadata: Metadata = { title: "Deployments" };
export default function Page() {
  return <DeploymentsView />;
}
