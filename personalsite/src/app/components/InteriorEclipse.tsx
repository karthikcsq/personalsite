"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LIVING_CORPUS_SESSION_KEYS } from "@/lib/living-corpus/visitState";
import styles from "./interior-eclipse.module.css";

type EclipseMode = "day" | "night" | null;

function savedEclipseMode(): EclipseMode {
  try {
    if (window.sessionStorage.getItem(LIVING_CORPUS_SESSION_KEYS.xray) !== "true") {
      return null;
    }
    return window.sessionStorage.getItem(LIVING_CORPUS_SESSION_KEYS.season) ===
      "winter"
      ? "night"
      : "day";
  } catch {
    return null;
  }
}

export default function InteriorEclipse({
  immersive,
  pathname,
}: {
  immersive: boolean;
  pathname: string;
}) {
  const [mode, setMode] = useState<EclipseMode>(null);
  const [closing, setClosing] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMode = useCallback((next: EclipseMode) => {
    setMode(next);
    const root = document.documentElement;
    if (immersive || !next) {
      root.removeAttribute("data-interior-eclipse");
    } else {
      root.setAttribute("data-interior-eclipse", next);
    }
  }, [immersive]);

  useLayoutEffect(() => {
    applyMode(immersive ? null : savedEclipseMode());
  }, [applyMode, immersive, pathname]);

  useEffect(
    () => () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      document.documentElement.removeAttribute("data-interior-eclipse");
    },
    [],
  );

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const startHold = () => {
    if (!mode || closing || holdTimerRef.current || finishTimerRef.current) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setClosing(true);
      finishTimerRef.current = setTimeout(() => {
        finishTimerRef.current = null;
        try {
          window.sessionStorage.setItem(LIVING_CORPUS_SESSION_KEYS.xray, "false");
        } catch {
          // The eclipse can still end in this page when storage is unavailable.
        }
        applyMode(null);
        setClosing(false);
      }, 950);
    }, 1500);
  };

  if (immersive || !mode) return null;

  return (
    <button
      type="button"
      className={styles.orb}
      data-mode={mode}
      data-closing={closing ? "true" : "false"}
      aria-label="Hold to end the eclipse"
      aria-description="Pause here for 1.5 seconds, or press and hold"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") startHold();
      }}
      onPointerLeave={cancelHold}
      onPointerDown={() => {
        cancelHold();
        startHold();
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") cancelHold();
      }}
      onPointerCancel={cancelHold}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!event.repeat) startHold();
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        cancelHold();
      }}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => event.preventDefault()}
    />
  );
}
