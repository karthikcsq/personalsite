"use client";
import { useEffect } from "react";

// Scrolls the current page to the element matching window.location.hash after
// mount. Works around a Next.js App Router quirk where client-side navigation
// to `/page#anchor` scrolls using the previous page's layout instead of the
// newly-loaded page's, landing at the wrong position. Direct URL entry works
// fine because the browser waits for the full page to load before scrolling.
//
// Drop this component anywhere on pages that accept hash anchors. It renders
// nothing, just installs the scroll behavior.
//
// `offsetPx` accounts for the sticky navbar height so the target element
// isn't hidden behind it.
export function HashScroller({ offsetPx = 72 }: { offsetPx?: number }) {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const el = document.getElementById(decodeURIComponent(hash));
      if (!el) return;
      // Defer one frame so any late layout/image loads settle first.
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const target = rect.top + window.scrollY - offsetPx;
        window.scrollTo({ top: target, behavior: "smooth" });
      });
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [offsetPx]);
  return null;
}
