import CorpusLandingPage, { type CorpusSearchParams } from "@/app/components/CorpusLandingPage";

export default function Page({ searchParams }: { searchParams: Promise<CorpusSearchParams> }) {
  return <CorpusLandingPage searchParams={searchParams} />;
}
