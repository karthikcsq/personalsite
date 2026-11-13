import type { ReactNode } from "react";
import { display, mono } from "@/app/_home/fonts";
import RssLink from "./RssLink";
import BackLink from "./BackLink";
import ArticleToc, { type TocHeading } from "./ArticleToc";
import styles from "./corpus-article.module.css";
import PageTransition, { SharedTitle, titleName } from "@/app/_home/PageTransition";

// Pages with fewer headings than this (sections and subsections together)
// read fine without a contents list.
const MIN_TOC_HEADINGS = 4;

/** The paper sheet the reading pages sit on: the home page's tokens and faces. */
export function PaperPage({ children }: { children: ReactNode }) {
  return <div className={`${display.variable} ${mono.variable} ${styles.paper}`}>{children}</div>;
}

export default function CorpusArticle({
  back, title, titleId, meta, summary, media, children, showRss = false, headings = [], minTocHeadings = MIN_TOC_HEADINGS, footer,
}: {
  /** Where "← Karthik Thyagarajan" returns to on the home page. */
  back: string;
  title: string;
  /** The artifact this page is about; its title morphs from the home page. */
  titleId?: string;
  meta?: ReactNode;
  summary?: string;
  children: ReactNode;
  /** Shown under the title, before the text (e.g. a project's video). */
  media?: ReactNode;
  showRss?: boolean;
  /** Section headings for the contents list in the left margin. */
  headings?: TocHeading[];
  minTocHeadings?: number;
  footer?: ReactNode;
}) {
  const showToc = headings.length >= minTocHeadings;
  return (
    <PageTransition>
    <PaperPage>
      <main className={styles.article}>
        <div className={styles.actions}>
          <BackLink className={styles.back} href={back} />
          {showRss ? <span className={styles.rss}><RssLink /></span> : null}
        </div>
        <header className={styles.heading}>
          {titleId ? <SharedTitle name={titleName(titleId)}><h1>{title}</h1></SharedTitle> : <h1>{title}</h1>}
          {meta ? <p className={styles.meta}>{meta}</p> : null}
          {summary ? <p className={styles.summary}>{summary}</p> : null}
        </header>
        {media ? <div className={styles.media}>{media}</div> : null}
        <div className={styles.body}>
          {showToc ? <ArticleToc headings={headings} /> : null}
          <div className={styles.content}>{children}</div>
        </div>
        {footer}
      </main>
    </PaperPage>
    </PageTransition>
  );
}
