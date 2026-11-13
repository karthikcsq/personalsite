import type { Metadata } from "next";
import { sectionMetadata } from "@/lib/og/sections";
import FounderBrief from "@/app/components/FounderBrief";
import CorpusArticle from "@/app/components/CorpusArticle";
import styles from "./brief.module.css";

export const metadata: Metadata = sectionMetadata("brief");

export default function BriefPage() {
  return (
    <CorpusArticle back="/" title="For founders and hiring teams">
      <div className={styles.brief}>
        <FounderBrief visible />
      </div>
    </CorpusArticle>
  );
}
