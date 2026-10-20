import type { Metadata } from "next";
import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export const metadata: Metadata = {
  title: "Work",
  alternates: { canonical: "/work" },
};

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage category="work" searchParams={searchParams} />;
}
