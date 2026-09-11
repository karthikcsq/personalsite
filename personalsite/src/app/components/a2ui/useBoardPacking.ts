"use client";

import { useLayoutEffect, type RefObject } from "react";
import { packBoard, type PackablePiece } from "@/a2ui/boardLayout";

/**
 * Positions the board's pieces with `packBoard` once they can be measured, and
 * re-packs whenever the board resizes or a piece's height changes (streamed
 * sources, late fonts). The CSS grid stays the layout before the first pass and
 * whenever the board collapses to fewer than four columns.
 */
export function useBoardPacking(
  boardRef: RefObject<HTMLDivElement | null>,
  pieces: PackablePiece[],
) {
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let frame = 0;

    const release = () => {
      delete board.dataset.packed;
      board.style.height = "";
      for (const element of Array.from(board.children) as HTMLElement[]) {
        element.style.width = "";
        element.style.left = "";
        element.style.top = "";
      }
    };

    const layout = () => {
      frame = 0;
      const elements = Array.from(board.children) as HTMLElement[];
      const style = getComputedStyle(board);
      const tracks = style.gridTemplateColumns
        .split(" ")
        .map((track) => parseFloat(track))
        .filter(Number.isFinite);
      if (tracks.length < 4 || elements.length !== pieces.length) {
        release();
        return;
      }

      board.dataset.packed = "true";
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const { placements, height } = packBoard(pieces, {
        columns: tracks.length,
        columnWidth: tracks[0],
        gap: parseFloat(style.columnGap) || 0,
        rowGap: parseFloat(style.rowGap) || 0,
        measure: (index, width) => {
          elements[index].style.width = `${width}px`;
          return elements[index].offsetHeight;
        },
      });
      // Measuring may have tried several widths; settle on the chosen one.
      placements.forEach((placement, index) => {
        elements[index].style.width = `${placement.width}px`;
        elements[index].style.left = `${paddingLeft + placement.left}px`;
        elements[index].style.top = `${paddingTop + placement.top}px`;
      });
      board.style.height = `${paddingTop + height + paddingBottom}px`;
    };

    layout();
    // Re-packing writes the same sizes it read, so these settle after one pass.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(layout);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(board);
    for (const element of Array.from(board.children)) resize.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [boardRef, pieces]);
}
