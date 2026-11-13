"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./corpus-article.module.css";

export type TocHeading = { id: string; text: string; level?: 2 | 3 };

// A heading counts as "current" once its top passes this fraction of the
// viewport, so the highlight changes as a section becomes the one being read.
const ACTIVE_LINE = 0.3;

/**
 * Contents for long essays and notes. On wide screens it is a sticky rail in
 * the left margin that tracks the section being read, scrolling itself to
 * keep that section's entry in view. On narrow screens it collapses
 * into a "Contents" disclosure above the text.
 */
export default function ArticleToc({ headings }: { headings: TocHeading[] }) {
  const [active, setActive] = useState<string | null>(null);
  const railRef = useRef<HTMLElement | null>(null);

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

  // When the rail is taller than the viewport, scroll the rail itself (never
  // the page) so the chapter being read stays in view.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !active || rail.scrollHeight <= rail.clientHeight) return;
    const link = rail.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`);
    if (!link) return;
    const linkTop = link.getBoundingClientRect().top - rail.getBoundingClientRect().top + rail.scrollTop;
    const target = linkTop - (rail.clientHeight - link.offsetHeight) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ top: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  const list = (
    <ol>
      {headings.map((heading) => (
        <li key={heading.id} data-level={heading.level ?? 2}>
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
        <nav ref={railRef} className={styles.tocRailInner} aria-label="Contents">
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
