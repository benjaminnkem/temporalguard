import type { Metadata } from "next";
import { WorkflowDetailView } from "../../../../features/workflows/workflow-detail";

export const metadata: Metadata = { title: "Workflow detail" };

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return <WorkflowDetailView id={workflowId} />;
}
