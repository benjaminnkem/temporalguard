import type { Metadata } from "next";
import { ComparisonsView } from "@/features/observability/comparisons-view";

export const metadata: Metadata = { title: "Comparisons" };
export default function Page() {
  return <ComparisonsView />;
}
