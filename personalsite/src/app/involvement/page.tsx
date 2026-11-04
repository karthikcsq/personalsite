import type { Metadata } from "next";
import { sectionMetadata } from "@/lib/og/sections";
import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export const metadata: Metadata = sectionMetadata("involvement");

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage category="involvement" searchParams={searchParams} />;
}
