"use client";

// The music, docked. Once the visitor is past the opening, the piece becomes a
// slim vertical waveform on the left edge: click to move through it, play or
// pause, step to the previous or next piece. Drawn like the hero waveform.
import { useState } from "react";
import { RECORDINGS } from "../sound/recitalPeaks";
import { usePlayer } from "../player/Player";
import s from "./rail.module.css";

const W = 40;
const H = 720;
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export default function Rail({ on }: { on: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const state = usePlayer();
  const control = () => state.control;
  const rec = RECORDINGS[state.which];
  const n = rec.peaks.length;
  const progress = state.duration ? state.time / state.duration : 0;
  const composer = rec.composer?.split(" · ")[0].split(" ").at(-1) ?? "";

  // Its own layer during page changes, so it holds still. Named inline: CSS
  // modules would rename it.
  return (
    <aside className={s.rail} data-on={on} aria-label="Now playing" aria-hidden={!on} style={{ viewTransitionName: "music-rail" }}>
      <button type="button" className={s.btn} onClick={() => control()?.select(state.which - 1)} aria-label="Previous piece" tabIndex={on ? 0 : -1}>
        <svg viewBox="0 0 12 12" aria-hidden><path d="M6 3 L2.5 8 H9.5 Z" /></svg>
      </button>
      <button type="button" className={`${s.btn} ${s.play}`} onClick={() => control()?.toggle()} aria-label={state.playing ? "Pause" : "Play"} tabIndex={on ? 0 : -1}>
        <svg viewBox="0 0 12 12" aria-hidden>{state.playing ? <path d="M4 3v6M8 3v6" /> : <path d="M4 2.5 L9.5 6 L4 9.5 Z" />}</svg>
      </button>

      <div
        className={s.wave}
        role="slider"
        tabIndex={on ? 0 : -1}
        aria-label={`Seek in ${rec.title}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(state.duration)}
        aria-valuenow={Math.round(state.time)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(((e.clientY - r.top) / r.height) * state.duration);
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          control()?.playFrom(((e.clientY - r.top) / r.height) * state.duration);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") control()?.playFrom(state.time + 5);
          if (e.key === "ArrowUp") control()?.playFrom(state.time - 5);
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            control()?.toggle();
          }
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          {rec.peaks.map(([peak, rms], i) => {
            const y = ((i + 0.5) * H) / n;
            const played = i / n < progress;
            const ph = Math.max(0.5, peak * (W / 2 - 2));
            const rh = Math.max(0.4, rms * (W / 2 - 3));
            return (
              <g key={i} className={played ? s.played : undefined} style={{ animationDelay: `${Math.round((i / n) * 700)}ms` }}>
                <path d={`M${(W / 2 - ph).toFixed(1)} ${y.toFixed(1)}H${(W / 2 + ph).toFixed(1)}`} className={s.peak} />
                <path d={`M${(W / 2 - rh).toFixed(1)} ${y.toFixed(1)}H${(W / 2 + rh).toFixed(1)}`} className={s.rms} />
              </g>
            );
          })}
          <path d={`M0 ${(progress * H).toFixed(1)}H${W}`} className={s.head} />
          {hover !== null ? <path d={`M0 ${((hover / state.duration) * H).toFixed(1)}H${W}`} className={s.cursor} /> : null}
        </svg>
        {hover !== null ? (
          <span className={s.tip} style={{ top: `${(hover / state.duration) * 100}%` }}>
            {fmt(hover)}
          </span>
        ) : null}
      </div>

      <button type="button" className={s.btn} onClick={() => control()?.select(state.which + 1)} aria-label="Next piece" tabIndex={on ? 0 : -1}>
        <svg viewBox="0 0 12 12" aria-hidden><path d="M6 9 L2.5 4 H9.5 Z" /></svg>
      </button>
      <span className={s.label}>
        <span className={`${s.labelMeta} ${s.labelComposer}`}>{composer}</span>
        <span className={s.labelMeta}>{fmt(state.time)}</span>
      </span>
    </aside>
  );
}
