"use client";

// Photographs, at the very end, grouped by trip. Each trip is a row of
// mounted prints that scrolls sideways on its own (trackpad, drag, or the
// arrows); the page itself always scrolls normally. Click a print to see it
// large and step through that trip.
import { useEffect, useRef, useState } from "react";
import { TRIPS, type Trip } from "./photos";
import s from "./photos.module.css";

function Row({ trip, index, onOpen }: { trip: Trip; index: number; onOpen: (i: number) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Drag to scroll with a mouse; touch and trackpads scroll natively.
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let down = false;
    let moved = 0;
    let x0 = 0;
    let left0 = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = 0;
      x0 = e.clientX;
      left0 = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      moved = Math.max(moved, Math.abs(e.clientX - x0));
      if (moved > 4) el.scrollLeft = left0 - (e.clientX - x0);
    };
    const onUp = () => {
      down = false;
    };
    const onClick = (e: MouseEvent) => {
      if (moved > 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  const step = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className={s.trip} aria-labelledby={`trip-${index}`}>
      <header className={s.tripHead}>
        <h3 id={`trip-${index}`} className={s.tripName}>
          {trip.trip}
        </h3>
        <span className={s.arrows}>
          <button type="button" onClick={() => step(-1)} disabled={edge.start} aria-label={`Scroll ${trip.trip} back`}>
            ←
          </button>
          <button type="button" onClick={() => step(1)} disabled={edge.end} aria-label={`Scroll ${trip.trip} forward`}>
            →
          </button>
        </span>
      </header>
      <div ref={row} className={s.row} data-start={edge.start} data-end={edge.end}>
        {trip.photos.map((ph, i) => (
          <button key={ph.src} type="button" className={s.print} onClick={() => onOpen(i)} aria-label={`Open ${trip.trip} photograph ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.src} alt={`${trip.trip}, photograph ${i + 1}`} width={ph.w} height={ph.h} loading="lazy" draggable={false} />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Photos() {
  const [open, setOpen] = useState<{ t: number; i: number } | null>(null);
  const trip = open ? TRIPS[open.t] : null;
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const isOpen = open !== null;

  // While the photo is open: focus moves into it, the page behind can't scroll,
  // and closing hands focus back to the print that opened it.
  useEffect(() => {
    if (!isOpen) return;
    const from = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = overflow;
      from?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!open) return;
    const n = TRIPS[open.t].photos.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>("button")];
        const i = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o ? { ...o, i: (o.i + 1) % n } : o));
      if (e.key === "ArrowLeft") setOpen((o) => (o ? { ...o, i: (o.i - 1 + n) % n } : o));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section id="photographs" className={s.photos} aria-labelledby="mo-photos">
      <h2 id="mo-photos" data-seclabel>
        Photographs
      </h2>
      {TRIPS.map((t, ti) => (
        <Row key={t.trip} trip={t} index={ti} onOpen={(i) => setOpen({ t: ti, i })} />
      ))}

      {open && trip ? (
        <div ref={box} className={s.box} role="dialog" aria-modal="true" aria-label={trip.trip} onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={trip.photos[open.i].src} src={trip.photos[open.i].src} alt={`${trip.trip}, photograph ${open.i + 1}`} onClick={(e) => e.stopPropagation()} />
          <div className={s.boxBar} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen({ ...open, i: (open.i - 1 + trip.photos.length) % trip.photos.length })} aria-label="Previous photograph">
              ←
            </button>
            <span>
              {trip.trip} · {String(open.i + 1).padStart(2, "0")} / {String(trip.photos.length).padStart(2, "0")}
            </span>
            <button type="button" onClick={() => setOpen({ ...open, i: (open.i + 1) % trip.photos.length })} aria-label="Next photograph">
              →
            </button>
            <button ref={closeBtn} type="button" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
