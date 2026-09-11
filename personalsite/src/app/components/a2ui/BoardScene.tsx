"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { mixPresentationSeed } from "@/a2ui/presentation";
import type { Board } from "@/a2ui/board";
import { BoardPiece } from "./BoardPiece";
import styles from "./board.module.css";

/**
 * Places the pieces of one answer on a single board.
 *
 * The scene adds only what a piece cannot know on its own: which of Karthik's
 * real photographs fills a gallery piece, and how long a newly arrived piece
 * waits before it settles. Pieces already on the board keep their React key, so
 * a streamed update mounts the new pieces and leaves every existing one alone.
 */
export function BoardScene({
  board,
  seed,
  motionPaused,
  isLoading = false,
  sourceLabel,
  onOpen,
}: {
  board: Board;
  seed: number;
  motionPaused: boolean;
  isLoading?: boolean;
  sourceLabel: (artifactId: string) => string;
  onOpen: (artifactId: string) => void;
}) {
  // Capture once: partial documents can bring a different presentation seed,
  // but the material beneath already placed notes must never change.
  const [theme] = useState(() =>
    (["linen", "folio", "cork"] as const)[mixPresentationSeed(seed, "board-material") % 3],
  );
  const [visibleCount, setVisibleCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  // Pace actual, validated pieces rather than simulating model progress.
  // Streaming gaps remain honest; bursts are spread into a short placement rhythm.
  useEffect(() => {
    if (visibleCount >= board.pieces.length) return;
    if (reduceMotion) { setVisibleCount(board.pieces.length); return; }
    const timer = window.setTimeout(() => setVisibleCount(count => count + 1), visibleCount === 0 ? 0 : 240);
    return () => window.clearTimeout(timer);
  }, [visibleCount, board.pieces.length, reduceMotion]);
  const visiblePieces = board.pieces.slice(0, visibleCount);
  const assembling = isLoading || visibleCount < board.pieces.length;
  const [galleryIndex, setGalleryIndex] = useState<Record<string, string[]>>({});
  const hasGallery = board.pieces.some(piece => Boolean(piece.galleryCategory));

  useEffect(() => {
    if (!hasGallery) return;
    const controller = new AbortController();
    fetch("/api/gallery", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : {}))
      .then((value: unknown) => {
        if (!value || typeof value !== "object") return;
        setGalleryIndex(value as Record<string, string[]>);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [hasGallery]);

  // Seeded from each piece's own key, and resolved in reading order, so a photo
  // keeps its image when later pieces arrive.
  const photoByKey = useMemo(() => {
    const chosen = new Map<string, string>();
    const usedByCategory = new Map<string, Set<number>>();
    for (const piece of board.pieces) {
      if (!piece.galleryCategory) continue;
      const images = galleryIndex[piece.galleryCategory] ?? [];
      if (images.length === 0) continue;
      const used = usedByCategory.get(piece.galleryCategory) ?? new Set<number>();
      let index = mixPresentationSeed(seed, piece.key) % images.length;
      while (used.has(index) && used.size < images.length) {
        index = (index + 1) % images.length;
      }
      used.add(index);
      usedByCategory.set(piece.galleryCategory, used);
      chosen.set(piece.key, images[index]);
    }
    return chosen;
  }, [board.pieces, galleryIndex, seed]);

  // A piece is placed once. Its entrance delay is fixed the first time it
  // appears, so re-renders never restage the board.
  const delays = useRef(new Map<string, number>());
  let arriving = 0;
  for (const piece of board.pieces) {
    if (delays.current.has(piece.key)) continue;
    delays.current.set(piece.key, Math.min(arriving, 6) * 70);
    arriving += 1;
  }

  return (
    <div className={styles.boardWrap} data-theme={theme} data-assembling={assembling} data-motion={motionPaused ? "paused" : "active"}>
      {isLoading && !visiblePieces.length ? <p className={styles.boardWaiting} role="status"><span className={styles.boardWaitingLabel}>Putting your answer together<span className={styles.boardWaitingDots} aria-hidden="true">…</span></span></p> : null}
      <div
        className={styles.board}
        data-motion={motionPaused ? "paused" : "active"}
      >
        {visiblePieces.map((piece) => (
          <BoardPiece
            key={piece.key}
            piece={piece}
            anchorId={board.pieces.find(candidate => candidate.componentId === piece.componentId)?.key === piece.key ? `a2ui-${piece.componentId}` : undefined}
            photoUrl={photoByKey.get(piece.key)}
            sourceLabel={piece.artifactId ? sourceLabel(piece.artifactId) : undefined}
            delay={delays.current.get(piece.key) ?? 0}
            onOpen={onOpen}
          />
        ))}
      </div>

      {!assembling && board.sourceArtifactIds.length > 0 ? (
        <nav className={styles.boardSources} aria-label="Sources">
          {board.sourceArtifactIds.map((artifactId) => (
            <button
              type="button"
              key={artifactId}
              onClick={() => onOpen(artifactId)}
            >
              Original source · {sourceLabel(artifactId).replace(/^See\s+/i, "")}
              <ArrowRight aria-hidden="true" />
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
