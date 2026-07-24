import type { Metadata } from "next";
import { ViolationsView } from "@/features/violations/violations-view";

export const metadata: Metadata = { title: "Violations" };

export default function ViolationsPage() {
  return <ViolationsView />;
}
