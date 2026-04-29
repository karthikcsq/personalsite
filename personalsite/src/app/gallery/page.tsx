"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const stripHeight_DESKTOP = 320;
const stripHeight_MOBILE = 220;
const AUTO_SCROLL_SPEED = 30; // px / second

function useStripHeight() {
  const [h, setH] = useState(stripHeight_DESKTOP);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setH(mq.matches ? stripHeight_MOBILE : stripHeight_DESKTOP);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return h;
}

export default function GalleryPage() {
  const [galleryData, setGalleryData] = useState<{ [folder: string]: string[] }>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        setGalleryData(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <article className="pt-16 pb-24 md:pt-24">
      <div className="mx-auto max-w-[720px] px-5 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
          Photography
        </p>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
          What I&apos;ve seen.
        </h1>
        <p className="mt-5 max-w-[540px] font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] italic leading-snug text-[var(--color-ink-muted)]">
          Mostly travel. A second language when the words fail me.
        </p>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
          Drag to explore.
        </p>
      </div>

      <div className="mt-14 space-y-14">
        {!loaded ? (
          <GallerySkeleton />
        ) : Object.keys(galleryData).length === 0 ? (
          <p className="px-5 text-[var(--color-ink-muted)] md:px-8">No albums yet.</p>
        ) : (
          Object.entries(galleryData).map(([folder, images], i) => (
            <section key={folder}>
              <h2 className="mx-auto mb-5 max-w-[1280px] px-5 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink)] md:px-8">
                {folder}
              </h2>
              <Marquee images={images} reverse={i % 2 === 1} />
            </section>
          ))
        )}
      </div>
    </article>
  );
}

function Marquee({ images, reverse = false }: { images: string[]; reverse?: boolean }) {
  const stripHeight = useStripHeight();
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0); // transform X in pixels; always ≤ 0 for the loop
  const halfRef = useRef(0); // width of one copy of the image list (half the track)
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const movedRef = useRef(0);

  // Duplicate list so we can wrap seamlessly between the two halves
  const doubled = [...images, ...images];

  // Measure + loop
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      halfRef.current = track.scrollWidth / 2;
    };

    measure();

    // Re-measure once images finish loading (their natural widths change track width)
    const imgs = Array.from(track.querySelectorAll("img"));
    const onLoad = () => measure();
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onLoad);
    });
    const ro = new ResizeObserver(measure);
    ro.observe(track);

    let raf = 0;
    let last = performance.now();
    // direction: forward is negative X (moves left); reverse is positive X
    const direction = reverse ? 1 : -1;

    const applyTransform = () => {
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };

    const wrap = () => {
      const half = halfRef.current;
      if (half <= 0) return;
      // Keep offset in (-half, 0]
      while (offsetRef.current <= -half) offsetRef.current += half;
      while (offsetRef.current > 0) offsetRef.current -= half;
    };

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!draggingRef.current) {
        offsetRef.current += (direction * AUTO_SCROLL_SPEED * dt) / 1000;
        wrap();
        applyTransform();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      imgs.forEach((img) => img.removeEventListener("load", onLoad));
      ro.disconnect();
    };
  }, [reverse, images]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    movedRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    movedRef.current += Math.abs(dx);
    offsetRef.current += dx;
    const half = halfRef.current;
    if (half > 0) {
      while (offsetRef.current <= -half) offsetRef.current += half;
      while (offsetRef.current > 0) offsetRef.current -= half;
    }
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (movedRef.current > 4) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      style={{ touchAction: "pan-y" }}
    >
      <div
        ref={trackRef}
        className="flex gap-3"
        style={{
          width: "max-content",
          willChange: "transform",
          transform: "translate3d(0,0,0)",
        }}
      >
        {doubled.map((src, index) => (
          <div
            key={index}
            className="relative flex-none overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-muted)]"
            style={{ height: stripHeight }}
          >
            <Image
              src={src}
              alt=""
              width={1600}
              height={stripHeight}
              className="block object-cover"
              style={{ height: stripHeight, width: "auto" }}
              unoptimized
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GallerySkeleton() {
  const stripHeight = useStripHeight();
  return (
    <div className="space-y-14">
      {[0, 1].map((row) => (
        <div key={row}>
          <div className="mx-auto mb-5 max-w-[1280px] px-5 md:px-8">
            <div className="h-3 w-32 bg-[var(--color-surface-muted)]" />
          </div>
          <div className="flex gap-3 overflow-hidden px-5 md:px-8" style={{ height: stripHeight }}>
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="flex-none rounded-md bg-[var(--color-surface-muted)]"
                style={{ height: stripHeight, width: stripHeight * 1.4 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
