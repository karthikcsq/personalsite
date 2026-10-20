import type { Metadata } from "next";
import Link from "next/link";
import FounderBrief from "@/app/components/FounderBrief";
import MinimalInterior from "@/app/components/MinimalInterior";
import CorpusPageTransition from "@/app/components/CorpusPageTransition";
import styles from "./brief.module.css";

export const metadata: Metadata = {
  title: "For founders and hiring teams",
  description: "Karthik Thyagarajan's startup and founding-team experience, technical ownership, shipped products, and supporting evidence.",
  alternates: { canonical: "/brief" },
};

export default function BriefPage() {
  return (
    <CorpusPageTransition page="reader">
      <MinimalInterior page="work">
        <main className={styles.page}>
          <Link className={styles.back} href="/about">← About</Link>
          <h1>For founders and hiring teams</h1>
          <FounderBrief visible />
        </main>
      </MinimalInterior>
    </CorpusPageTransition>
  );
}
