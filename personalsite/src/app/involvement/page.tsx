import type { Metadata } from "next";
import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export const metadata: Metadata = {
  title: "Involvement",
  alternates: { canonical: "/involvement" },
};

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage category="involvement" searchParams={searchParams} />;
}
