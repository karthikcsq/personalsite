"use client";
import { useEffect } from "react";

// Scrolls the current page to the element matching window.location.hash after
// mount. Works around a Next.js App Router quirk where client-side navigation
// to `/page#anchor` scrolls using the previous page's layout instead of the
// newly-loaded page's, landing at the wrong position.
//
// Uses `scrollIntoView({ block: "start" })` so navbar offset is controlled via
// CSS `scroll-margin-top` on the target element. That's more reliable than
// computing scrollY math manually — on mobile, image and iframe layout shifts
// invalidate the manual calculation and the page over- or under-scrolls.
export function HashScroller() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const el = document.getElementById(decodeURIComponent(hash));
      if (!el) return;
      // Two passes: one immediate, one after a beat so late image/iframe
      // layout doesn't leave us short. The second uses `auto` to snap into
      // place silently if the first overshot.
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const settle = setTimeout(() => {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }, 600);
      return () => clearTimeout(settle);
    };
    const cleanup = scrollToHash();
    const onChange = () => scrollToHash();
    window.addEventListener("hashchange", onChange);
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener("hashchange", onChange);
    };
  }, []);
  return null;
}
