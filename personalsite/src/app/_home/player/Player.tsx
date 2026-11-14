"use client";

// The one player for the whole site. It lives in the root layout, so the music
// keeps playing as the visitor moves between pages. The home page's big
// waveform and the docked rail are two views of this same player.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { attach, audio } from "../sound/audio";
import { RECORDINGS } from "../sound/recitalPeaks";
import Rail from "../monolith/Rail";

export type PlayerControl = {
  playFrom: (sec: number) => void;
  toggle: () => void;
  select: (i: number, startAt?: number) => void;
};
export type PlayerState = { which: number; time: number; playing: boolean; duration: number; started: boolean };
type Player = PlayerState & { control: PlayerControl; setHomeRail: (on: boolean) => void };

const Ctx = createContext<Player | null>(null);

export function usePlayer(): Player {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlayer outside <PlayerProvider>");
  return p;
}

export default function PlayerProvider({ children }: { children: ReactNode }) {
  const el = useRef<HTMLAudioElement>(null);
  const pending = useRef<false | number>(false);
  const [which, setWhich] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [homeRail, setHomeRail] = useState(false);
  const pathname = usePathname();
  const rec = RECORDINGS[which];
  const duration = rec.duration;

  const playFrom = useCallback(
    (sec: number) => {
      const a = el.current;
      if (!a) return;
      audio();
      attach(a);
      a.currentTime = Math.max(0, Math.min(duration - 0.5, sec));
      if (a.paused) {
        // start softly rather than at full volume
        a.volume = 0;
        void a.play().then(() => {
          const t0 = performance.now();
          const step = () => {
            const k = Math.min(1, (performance.now() - t0) / 900);
            a.volume = k * k;
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      } else void a.play();
    },
    [duration],
  );

  const select = useCallback(
    (i: number, startAt?: number) => {
      const n = (i + RECORDINGS.length) % RECORDINGS.length;
      if (n === which) {
        const a = el.current;
        if (a?.paused) playFrom(startAt ?? a.currentTime);
        else if (startAt !== undefined) playFrom(startAt);
        return;
      }
      el.current?.pause();
      setTime(startAt ?? 0);
      setWhich(n);
      pending.current = startAt ?? 0;
    },
    [which, playFrom],
  );

  const toggle = useCallback(() => {
    const a = el.current;
    if (!a) return;
    if (a.paused) playFrom(a.currentTime >= duration - 1 ? 0 : a.currentTime);
    else a.pause();
  }, [playFrom, duration]);

  const control = useMemo(() => ({ playFrom, toggle, select }), [playFrom, toggle, select]);
  const value = useMemo<Player>(
    () => ({ which, time, playing, duration, started, control, setHomeRail }),
    [which, time, playing, duration, started, control],
  );

  // On the home page the rail appears once the waveform has travelled to it;
  // everywhere else it is simply there, once something has been played.
  const railOn = started && (pathname === "/" ? homeRail : true);
  // Pages read this to leave room for the rail at the left edge.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-rail", railOn);
  }, [railOn]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Rail on={railOn} />
      <audio
        key={rec.id}
        ref={el}
        src={rec.src}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={() => {
          if (pending.current !== false) {
            const at = pending.current;
            pending.current = false;
            playFrom(at);
          }
        }}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />
    </Ctx.Provider>
  );
}
