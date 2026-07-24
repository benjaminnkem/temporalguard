import type { Metadata } from "next";
import { RuleBuilder } from "@/features/query-builder/rule-builder";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return <RuleBuilder />;
}
