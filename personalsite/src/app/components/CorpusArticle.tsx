import type { ReactNode } from "react";
import Link from "next/link";
import type { MinimalCategory } from "@/lib/living-corpus/minimalTypes";
import MinimalInterior from "./MinimalInterior";
import CorpusPageTransition from "./CorpusPageTransition";
import styles from "./corpus-article.module.css";

export default function CorpusArticle({
  category, title, meta, summary, children,
}: {
  category: MinimalCategory;
  title: string;
  meta?: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <CorpusPageTransition page="reader">
      <MinimalInterior page={category}>
        <main className={styles.article}>
          <Link className={styles.back} href={`/?section=${category}`}>← {category}</Link>
          <header className={styles.heading}>
            {meta ? <p className={styles.meta}>{meta}</p> : null}
            <h1>{title}</h1>
            {summary ? <p className={styles.summary}>{summary}</p> : null}
          </header>
          <div className={styles.content}>{children}</div>
        </main>
      </MinimalInterior>
    </CorpusPageTransition>
  );
}
