"use client";

import { ViewTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import SiteHeader from "./SiteHeader";
import { LIVING_CORPUS_SESSION_KEYS as KEYS } from "@/lib/living-corpus/visitState";
import { syncAchievements, unlockAchievement } from "@/lib/living-corpus/achievements";
import { recordAboutVisit } from "@/lib/living-corpus/personalGrowth";
import styles from "./minimal-interior.module.css";

type Page = "about" | "photos" | "work" | "projects" | "writing" | "involvement";

// Scroll distance (px) over which the reading veil goes from clear to solid.
// It starts once the article header has mostly scrolled away, so the sky
// still frames the title but never sits behind running text.
const VEIL_START = 160;
const VEIL_RANGE = 360;
// Stop just short of solid so the sun (a white disc) still reads on the page.
const VEIL_MAX = 0.9;

export default function MinimalInterior({
  page,
  children,
  readingVeil = false,
}: {
  page: Page;
  children: React.ReactNode;
  /** Fade the sky and branch behind long-form text as the reader scrolls. */
  readingVeil?: boolean;
}) {
  const veilRef = useRef<HTMLDivElement | null>(null);
  const [night, setNight] = useState(false);
  const [xray, setXray] = useState(false);
  const [charging, setCharging] = useState(false);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedRef = useRef(false);
  const consumedRef = useRef(false);

  useLayoutEffect(() => {
    try {
      const restoredNight = window.sessionStorage.getItem(KEYS.season) === "winter";
      setNight(restoredNight);
      if (restoredNight) syncAchievements(["night"]);
      setXray(window.sessionStorage.getItem(KEYS.xray) === "true");
    } catch {
      // The page still works when storage is unavailable.
    }
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (page === "about") recordAboutVisit();
  }, [page]);

  useLayoutEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const veil = veilRef.current;
    if (!readingVeil || !veil) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, (window.scrollY - VEIL_START) / VEIL_RANGE));
      veil.style.opacity = String(progress * VEIL_MAX);
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
  }, [readingVeil]);

  const cancelCharge = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setCharging(false);
  }, []);

  const startCharge = useCallback(() => {
    if (timerRef.current) return;
    setCharging(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      consumedRef.current = true;
      setCharging(false);
      const next = !xray;
      setXray(next);
      if (next) unlockAchievement("eclipse");
      try {
        window.sessionStorage.setItem(KEYS.xray, String(next));
      } catch {
        // Keep the interaction local if storage is blocked.
      }
    }, 1500);
  }, [xray]);

  const toggleNight = () => {
    const next = !night;
    setNight(next);
    if (next) unlockAchievement("night");
    try {
      window.sessionStorage.setItem(KEYS.season, next ? "winter" : "solar");
    } catch {
      // Keep the interaction local if storage is blocked.
    }
  };

  return (
    <div className={styles.world} data-corpus-page={page} data-night={night} data-xray={xray} data-ready={ready}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.environment} aria-hidden="true">
        <div className={styles.branch} />
      </div>
      {readingVeil ? <div ref={veilRef} className={styles.readingVeil} aria-hidden="true" /> : null}
      <ViewTransition name="corpus-sun" share="corpus-sun" default="none">
      <button
        type="button"
        className={styles.sun}
        data-charging={charging}
        data-eclipsed={xray}
        aria-label={night ? "Return to daylight" : "See the winter night"}
        aria-description="Pause for 1.5 seconds or press and hold to change the eclipse"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") startCharge();
        }}
        onPointerLeave={() => {
          if (!pressedRef.current) cancelCharge();
        }}
        onPointerDown={() => {
          pressedRef.current = true;
          consumedRef.current = false;
          cancelCharge();
          startCharge();
        }}
        onPointerUp={(event) => {
          pressedRef.current = false;
          if (event.pointerType !== "mouse") cancelCharge();
        }}
        onPointerCancel={() => {
          pressedRef.current = false;
          cancelCharge();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!event.repeat) {
            consumedRef.current = false;
            startCharge();
          }
        }}
        onKeyUp={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const wasEclipse = consumedRef.current;
          cancelCharge();
          consumedRef.current = true;
          if (!wasEclipse) toggleNight();
        }}
        onClick={(event) => {
          if (consumedRef.current) {
            consumedRef.current = false;
            event.preventDefault();
            return;
          }
          cancelCharge();
          toggleNight();
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className={styles.diamond} aria-hidden="true" />
        <span className={styles.lunarEclipse} aria-hidden="true" />
      </button>
      </ViewTransition>
      <div className={styles.shell}>
        <SiteHeader current={page} />
        {children}
      </div>
    </div>
  );
}
