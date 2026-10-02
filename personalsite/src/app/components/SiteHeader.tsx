"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import CorpusNavigation, { type CorpusDestination } from "./CorpusNavigation";
import styles from "./site-header.module.css";

export default function SiteHeader({
  current,
}: {
  current?: CorpusDestination | null;
}) {
  return (
    <header className={styles.header}>
      <ViewTransition name="corpus-identity" share="corpus-identity" default="none">
        <Link href="/" className={styles.identity} aria-label="Karthik Thyagarajan, home">
          Karthik Thyagarajan
        </Link>
      </ViewTransition>
      <CorpusNavigation compact current={current} />
    </header>
  );
}
