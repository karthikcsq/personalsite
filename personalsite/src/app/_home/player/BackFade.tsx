"use client";

// The browser's back and forward buttons skip React's view transitions, so
// the page they land on fades in here instead (opacity only: a transform
// would knock the home page's fixed layers out of place mid-fade).
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function BackFade() {
  const pathname = usePathname();
  const popped = useRef(false);
  useEffect(() => {
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!popped.current) return;
    popped.current = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll("main").forEach((m) =>
      m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }),
    );
  }, [pathname]);
  return null;
}
