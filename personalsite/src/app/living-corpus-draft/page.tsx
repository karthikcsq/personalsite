import type { Metadata } from "next";
import LivingCorpusClient from "./LivingCorpusClient";
import { buildLivingCorpus } from "@/lib/living-corpus/buildLivingCorpus";
import {
  assertJourneyCoverage,
  buildJourneyBootstrap,
} from "@/lib/living-corpus/journeyData";
import { loadGalleryIndex } from "@/utils/galleryIndex";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Living corpus draft",
  robots: { index: false, follow: false },
};

export default async function LivingCorpusDraftPage() {
  const gallery = await loadGalleryIndex().catch(() => ({}));
  const corpus = buildLivingCorpus(gallery);
  assertJourneyCoverage(corpus);
  return (
    <LivingCorpusClient
      data={buildJourneyBootstrap(corpus)}
    />
  );
}
