import type { Metadata } from "next";
import { sectionMetadata } from "@/lib/og/sections";
import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export const metadata: Metadata = sectionMetadata("writing");

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage category="writing" searchParams={searchParams} />;
}
