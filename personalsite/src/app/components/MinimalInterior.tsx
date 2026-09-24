"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { LIVING_CORPUS_SESSION_KEYS as KEYS } from "@/lib/living-corpus/visitState";
import { syncAchievements, unlockAchievement } from "@/lib/living-corpus/achievements";
import styles from "./minimal-interior.module.css";

type Page = "about" | "photos";

export default function MinimalInterior({
  page,
  children,
}: {
  page: Page;
  children: React.ReactNode;
}) {
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

  useLayoutEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

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
    <div className={styles.world} data-night={night} data-xray={xray} data-ready={ready}>
      <div className={styles.environment} aria-hidden="true">
        <div className={styles.branch} />
      </div>
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
      />
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.identity} aria-label="Karthik Thyagarajan, home">
            Karthik Thyagarajan
          </Link>
          <nav className={styles.nav} aria-label="Personal pages">
            <Link href="/" className={styles.homeLink}>Home</Link>
            <Link href="/about" aria-current={page === "about" ? "page" : undefined}>About</Link>
            <Link href="/gallery" aria-current={page === "photos" ? "page" : undefined}>Photos</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
