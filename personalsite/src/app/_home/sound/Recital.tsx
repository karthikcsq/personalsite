"use client";

// The hero: Karthik's recordings as an engraved waveform across the page.
// Click anywhere to play from there; the programme below switches pieces.
import { useState } from "react";
import { usePlayer } from "../player/Player";
import { RECORDINGS } from "./recitalPeaks";
import s from "./sound.module.css";

const W = 1440;
const H = 96;
const MID = H / 2;

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

const surname = (composer?: string) => (composer ? composer.split(" · ")[0].split(" ").at(-1) : "");
const shortPiece = (title: string) => title.split(",")[0];

export type { PlayerControl as RecitalHandle, PlayerState as RecitalState } from "../player/Player";

export default function Recital({ variant = "default" }: { variant?: "default" | "monolith" }) {
  const { which, time, playing, control } = usePlayer();
  const { playFrom, select } = control;
  const [hover, setHover] = useState<number | null>(null);
  const RECITAL = RECORDINGS[which];
  const cur = () => time;

  const shown = RECITAL;
  const progress = time / RECITAL.duration;
  const n = shown.peaks.length;
  const bw = W / n;

  return (
    <section className={s.recital} data-variant={variant} aria-label="Recording">
      <div className={s.recitalHead}>
        <button
          type="button"
          className={s.play}
          aria-label={playing ? "Pause the recording" : "Play the recording"}
          onClick={() => control.toggle()}
        >
          <svg viewBox="0 0 16 16" aria-hidden>
            {playing ? <path d="M5 3v10M11 3v10" /> : <path d="M5 3l8 5-8 5z" />}
          </svg>
        </button>
        <span className={s.recitalTitle}>{shown.title}</span>
        <span className={s.mono}>
          {shown.composer?.split(" · ")[0]}
        </span>
        <span className={`${s.mono} ${s.recitalTime}`}>
          {fmt(hover ?? time)} / {fmt(RECITAL.duration)}
        </span>
      </div>
      <div
        className={s.wave}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(((e.clientX - r.left) / r.width) * RECITAL.duration);
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          playFrom(((e.clientX - r.left) / r.width) * RECITAL.duration);
        }}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(RECITAL.duration)}
        aria-valuenow={Math.round(time)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") playFrom(cur() + 5);
          if (e.key === "ArrowLeft") playFrom(cur() - 5);
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            control.toggle();
          }
        }}
      >
        <svg key={shown.id} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className={s.waveSvg}>
          {shown.peaks.map(([peak, rms], i) => {
            const x = (i * bw + bw / 2).toFixed(1);
            const played = i / n < progress;
            const ph = Math.max(0.6, peak * (MID - 4));
            const rh = Math.max(0.4, rms * (MID - 6));
            return (
              <g key={i} className={played ? s.played : undefined}>
                <path d={`M${x} ${(MID - ph).toFixed(1)}V${(MID + ph).toFixed(1)}`} className={s.peak} />
                <path d={`M${x} ${(MID - rh).toFixed(1)}V${(MID + rh).toFixed(1)}`} className={s.rms} />
              </g>
            );
          })}
          <path d={`M0 ${MID}H${W}`} className={s.axis} />
          {hover !== null ? <path d={`M${((hover / RECITAL.duration) * W).toFixed(1)} 0V${H}`} className={s.cursor} /> : null}
          <path d={`M${(progress * W).toFixed(1)} 0V${H}`} className={s.head} />
        </svg>
      </div>
      <ol className={s.programme} aria-label="Recordings">
        {RECORDINGS.map((r, i) => (
          <li key={r.id}>
            <button
              type="button"
              aria-current={i === which}
              className={s.piece}
              onClick={() => select(i, i === which ? undefined : 0)}
            >
              <span className={s.pieceNo}>{String(i + 1).padStart(2, "0")}</span>
              <span className={s.pieceComposer}>{surname(r.composer)}</span>
              <span className={s.pieceTitle}>{shortPiece(r.title)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
