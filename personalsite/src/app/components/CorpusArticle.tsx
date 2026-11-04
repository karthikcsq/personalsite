import type { ReactNode } from "react";
import Link from "next/link";
import type { MinimalCategory } from "@/lib/living-corpus/minimalTypes";
import RssLink from "./RssLink";
import MinimalInterior from "./MinimalInterior";
import CorpusPageTransition from "./CorpusPageTransition";
import ArticleToc, { type TocHeading } from "./ArticleToc";
import styles from "./corpus-article.module.css";

// Essays with fewer sections than this read fine without a contents list.
const MIN_TOC_HEADINGS = 4;

export default function CorpusArticle({
  category, title, meta, summary, children, showRss = false, essay = false, headings = [], footer,
}: {
  category: MinimalCategory;
  title: string;
  meta?: ReactNode;
  summary?: string;
  children: ReactNode;
  showRss?: boolean;
  /** Long-form reading treatment: serif body, sky fades out behind the text. */
  essay?: boolean;
  /** Section headings for the contents rail (essay only). */
  headings?: TocHeading[];
  footer?: ReactNode;
}) {
  const showToc = essay && headings.length >= MIN_TOC_HEADINGS;
  return (
    <CorpusPageTransition page="reader">
      <MinimalInterior page={category} readingVeil={essay}>
        <main className={styles.article} data-essay={essay || undefined}>
          <div className={styles.actions}>
            <Link className={styles.back} href={`/${category}`}>← {category}</Link>
            {showRss ? <RssLink /> : null}
          </div>
          <header className={styles.heading}>
            {meta ? <p className={styles.meta}>{meta}</p> : null}
            <h1>{title}</h1>
            {summary ? <p className={styles.summary}>{summary}</p> : null}
          </header>
          <div className={styles.body}>
            {showToc ? <ArticleToc headings={headings} /> : null}
            <div className={styles.content}>{children}</div>
          </div>
          {footer}
        </main>
      </MinimalInterior>
    </CorpusPageTransition>
  );
}
