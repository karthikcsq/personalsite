"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { A2UI_VISUAL_ASSETS, isA2UIVisualAssetId } from "@/a2ui/assetCatalog";
import type { BoardPiece as BoardPieceModel } from "@/a2ui/board";
import { Markdown } from "./Markdown";
import styles from "./board.module.css";

/**
 * One thing on the board: a fact, a stage, an option, a verified quote, one of
 * Karthik's own photographs, a diagram module, or a piece of connective prose.
 *
 * Every kind shares the same paper, the same pin detail and the same entrance,
 * so a board reads as one assembled answer instead of a row of finished cards.
 * The component owns none of the layout decisions; size, tilt, pin and reading
 * order all arrive on the piece from `buildBoard`.
 */
export function BoardPiece({
  piece,
  photoUrl,
  anchorId,
  sourceLabel,
  delay,
  onOpen,
}: {
  piece: BoardPieceModel;
  photoUrl?: string;
  anchorId?: string;
  sourceLabel?: string;
  delay: number;
  onOpen: (artifactId: string) => void;
}) {
  const style = {
    "--board-tilt": `${piece.tilt}deg`,
    "--board-drop": `${piece.drop}px`,
    "--board-delay": `${delay}ms`,
  } as CSSProperties;

  const source =
    piece.artifactId && sourceLabel ? (
      <button
        type="button"
        className={styles.pieceSource}
        onClick={() => onOpen(piece.artifactId)}
      >
        <span><small>Original source</small>{sourceLabel.replace(/^See\s+/i, "")}</span>
        <ArrowRight aria-hidden="true" />
      </button>
    ) : null;

  if (piece.kind === "link" && piece.navigationPath) {
    return (
      <Link
        id={anchorId}
        href={piece.navigationPath}
        target="_blank"
        rel="noopener"
        className={styles.piece}
        data-piece-key={piece.key}
        data-kind="link"
        data-span={piece.span}
        data-pin={piece.pin}
        style={style}
      >
        {piece.heading ? <h2>{piece.heading}</h2> : null}
        {piece.body ? <p className={styles.pieceProse}>{piece.body}</p> : null}
        <span className={styles.pieceCue}>
          Open
          <ArrowRight aria-hidden="true" />
        </span>
      </Link>
    );
  }

  return (
    <article
      id={anchorId}
      className={styles.piece}
      data-piece-key={piece.key}
      data-tone={piece.kind === "note" && piece.slot === "primary" ? "forest" : piece.kind === "quote" ? "sage" : piece.key.endsWith(":0") ? "honey" : piece.key.endsWith(":1") ? "blue" : "cream"}
      data-kind={piece.kind}
      data-span={piece.span}
      data-pin={piece.pin}
      style={style}
    >
      {piece.kind === "lead" ? (
        <Markdown className={styles.pieceLead}>{piece.body}</Markdown>
      ) : null}

      {piece.kind === "quote" ? (
        <>
          {piece.eyebrow ? (
            <span className={styles.pieceEyebrow}>{piece.eyebrow}</span>
          ) : null}
          <blockquote className={styles.pieceQuote}>
            <p>{piece.quote}</p>
            {piece.attribution ? <footer>{piece.attribution}</footer> : null}
          </blockquote>
        </>
      ) : null}

      {piece.kind === "photo" ? (
        <figure className={styles.pieceFigure}>
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={`Karthik's photograph from ${piece.galleryCategory}`}
              width={1200}
              height={900}
              sizes="(max-width: 680px) 92vw, 40vw"
              loading={piece.order < 3 ? "eager" : "lazy"}
              unoptimized
            />
          ) : (
            <span className={styles.piecePlaceholder} />
          )}
          <figcaption>
            {piece.heading ? <strong>{piece.heading}</strong> : null}
            {piece.value ? <b>{piece.value}</b> : null}
            {piece.detail ? <small>{piece.detail}</small> : null}
          </figcaption>
        </figure>
      ) : null}

      {piece.kind !== "photo" && isA2UIVisualAssetId(piece.assetId) ? (
        <Image
          className={styles.pieceAsset}
          src={A2UI_VISUAL_ASSETS[piece.assetId].src}
          alt={A2UI_VISUAL_ASSETS[piece.assetId].alt}
          width={900}
          height={560}
          sizes="(max-width: 680px) 88vw, 32vw"
          unoptimized
        />
      ) : null}

      {piece.kind === "note" ? (
        <>
          {piece.heading ? <h2>{piece.heading}</h2> : null}
          {piece.body ? (
            <Markdown className={styles.pieceProse}>{piece.body}</Markdown>
          ) : null}
        </>
      ) : null}

      {piece.kind === "fact" ||
      piece.kind === "stage" ||
      piece.kind === "option" ||
      piece.kind === "diagram" ? (
        <div className={styles.pieceFact}>
          {piece.eyebrow ? (
            <span className={styles.pieceStageMark}>{piece.eyebrow}</span>
          ) : null}
          {piece.heading ? (
            <span className={styles.pieceLabel}>{piece.heading}</span>
          ) : null}
          {piece.value ? <strong>{piece.value}</strong> : null}
          {piece.detail ? <p>{piece.detail}</p> : null}
        </div>
      ) : null}

      <div className={styles.sourceSlot}>{source}</div>
    </article>
  );
}
