"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import MinimalInterior from "@/app/components/MinimalInterior";
import styles from "./gallery.module.css";

type Albums = Record<string, string[]>;

function albumLabel(name: string) {
  return name.replace("San Fransisco", "San Francisco");
}

function isAlbums(value: unknown): value is Albums {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([name, images]) =>
      typeof name === "string" && Array.isArray(images) &&
      images.every((image) => typeof image === "string"),
    );
}

export default function GalleryPage() {
  const [albums, setAlbums] = useState<Albums>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [album, setAlbum] = useState("");
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/gallery", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Gallery unavailable");
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!isAlbums(data)) throw new Error("Unexpected gallery data");
        const nonempty = Object.fromEntries(
          Object.entries(data).filter(([, images]) => images.length > 0),
        );
        const firstAlbum = Object.keys(nonempty)[0] ?? "";
        setAlbums(nonempty);
        setAlbum((current) => current && nonempty[current] ? current : firstAlbum);
        setIndex(0);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [reloadKey]);

  const names = useMemo(() => Object.keys(albums), [albums]);
  const images = albums[album] ?? [];
  const selected = images[index];

  const move = useCallback((direction: number) => {
    if (!images.length) return;
    setIndex((current) => (current + direction + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded, move]);

  return (
    <MinimalInterior page="photos">
      <main className={styles.page}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Photos</p>
            <h1>What I&apos;ve seen.</h1>
            <p className={styles.deck}>A few places I wanted to remember.</p>
          </div>
        </div>

        {status === "loading" ? (
          <div className={styles.loading} role="status" aria-label="Loading photographs" />
        ) : status === "error" ? (
          <div className={styles.empty}>
            <p>The photographs couldn&apos;t load.</p>
            <button type="button" onClick={() => { setStatus("loading"); setReloadKey((key) => key + 1); }}>
              Try again ↗
            </button>
          </div>
        ) : !images.length ? (
          <p className={styles.empty}>No photographs yet.</p>
        ) : (
          <div className={styles.gallery}>
            <section className={styles.viewer} key={album} aria-label={`All photographs from ${albumLabel(album)}`}>
              <div className={styles.albumHeading}>
                <h2>{albumLabel(album)}</h2>
              </div>
              <div className={styles.photoGrid}>
                {images.map((image, imageIndex) => (
                  <button
                    key={image}
                    type="button"
                    className={styles.photoTile}
                    aria-label={`Expand photograph ${imageIndex + 1} from ${albumLabel(album)}`}
                    onClick={() => { setIndex(imageIndex); setExpanded(true); }}
                  >
                    <Image
                      src={image}
                      alt={`Photograph ${imageIndex + 1} from ${albumLabel(album)}`}
                      width={1200}
                      height={800}
                      sizes="(max-width: 760px) 50vw, 420px"
                      priority={imageIndex < 2}
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </section>
            <nav className={styles.albumList} aria-label="Photo albums">
              <p className={styles.eyebrow}>Albums</p>
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  data-current={name === album}
                  onClick={() => { setAlbum(name); setIndex(0); setExpanded(false); }}
                >
                  <span>{albumLabel(name)}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </main>

      {expanded && selected && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`${albumLabel(album)} photograph ${index + 1}`}>
          <div className={styles.lightboxTop}>
            <span>{albumLabel(album)} · {index + 1} / {images.length}</span>
            <button ref={closeRef} type="button" onClick={() => setExpanded(false)} aria-label="Close photograph">Close ×</button>
          </div>
          <Image src={selected} alt={`Photograph ${index + 1} from ${albumLabel(album)}`} fill sizes="100vw" className={styles.expandedImage} unoptimized />
          <div className={styles.lightboxArrows}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous photograph">←</button>
            <button type="button" onClick={() => move(1)} aria-label="Next photograph">→</button>
          </div>
        </div>
      )}
    </MinimalInterior>
  );
}
