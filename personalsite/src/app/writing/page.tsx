import type { Metadata } from "next";
import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export const metadata: Metadata = {
  title: "Writing",
  alternates: { canonical: "/writing" },
};

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage category="writing" searchParams={searchParams} />;
}
