"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, useLayoutEffect } from "react";
import type { ExhibitEntry, ExhibitEssay, ExhibitRest } from "../exhibit/types";
import BuildPurduePlate from "../exhibit/plates/BuildPurduePlate";
import McpPlate from "../exhibit/plates/McpPlate";
import MemoriesPlate from "../exhibit/plates/MemoriesPlate";
import ParmPlate from "../exhibit/plates/ParmPlate";
import PeratonPlate from "../exhibit/plates/PeratonPlate";
import QkdPlate from "../exhibit/plates/QkdPlate";
import SamsungPlate from "../exhibit/plates/SamsungPlate";
import RepplePlate from "../exhibit/plates/RepplePlate";
import RouterPlate from "../exhibit/plates/RouterPlate";
import TaviPlate from "../exhibit/plates/TaviPlate";
import Keys from "../sound/Keys";
import { RECORDINGS } from "../sound/recitalPeaks";
import Recital from "../sound/Recital";
import { usePlayer } from "../player/Player";
import Photos from "./Photos";
import Overture from "./Overture";
import Go from "./Go";
import { SharedTitle, titleName } from "../PageTransition";
import Interests from "./Interests";
import st from "../studio/studio.module.css";
import snd from "../sound/sound.module.css";
import s from "./monolith.module.css";

const DWELL_S = 11;
const CHUNKS = 36;

function plateFor(e: ExhibitEntry): ReactNode {
  switch (e.plate) {
    case "router":
      return <RouterPlate />;
    case "parm":
      return <ParmPlate />;
    case "tavi":
      return <TaviPlate />;
    case "mcp":
      return <McpPlate />;
    case "memories":
      return <MemoriesPlate />;
    case "qkd":
      return <QkdPlate />;
    case "samsung":
      return <SamsungPlate />;
    case "repple":
      return <RepplePlate screens={e.visuals} />;
    case "buildpurdue":
      return <BuildPurduePlate photos={e.visuals} />;
    case "peraton":
      return <PeratonPlate />;
  }
}

const split = (t: string) => (t.includes(":") ? [t.slice(0, t.indexOf(":")), t.slice(t.indexOf(":") + 1).trim()] : [t, ""]);

export default function Monolith({
  interests,
  name,
  tagline,
  links,
  work,
  essays,
  rest,
}: {
  interests: Record<string, string[]>;
  name: string;
  tagline: { text: string; source: string; href: string };
  links: { label: string; href: string }[];
  work: ExhibitEntry[];
  essays: ExhibitEssay[];
  rest: ExhibitRest[];
}) {
  const [active, setActive] = useState(0);
  // Back from a work item's page: open that item again.
  useLayoutEffect(() => {
    try {
      const id = sessionStorage.getItem("mo-return");
      sessionStorage.removeItem("mo-return");
      const i = work.findIndex((w) => w.id === id);
      // sessionStorage only exists in the browser, so this can't be initial
      // state; doing it before paint means the right item is open on first frame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (i >= 0) setActive(i);
    } catch {}
  }, [work]);
  const [encore, setEncore] = useState(false);
  const player = usePlayer();
  const rec = player;
  // Coming back to the home page with music already playing: no overture.
  const started = player.started;
  // the overture hands over once the chosen record has unrolled into the waveform
  const [overtureDone, setOvertureDone] = useState(player.started);
  const choseHere = useRef(false);
  const setHomeRail = player.setHomeRail;
  const sceneRef = useRef<HTMLDivElement>(null);
  const writingRef = useRef<HTMLElement>(null);
  const workRef = useRef<HTMLElement>(null);
  const goToQuote = useRef<() => void>(() => {});
  const chunkLayer = useRef<HTMLDivElement>(null);
  const chunkEls = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrolled = useRef(false);
  const [workLive, setWorkLive] = useState(false);

  // After the first notes of a piece chosen here, carry the visitor on to the quote.
  useEffect(() => {
    if (!player.playing || !choseHere.current || autoScrolled.current) return;
    autoScrolled.current = true;
    const id = window.setTimeout(() => goToQuote.current(), 3000);
    return () => window.clearTimeout(id);
  }, [player.playing]);

  // The work only starts when the visitor gets there, from the first piece.
  useEffect(() => {
    const el = workRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setWorkLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reveal-on-arrival for the calmer sections.
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target as HTMLElement).setAttribute("data-shown", "true")),
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Scroll choreography: the quote rises over the pinned music (--q, 0→1).
  // A half-finished rise completes itself; once the quote has the screen,
  // the page rests there; the visitor scrolls on to the writing themselves.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let auto = false;
    let drift = 0;
    const progress = () => {
      const top = scene.getBoundingClientRect().top;
      return Math.min(1, Math.max(0, -top / window.innerHeight));
    };
    // A slow drift to a point, eased in and out. Any wheel, touch, key or
    // pointer input from the visitor stops it where it is: they're in control.
    const stopDrift = () => {
      if (!auto) return;
      cancelAnimationFrame(drift);
      auto = false;
    };
    const go = (y: number, ms = 2800) => {
      if (reduced) {
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        return;
      }
      const from = window.scrollY;
      const dist = y - from;
      const t0 = performance.now();
      auto = true;
      const tick = (now: number) => {
        if (!auto) return;
        const k = Math.min(1, (now - t0) / ms);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        // instant per frame: the site's global `scroll-behavior: smooth` would
        // otherwise restart a smooth scroll on every step
        window.scrollTo({ top: from + dist * e, behavior: "instant" as ScrollBehavior });
        if (k < 1) drift = requestAnimationFrame(tick);
        else auto = false;
      };
      drift = requestAnimationFrame(tick);
    };
    const interrupts = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    interrupts.forEach((ev) => window.addEventListener(ev, stopDrift, { passive: true }));
    // The big waveform turns 90° and shrinks into the left rail as the quote
    // rises, then hands over to the rail itself.
    // The waveform travels to the rail in slices: each slice turns 90° and
    // flies to its place on the left edge a beat after the one before it, so
    // the whole thing ripples onto the sidebar.
    const morph = (q: number) => {
      const wave = scene.querySelector<HTMLElement>('[aria-label="Seek"]');
      const target = document.querySelector<HTMLElement>('[aria-label^="Seek in"]');
      const layer = chunkLayer.current;
      if (!wave || !target || !layer) return;
      // nothing has been chosen yet: no waveform to carry, the records just step back
      if (scene.dataset.wave !== "true") {
        layer.style.display = "none";
        return;
      }
      const a = wave.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const moving = q > 0.01 && q < 0.985;
      wave.style.opacity = q <= 0.01 ? "1" : "0";
      layer.style.display = moving ? "block" : "none";
      if (!moving) return;
      layer.style.left = `${a.left}px`;
      layer.style.top = `${a.top}px`;
      layer.style.width = `${a.width}px`;
      layer.style.height = `${a.height}px`;
      const k0 = Math.min(1, Math.max(0, (q - 0.06) / 0.88));
      const cw = a.width / CHUNKS;
      const sx = b.height / a.width;
      const sy = b.width / a.height;
      const spread = 0.5; // how far the last slice lags the first
      chunkEls.current.forEach((el, i) => {
        if (!el) return;
        const f = i / (CHUNKS - 1);
        const raw = reduced ? (q > 0.5 ? 1 : 0) : Math.min(1, Math.max(0, (k0 - f * spread) / (1 - spread)));
        const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        const fromX = a.left + (i + 0.5) * cw;
        const fromY = a.top + a.height / 2;
        const toX = b.left + b.width / 2;
        const toY = b.top + ((i + 0.5) * b.height) / CHUNKS;
        // a little lift mid-flight, alternating, for the undulation
        const lift = Math.sin(Math.PI * k) * 26 * Math.sin(i * 0.55);
        const dx = (toX - fromX) * k;
        const dy = (toY - fromY) * k + lift;
        el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${(90 * k).toFixed(2)}deg) scale(${(1 + (sx - 1) * k).toFixed(4)}, ${(1 + (sy - 1) * k).toFixed(4)})`;
      });
    };
    goToQuote.current = () => {
      if (progress() > 0.04) return;
      go(window.scrollY + scene.getBoundingClientRect().top + window.innerHeight);
    };
    // Arriving from another page, the browser restores the scroll position a
    // moment after this runs; until it settles, leave the rail as it was so it
    // doesn't blink off and back on.
    let settled = false;
    const settle = window.setTimeout(() => {
      settled = true;
      onScroll();
    }, 450);
    const onScroll = () => {
      const q = progress();
      scene.style.setProperty("--q", q.toFixed(3));
      morph(q);
      if (settled || q >= 0.985) setHomeRail(q >= 0.985 && scene.dataset.wave === "true");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      interrupts.forEach((ev) => window.removeEventListener(ev, stopDrift));
      cancelAnimationFrame(drift);
    };
  }, [setHomeRail]);
  const current = work[active];

  return (
    <main className={`${st.root} ${encore ? snd.encore : ""}`}>
      <div ref={chunkLayer} className={s.chunks} aria-hidden>
        {Array.from({ length: CHUNKS }, (_, i) => {
          const peaks = RECORDINGS[rec.which].peaks;
          const per = peaks.length / CHUNKS;
          const from = Math.round(i * per);
          const to = Math.round((i + 1) * per);
          const played = rec.duration ? rec.time / rec.duration : 0;
          return (
            <div
              key={i}
              ref={(el) => {
                chunkEls.current[i] = el;
              }}
              className={s.chunk}
              style={{ left: `${(i / CHUNKS) * 100}%`, width: `${100 / CHUNKS}%` }}
            >
              <svg viewBox={`0 0 ${to - from} 100`} preserveAspectRatio="none">
                {peaks.slice(from, to).map(([peak, rms], j) => {
                  const x = j + 0.5;
                  const on = (from + j) / peaks.length < played;
                  return (
                    <g key={j} className={on ? s.chunkPlayed : undefined}>
                      <path d={`M${x} ${(50 - peak * 46).toFixed(1)}V${(50 + peak * 46).toFixed(1)}`} className={s.chunkPeak} />
                      <path d={`M${x} ${(50 - rms * 44).toFixed(1)}V${(50 + rms * 44).toFixed(1)}`} className={s.chunkRms} />
                    </g>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
      <div ref={sceneRef} className={s.scene} data-started={started} data-wave={overtureDone}>
        <div className={s.pin}>
          <header className={s.top}>
            <span className={s.who}>{name}</span>
            <nav className={`${st.links} ${st.mono}`} aria-label="Elsewhere">
              {links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          </header>
          <section className={s.music} aria-label="Music">
            <Overture hidden={overtureDone} onChoose={(i, at) => {
              choseHere.current = true;
              player.control.select(i, at);
            }} onUnrolled={() => setOvertureDone(true)} />
            <Recital variant="monolith" />
          </section>
        </div>
        <section className={s.quote} aria-label="Tagline">
          <p className={s.quoteText}>
            {tagline.text}
            <Go href={tagline.href} className={st.mono} title={`From ${tagline.source}`}>
              ↗
            </Go>
          </p>
        </section>
      </div>

      <section id="writing" ref={writingRef} className={s.writing} aria-labelledby="mo-writing">
        <h2 id="mo-writing" data-seclabel>
          Writing
        </h2>
        <ol className={s.essays}>
          {essays.map((e, i) => {
            const [title, sub] = split(e.title);
            return (
              <li key={e.slug} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                <Go href={e.href} from="#writing" className={s.essay}>
                  <span>
                    <SharedTitle name={titleName(`essay:${e.slug}`)}><span className={s.essayTitle}>{title}</span></SharedTitle>
                    {sub ? <span className={s.essaySub}>{sub}</span> : null}
                  </span>
                  <span className={`${st.mono} ${s.essayMeta}`}>
                    {e.dateLabel} · {e.readingMinutes} min
                  </span>
                </Go>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={s.afterRail}>
      <Interests sections={interests} />

      <section id="work" ref={workRef} className={s.work} data-live={workLive} aria-labelledby="mo-work" style={{ "--dwell": `${DWELL_S}s` } as CSSProperties}>
        <h2 id="mo-work" data-seclabel>
          Work
        </h2>
        <div className={s.workGrid}>
          <div key={workLive ? current.id : "waiting"} className={`${st.screen} ${st.screenIn}`}>
            {workLive ? plateFor(current) : <div className={s.platePlaceholder} />}
          </div>
          <div>
            <ol className={s.workList} role="tablist" aria-label="Work">
              {work.map((w, i) => (
                <li key={w.id} className={s.workRow} data-active={i === active}>
                  <button type="button" role="tab" aria-selected={i === active} aria-controls={`work-${i}`} className={s.workItem} onClick={() => setActive(i)}>
                    <SharedTitle name={titleName(w.id)}><span className={s.workTitle}>{w.title}</span></SharedTitle>
                  </button>
                  {/* the open item: its role, its line, the way in, and its time on stage */}
                  <div id={`work-${i}`} role="tabpanel" className={s.workOpen} aria-hidden={i !== active}>
                    <div className={s.workOpenInner}>
                      <span className={`${st.mono} ${s.workMeta}`}>{w.meta}</span>
                      <p className={s.workLine}>{w.line}</p>
                      <span className={s.workLinks}>
                      {w.href ? (
                        <Go href={w.href} from="#work" className={`${st.mono} ${s.workMore}`} tabIndex={i === active ? 0 : -1} onClick={() => { try { sessionStorage.setItem("mo-return", w.id); } catch {} }}>
                          More →
                        </Go>
                      ) : null}
                      {w.also ? (
                        <a href={w.also.href} className={`${st.mono} ${s.workMore}`} target="_blank" rel="noopener noreferrer" tabIndex={i === active ? 0 : -1}>
                          {w.also.label} ↗
                        </a>
                      ) : null}
                      </span>
                      <span className={s.workTrack}>
                        {i === active && workLive ? (
                          <span key={`${w.id}-${active}`} className={s.workFill} style={w.plate === "samsung" ? ({ "--dwell": "24s" } as CSSProperties) : undefined} onAnimationEnd={() => setActive((a) => (a + 1) % work.length)} />
                        ) : null}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="also" className={`${st.rest} ${s.restSec}`} aria-labelledby="mo-rest">
        <h2 id="mo-rest" data-seclabel>
          Also
        </h2>
        <ul className={st.restList}>
          {rest.map((r) => (
            <li key={r.id}>
              {r.href ? (
                <Go href={r.href} from="#also">
                  <SharedTitle name={titleName(r.id)}><span className={st.restTitle}>{r.title}</span></SharedTitle>
                  <span className={st.mono}>{r.meta}</span>
                </Go>
              ) : (
                <span className={st.restStatic}>
                  <span className={st.restTitle}>{r.title}</span>
                  <span className={st.mono}>{r.meta}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Photos />

      </div>

      <footer className={`${st.foot} ${s.gutter} ${s.footer}`}>
        <nav className={s.socials} aria-label="Elsewhere">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <Keys
          enabled
          onUnlock={() => {
            setEncore(true);
            player.control.playFrom(0);
          }}
        />
      </footer>
      {encore ? <div className={snd.encoreNote}>Encore · Arabesque No. 1 unlocked</div> : null}
    </main>
  );
}
