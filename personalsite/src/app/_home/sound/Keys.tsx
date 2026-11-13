"use client";

// A small piano (C4–A5). Play the opening of Debussy's Arabesque No. 1
// (the rising arpeggio of bar one) to unlock the encore.
// Also playable from the computer keyboard: A W S E D F T G Y H U J K O L P ; '
// Notes taken from the score's MIDI (mfiles.co.uk).
import { useEffect, useRef, useState } from "react";
import { strike } from "./audio";
import s from "./sound.module.css";

const LOW = 60; // C4
const HIGH = 81; // A5
const MOTIF = [61, 64, 69, 73, 76, 78, 80, 75, 71]; // C#4 E4 A4 C#5 E5 F#5 G#5 D#5 B4
const KEYMAP = "awsedftgyhujkolp;'";
const BLACK = new Set([1, 3, 6, 8, 10]);
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export default function Keys({ enabled, onUnlock }: { enabled: boolean; onUnlock: () => void }) {
  const [down, setDown] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const heard = useRef<number[]>([]);
  const unlocked = useRef(false);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const play = (midi: number) => {
    if (enabledRef.current) strike(midi);
    setDown((d) => new Set(d).add(midi));
    window.setTimeout(() => setDown((d) => {
      const next = new Set(d);
      next.delete(midi);
      return next;
    }), 180);
    const h = [...heard.current, midi].slice(-MOTIF.length);
    heard.current = h;
    // how much of the motif the tail of what was played matches
    let best = 0;
    for (let k = 1; k <= h.length; k++) {
      const tail = h.slice(-k);
      if (tail.every((m, i) => m === MOTIF[i])) best = k;
    }
    setProgress(best);
    if (best === MOTIF.length && !unlocked.current) {
      unlocked.current = true;
      onUnlock();
    }
  };
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      const i = KEYMAP.indexOf(e.key.toLowerCase());
      if (i >= 0 && LOW + i <= HIGH) playRef.current(LOW + i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notes = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i);
  const whites = notes.filter((m) => !BLACK.has(m % 12));
  const ww = 100 / whites.length;

  return (
    <div className={s.keysWrap}>
      <div className={s.keys} role="group" aria-label="Piano">
        {whites.map((m, i) => (
          <button
            key={m}
            type="button"
            className={s.white}
            data-down={down.has(m)}
            style={{ left: `${i * ww}%`, width: `${ww}%` }}
            aria-label={`${NAMES[m % 12]}${Math.floor(m / 12) - 1}`}
            onPointerDown={() => play(m)}
          />
        ))}
        {notes
          .filter((m) => BLACK.has(m % 12))
          .map((m) => {
            const whiteIndex = whites.filter((w) => w < m).length;
            return (
              <button
                key={m}
                type="button"
                className={s.black}
                data-down={down.has(m)}
                style={{ left: `${whiteIndex * ww - ww * 0.3}%`, width: `${ww * 0.6}%` }}
                aria-label={`${NAMES[m % 12]}${Math.floor(m / 12) - 1}`}
                onPointerDown={() => play(m)}
              />
            );
          })}
      </div>
      <span className={s.motif} aria-hidden>
        {MOTIF.map((_, i) => (
          <i key={i} data-on={i < progress} />
        ))}
      </span>
    </div>
  );
}
