import type { Metadata } from "next";
import { InvestigationDetailView } from "@/features/observability/investigation-detail-view";

export const metadata: Metadata = { title: "Investigation evidence" };
export default async function Page({
  params,
}: {
  params: Promise<{ investigationId: string }>;
}) {
  const { investigationId } = await params;
  return <InvestigationDetailView id={investigationId} />;
}
