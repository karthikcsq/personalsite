import type { Metadata } from "next";
import LivingCorpusClient from "./LivingCorpusClient";
import { buildMinimalCorpusItems } from "@/lib/living-corpus/minimalHomepage";

export const metadata: Metadata = {
  title: "Living corpus draft",
  robots: { index: false, follow: false },
};

export default function LivingCorpusDraftPage() {
  return <LivingCorpusClient items={buildMinimalCorpusItems()} />;
}
