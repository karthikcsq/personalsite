"use client";

// Before a piece is chosen: six records. Each record's grooves are that piece's
// own waveform, wrapped into a circle. Click one to play it: its grooves unroll
// from a circle into a straight line, landing exactly on the waveform, which
// then takes over.
import { useEffect, useMemo, useRef, useState } from "react";
import { RECORDINGS } from "../sound/recitalPeaks";
import s from "./overture.module.css";

const BARS = 160; // grooves per record
const R0 = 30; // label radius
const RMAX = 30; // how far a groove can reach beyond the label
const surname = (c?: string) => (c ? c.split(" · ")[0].split(" ").at(-1) : "");
const short = (t: string) => t.split(/[,:]/)[0];

function downsample(peaks: [number, number][], n: number) {
  const out: number[] = [];
  const per = peaks.length / n;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) m = Math.max(m, peaks[j][1]);
    out.push(m);
  }
  return out;
}

function Record({ levels }: { levels: number[] }) {
  const size = (R0 + RMAX + 4) * 2;
  const c = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={s.disc} aria-hidden>
      <g className={s.grooves} style={{ transformOrigin: `${c}px ${c}px` }}>
      {levels.map((v, i) => {
        const a = -Math.PI / 2 + (i / levels.length) * Math.PI * 2;
        const r1 = R0 + 3;
        const r2 = R0 + 3 + Math.max(1, v * RMAX);
        return (
          <path
            key={i}
            d={`M${(c + Math.cos(a) * r1).toFixed(1)} ${(c + Math.sin(a) * r1).toFixed(1)}L${(c + Math.cos(a) * r2).toFixed(1)} ${(c + Math.sin(a) * r2).toFixed(1)}`}
            className={s.groove}
          />
        );
      })}
      </g>
      {/* the play mark: the one cue that says "press me" */}
      <path d={`M${c - 5} ${c - 7.5} L${c + 8} ${c} L${c - 5} ${c + 7.5} Z`} className={s.mark} style={{ transformOrigin: `${c + 1}px ${c}px` }} />
    </svg>
  );
}

export default function Overture({ onChoose, onUnrolled, hidden }: { onChoose: (i: number, at: number) => void; onUnrolled: () => void; hidden: boolean }) {
  const levels = useMemo(() => RECORDINGS.map((r) => downsample(r.peaks, BARS)), []);
  const discs = useRef<(HTMLButtonElement | null)[]>([]);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  // Unroll the chosen record into the waveform.
  const unroll = (i: number) => {
    const cv = overlay.current;
    const disc = discs.current[i]?.querySelector("svg");
    const wave = document.querySelector<HTMLElement>('[aria-label="Seek"]');
    if (!cv || !disc || !wave) return onUnrolled();
    const g = cv.getContext("2d");
    if (!g) return onUnrolled();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const d = disc.getBoundingClientRect();
    const scale = d.width / ((R0 + RMAX + 4) * 2);
    const cx = d.left + d.width / 2;
    const cy = d.top + d.height / 2;
    const ink = getComputedStyle(cv).getPropertyValue("--ink").trim() || "#1c1a16";
    const lv = levels[i];
    const ms = reduced ? 1 : 1500;
    // Runs from a click, not during render.
    // eslint-disable-next-line react-hooks/purity
    const t0 = performance.now();
    const frame = (now: number) => {
      const w = wave.getBoundingClientRect();
      const mid = w.top + w.height / 2;
      const k0 = Math.min(1, (now - t0) / ms);
      g.clearRect(0, 0, window.innerWidth, window.innerHeight);
      g.strokeStyle = ink;
      g.lineCap = "round";
      for (let b = 0; b < BARS; b++) {
        // grooves leave the record one after another, sweeping round it
        const f = b / BARS;
        const raw = Math.min(1, Math.max(0, (k0 - f * 0.35) / 0.65));
        const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        const a = -Math.PI / 2 + f * Math.PI * 2;
        const rr = (R0 + 3 + (lv[b] * RMAX) / 2) * scale;
        const fromX = cx + Math.cos(a) * rr;
        const fromY = cy + Math.sin(a) * rr;
        const toX = w.left + ((b + 0.5) / BARS) * w.width;
        const x = fromX + (toX - fromX) * k;
        const y = fromY + (mid - fromY) * k;
        const ang = a + (Math.PI / 2 - a) * k; // radial → vertical
        const len = (Math.max(1, lv[b] * RMAX) * scale) * (1 - k) + Math.max(1, lv[b] * (w.height * 0.42)) * 2 * k;
        g.globalAlpha = 0.55 + 0.25 * k;
        g.lineWidth = 1.2 + 0.6 * k;
        g.beginPath();
        g.moveTo(x - (Math.cos(ang) * len) / 2, y - (Math.sin(ang) * len) / 2);
        g.lineTo(x + (Math.cos(ang) * len) / 2, y + (Math.sin(ang) * len) / 2);
        g.stroke();
      }
      if (k0 < 1) requestAnimationFrame(frame);
      else {
        onUnrolled();
        // let the real waveform fade in under the drawing, then clear it
        window.setTimeout(() => g.clearRect(0, 0, window.innerWidth, window.innerHeight), 500);
      }
    };
    requestAnimationFrame(frame);
  };

  const choose = (i: number) => {
    if (chosen !== null) return;
    setChosen(i);
    onChoose(i, 0); // from the first note
    requestAnimationFrame(() => unroll(i));
  };

  // Hovering speeds a record up and leaving slows it down. Only the playback
  // rate changes (eased over 600ms), so each disc carries on from the angle
  // it's at instead of jumping to a new point in its spin.
  useEffect(() => {
    const spins = discs.current.map((el) => el?.querySelector(`.${s.grooves}`)?.getAnimations()[0]);
    const from = spins.map((a) => a?.playbackRate ?? 1);
    let t0 = -1;
    let raf = 0;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const k = Math.min(1, (now - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      spins.forEach((a, i) => {
        if (!a) return;
        const to = hovered === i ? 10 : 1;
        a.updatePlaybackRate(from[i] + (to - from[i]) * e);
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  const shown = hovered ?? chosen;

  return (
    <div className={s.overture} data-chosen={chosen !== null} data-hidden={hidden} aria-hidden={hidden}>
      <canvas ref={overlay} className={s.overlay} aria-hidden />
      <div className={s.panel}>
        <ol className={s.shelf}>
          {RECORDINGS.map((r, i) => (
            <li key={r.id} className={s.slot} style={{ "--d": `${180 + i * 110}ms` } as React.CSSProperties}>
              <button
                ref={(el) => {
                  discs.current[i] = el;
                }}
                type="button"
                className={s.record}
                data-hot={hovered === i}
                data-chosen={chosen === i}
                onPointerEnter={() => chosen === null && setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => chosen === null && setHovered(i)}
                onBlur={() => setHovered(null)}
                onClick={() => choose(i)}
                tabIndex={hidden ? -1 : 0}
                aria-label={`Play ${r.title} by ${r.composer?.split(" · ")[0]}`}
              >
                <Record levels={levels[i]} />
                <span className={s.composer}>{surname(r.composer)}</span>
                <span className={s.title}>{short(r.title)}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={s.caption} aria-live="polite">
          {shown !== null ? `${RECORDINGS[shown].title} · ${RECORDINGS[shown].composer?.split(" · ")[0]}` : "\u00a0"}
        </p>
      </div>
    </div>
  );
}
