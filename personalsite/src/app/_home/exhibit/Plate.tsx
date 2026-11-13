"use client";

// One clock per plate. A plate is a pure function of `t` (seconds within a
// loop). The clock runs only while the plate is on screen, restarts from 0 the
// first time it scrolls into view, follows the mouse when hovered (scrub by x),
// can be dragged on the timeline (touch), and holds a meaningful still frame
// under prefers-reduced-motion.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PAPER, VB_H, VB_W, INK } from "./engrave";
import { PlateFrame } from "./glyphs";
import styles from "./exhibit.module.css";

export interface PlateProps {
  loop: number;
  /** Frame shown before JS, under reduced motion, and in the server render. */
  still: number;
  label: string;
  children: (t: number) => ReactNode;
  /** Optional control rendered beside the timeline (e.g. a toggle). */
  extra?: ReactNode;
  /** When this value changes the clock jumps to `resetTo`. */
  resetKey?: unknown;
  resetTo?: number;
  ground?: string;
  frameColor?: string;
}

export default function Plate({ loop, still, label, children, extra, resetKey, resetTo = 0, ground = PAPER, frameColor = INK }: PlateProps) {
  const [t, setT] = useState(still);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const tRef = useRef(still);
  const visible = useRef(false);
  const started = useRef(false);
  const hovering = useRef(false);
  const dragging = useRef(false);
  const raf = useRef(0);
  const last = useRef(0);
  const playingRef = useRef(true);
  const reducedRef = useRef(false);

  const set = useCallback((v: number) => {
    tRef.current = ((v % loop) + loop) % loop;
    setT(tRef.current);
  }, [loop]);

  const tick = useCallback(
    function step(now: number) {
      const dt = last.current ? Math.min(0.1, (now - last.current) / 1000) : 0;
      last.current = now;
      if (!hovering.current && !dragging.current) set(tRef.current + dt);
      raf.current = requestAnimationFrame(step);
    },
    [set],
  );

  const sync = useCallback(() => {
    const shouldRun = visible.current && playingRef.current && !reducedRef.current;
    if (shouldRun && !raf.current) {
      last.current = 0;
      raf.current = requestAnimationFrame(tick);
    } else if (!shouldRun && raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
  }, [tick]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
      if (mq.matches) {
        playingRef.current = false;
        setPlaying(false);
        set(still);
      }
      sync();
    };
    apply();
    mq.addEventListener("change", apply);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        if (entry.isIntersecting && !started.current && !reducedRef.current) {
          started.current = true;
          set(0);
        }
        sync();
      },
      { threshold: 0.02 },
    );
    if (wrap.current) io.observe(wrap.current);
    return () => {
      mq.removeEventListener("change", apply);
      io.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [set, still, sync]);

  // Compare with the previous key (not a "first run" flag) so StrictMode's
  // double-invoked effects don't trigger a spurious reset.
  const lastKey = useRef(resetKey);
  useEffect(() => {
    if (Object.is(lastKey.current, resetKey)) return;
    lastKey.current = resetKey;
    set(resetTo);
  }, [resetKey, resetTo, set]);

  const scrubFrom = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    set(Math.min(0.999, Math.max(0, (clientX - r.left) / r.width)) * loop);
  };

  const toggle = () => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
    sync();
  };

  return (
    <div ref={wrap} className={styles.plateWrap}>
      <div
        className={styles.plate}
      >
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={label} className={styles.plateSvg}>
          <rect width={VB_W} height={VB_H} fill={ground} />
          {children(t)}
          <PlateFrame w={VB_W} h={VB_H} color={frameColor} />
        </svg>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.play} onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? (
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2v8M9 2v8" /></svg>
          ) : (
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2l7 4-7 4z" /></svg>
          )}
        </button>
        <div
          ref={bar}
          className={styles.track}
          role="slider"
          tabIndex={0}
          aria-label="Scrub"
          aria-valuemin={0}
          aria-valuemax={Math.round(loop * 10) / 10}
          aria-valuenow={Math.round(t * 10) / 10}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubFrom(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => dragging.current && scrubFrom(e.clientX, e.currentTarget)}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") set(tRef.current + loop / 40);
            if (e.key === "ArrowLeft") set(tRef.current - loop / 40);
          }}
        >
          <div className={styles.trackFill} style={{ transform: `scaleX(${(t / loop).toFixed(4)})` }} />
          <div className={styles.trackHead} style={{ left: `${((t / loop) * 100).toFixed(2)}%` }} />
        </div>
        {reduced ? <span className={styles.controlNote}>still</span> : null}
        {extra}
      </div>
    </div>
  );
}
