"use client";

import { useEffect, useState } from "react";
import styles from "./corpus-article.module.css";

export type TocHeading = { id: string; text: string };

// A heading counts as "current" once its top passes this fraction of the
// viewport, so the highlight changes as a section becomes the one being read.
const ACTIVE_LINE = 0.3;

/**
 * Contents for long essays. On wide screens it is a sticky rail in the left
 * margin that tracks the section being read. On narrow screens it collapses
 * into a "Contents" disclosure above the text.
 */
export default function ArticleToc({ headings }: { headings: TocHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * ACTIVE_LINE;
      let current: string | null = null;
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  const list = (
    <ol>
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            aria-current={active === heading.id ? "location" : undefined}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <aside className={styles.tocRail}>
        <nav className={styles.tocRailInner} aria-label="Contents">
          <p>Contents</p>
          {list}
        </nav>
      </aside>
      <details className={styles.tocInline}>
        <summary>Contents</summary>
        <nav aria-label="Contents">{list}</nav>
      </details>
    </>
  );
}
