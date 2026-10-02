"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_EVENT,
  ACHIEVEMENT_RESET_EVENT,
  ACHIEVEMENT_STORAGE_KEY,
  ACHIEVEMENT_SYNC_EVENT,
  isAchievementRecord,
  readUnlockedAchievements,
  type AchievementId,
  type AchievementRecord,
} from "@/lib/living-corpus/achievements";
import { playAchievementChime } from "./achievementSound";
import styles from "./achievements.module.css";

const TOAST_DURATION_MS = 4100;
const SOUND_STORAGE_KEY = "living-corpus-achievement-sound-v1";
const PULL_SHAPE = "M 20 25 C 90 24 161 27 213 13 C 226 9 234 2 238 0 C 234 8 227 15 217 20 C 205 26 190 30 172 37 C 127 55 78 80 23 82 C 9 82 3 76 3 68 C 1 51 6 35 11 29 C 13 27 16 25 20 25 Z";

function AchievementMotif({ id }: { id: AchievementId }) {
  if (id === "night") {
    return (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M22.9 24.4A11.6 11.6 0 0 1 17.4 2.7 12 12 0 1 0 22.9 24.4Z" fill="currentColor" />
        <path d="M22.4 6.1v5.1m-2.5-2.6H25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "break") {
    return (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M3 26.5C9 21.7 12 19.5 16 17.5m3.2-1.7C22.4 14.2 25.9 11.5 29 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m15.5 12.6 1.3 4.6-3.5 2.1m7-7.3-2.3 3.7 3.8 2.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "eclipse") {
    return (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="10.4" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="16" cy="16" r="8.2" fill="currentColor" />
      </svg>
    );
  }
  if (id === "leaf" || id === "all-leaves") {
    return (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M6 28c5.6-7.2 8.1-12.5 13-19.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M18.8 8.8C18.6 4.5 22 2.4 27.5 2.3c-.6 5.2-3.7 8.3-8.7 6.5ZM12.3 20.2c-4.4.2-6.7-2.4-7.3-6.5 4.6-.1 7.9 1.8 7.3 6.5ZM15.1 16.1c4.4-1 7.4.1 9.2 3.4-4.5 1.8-7.8.7-9.2-3.4Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 27.5C11.2 23.5 18.9 17.6 29 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.5 20.9c-1.3-4.1-.6-7.6 1.1-10.4M20.7 14.6c3.2-.4 5.6.2 7.8 1.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}

export default function Achievements() {
  const [unlocked, setUnlocked] = useState<AchievementRecord[]>([]);
  const [queue, setQueue] = useState<AchievementRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeToast = queue[0];
  const unlockedIds = new Set(unlocked.map(({ id }) => id));

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      if (typeof window.AudioContext === "undefined") return;
      try {
        audioContextRef.current = new window.AudioContext();
      } catch {
        return;
      }
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    setUnlocked(readUnlockedAchievements());
    try {
      setSoundEnabled(window.localStorage.getItem(SOUND_STORAGE_KEY) !== "off");
    } catch {
      // A blocked storage API should not prevent the notification from working.
    }

    const onUnlock = (event: Event) => {
      const record = (event as CustomEvent<unknown>).detail;
      if (!isAchievementRecord(record)) return;
      setUnlocked(readUnlockedAchievements());
      setQueue((current) =>
        current.length >= 3 || current.some((item) => item.id === record.id)
          ? current
          : [...current, record],
      );
    };
    const onSync = () => setUnlocked(readUnlockedAchievements());
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACHIEVEMENT_STORAGE_KEY) {
        setUnlocked(readUnlockedAchievements());
      } else if (event.key === SOUND_STORAGE_KEY) {
        setSoundEnabled(event.newValue !== "off");
      }
    };
    const onReset = () => {
      setUnlocked([]);
      setQueue([]);
    };

    window.addEventListener(ACHIEVEMENT_EVENT, onUnlock);
    window.addEventListener(ACHIEVEMENT_SYNC_EVENT, onSync);
    window.addEventListener(ACHIEVEMENT_RESET_EVENT, onReset);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ACHIEVEMENT_EVENT, onUnlock);
      window.removeEventListener(ACHIEVEMENT_SYNC_EVENT, onSync);
      window.removeEventListener(ACHIEVEMENT_RESET_EVENT, onReset);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;
    const onPointerDown = () => ensureAudioContext();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") ensureAudioContext();
    };
    window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [ensureAudioContext, soundEnabled]);

  useEffect(() => {
    if (!activeToast || open || !soundEnabled || document.visibilityState !== "visible") return;
    const context = audioContextRef.current;
    if (!context) return;
    let canceled = false;
    if (context.state === "running") {
      playAchievementChime(context);
    } else if (context.state === "suspended") {
      void context.resume().then(() => {
        if (!canceled && document.visibilityState === "visible") playAchievementChime(context);
      }).catch(() => {});
    }
    return () => {
      canceled = true;
    };
  }, [activeToast?.id, open, soundEnabled]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!activeToast) return;
    const nextTimer = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(nextTimer);
    };
  }, [activeToast?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const showCollection = () => {
    setQueue([]);
    setOpen(true);
  };

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        data-notifying={activeToast && !open ? "true" : "false"}
        aria-label={`Achievements, ${unlocked.length} unlocked`}
        aria-expanded={open}
        aria-controls={open ? "site-achievements" : undefined}
        onClick={() => {
          setQueue([]);
          setOpen((current) => !current);
        }}
      >
        <span className={styles.glyph} aria-hidden="true">✳</span>
        {activeToast && !open ? (
          <>
            <span key={`mark-${activeToast.id}`} className={styles.glyphPulse} aria-hidden="true">✳</span>
            <span key={`ripple-${activeToast.id}`} className={styles.ripple} aria-hidden="true" />
          </>
        ) : null}
      </button>

      {open ? (
        <section id="site-achievements" className={styles.collection} aria-label="Achievements">
          <div className={styles.collectionHeader}>
            <h2>Achievements</h2>
            <div className={styles.collectionActions}>
              <button
                type="button"
                className={styles.soundToggle}
                aria-pressed={soundEnabled}
                onClick={() => {
                  const next = !soundEnabled;
                  if (next) ensureAudioContext();
                  setSoundEnabled(next);
                  try {
                    window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
                  } catch {
                    // The setting still works for this visit without storage.
                  }
                }}
              >
                Sound {soundEnabled ? "on" : "off"}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close achievements">×</button>
            </div>
          </div>
          <ol className={styles.list}>
            {ACHIEVEMENTS.map((achievement) => {
              const found = unlockedIds.has(achievement.id);
              return (
                <li key={achievement.id} data-found={found}>
                  <span className={styles.mark} aria-hidden="true">{found ? "✓" : ""}</span>
                  <div>
                    <h3>{achievement.title}</h3>
                    <span className={styles.srOnly}>{found ? "Unlocked" : "Locked"}</span>
                    <p>{achievement.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">
        {!open && activeToast ? (
          <button key={activeToast.id} type="button" className={styles.toast} data-kind={activeToast.id} aria-label={`${activeToast.title}. View achievements`} onClick={showCollection}>
            <span className={styles.toastCard} aria-hidden="true" />
            <span className={styles.toastPull} aria-hidden="true">
              <svg className={styles.toastSurface} viewBox="0 0 252 90" preserveAspectRatio="none" focusable="false">
                <path d={PULL_SHAPE} />
              </svg>
            </span>
            <span className={styles.toastCopy}>
              <span className={styles.toastMotif}><AchievementMotif id={activeToast.id} /></span>
              <span className={styles.toastTitle}>{activeToast.title}</span>
              <span className={styles.toastOrdinal} aria-hidden="true">{String(ACHIEVEMENTS.findIndex(({ id }) => id === activeToast.id) + 1).padStart(2, "0")}</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
