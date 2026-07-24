import type { Metadata } from "next";
import { WorkflowsView } from "../../../features/workflows/workflows-view";

export const metadata: Metadata = { title: "Live workflows" };

export default function LivePage() {
  return <WorkflowsView live />;
}
