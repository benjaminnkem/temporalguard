import type { Metadata } from "next";
import { ViolationDetailView } from "../../../../features/violations/violation-detail";

export const metadata: Metadata = { title: "Violation detail" };

export default async function ViolationDetailPage({
  params,
}: {
  params: Promise<{ violationId: string }>;
}) {
  const { violationId } = await params;
  return <ViolationDetailView id={violationId} />;
}
