import type { Metadata } from "next";
import { sectionMetadata } from "@/lib/og/sections";
import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export const metadata: Metadata = sectionMetadata("projects");

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage category="projects" searchParams={searchParams} />;
}
