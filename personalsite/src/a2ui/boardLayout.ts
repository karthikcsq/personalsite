import type { BoardPieceKind, BoardPieceSpan } from "./board.ts";

// Greedy Tetris-style packing for the answer board.
//
// Cards arrive in reading order, in shapes of different widths and heights,
// and each takes whichever move keeps the board most compact:
//
// - Land: drop into the lowest gap the card fits, narrowing a little if that
//   lets it move up. Cards never stretch to cover blank space.
// - Nudge: take a gap that is slightly too short and push the cards beneath it
//   down, each by at most MAX_NUDGE.
// - Bump: lift one smaller card out of the way when that makes the board
//   shorter. The lifted card keeps its width and re-lands in its own best spot,
//   possibly in another column, which is how a tall card that arrives late
//   still finds room beside its neighbours.
//
// Every other placed card keeps its column and width and only moves down, so a
// streamed card rearranges the board a little instead of scrambling it. The
// opening lead never moves.

export type PackablePiece = {
  kind: BoardPieceKind;
  span: BoardPieceSpan;
  /** Handmade vertical offset from `buildBoard`, added above the piece. */
  drop: number;
};

export type PiecePlacement = {
  column: number;
  columns: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SpanRange = { preferred: number; min: number };

/** The furthest one arriving card may push an already placed card down. */
export const MAX_NUDGE = 160;
/** Each pixel a placed card is nudged costs this many pixels of lift, so a
 * small nudge into a nearby gap beats shoving a card far to land higher. */
const NUDGE_COST = 3;
/** Narrowing a card by a column must lift it at least this far to be worth it. */
const NARROW_COST = 40;
/** A bump sends a card across the board, so it carries this extra cost... */
const BUMP_COST = 200;
/** ...and must leave the board at least this much shorter than landing would. */
const BUMP_MIN_SAVING = 40;

/** How many grid columns a piece wants, and how narrow it may go to move up. */
export function spanRange(piece: PackablePiece, columns: number): SpanRange {
  const range = (preferred: number, min: number): SpanRange => ({
    preferred: Math.min(preferred, columns),
    min: Math.min(min, preferred, columns),
  });
  if (piece.kind === "lead" || columns < 4) return range(columns, columns);
  if (columns >= 12) {
    if (piece.span === "hero") return range(8, 6);
    if (piece.span === "wide") return range(6, 4);
    if (piece.span === "standard") return range(4, 3);
    return range(3, 3);
  }
  if (piece.span === "hero") return range(4, 3);
  if (piece.span === "wide") return range(3, 2);
  return range(2, 2);
}

type Shape = { columns: number; extent: number; pinned: boolean };

/** A card's footprint: its drop, its height and the gap beneath it. */
type Slot = Shape & { column: number; top: number };

/** Slots by piece index. A lifted card leaves a hole until it re-lands. */
type Layout = Array<Slot | undefined>;

type Option = { cost: number; layout: Layout };

const overlaps = (a: Slot, b: Slot) =>
  a.column < b.column + b.columns &&
  b.column < a.column + a.columns &&
  a.top < b.top + b.extent &&
  b.top < a.top + a.extent;

const bottomOf = (layout: Layout) =>
  Math.max(0, ...layout.map((slot) => (slot ? slot.top + slot.extent : 0)));

const cheaper = <T extends { cost: number }>(best: T | undefined, next: T) =>
  !best || next.cost < best.cost ? next : best;

/**
 * Drop `slot` onto the layout, nudging every card at or below its top down
 * until nothing overlaps. Null when the slot would cut into a card above it,
 * or when making room would move the lead or push a card past MAX_NUDGE.
 */
function settle(layout: Layout, slot: Slot): { layout: Layout; nudged: number } | null {
  const placed = layout.flatMap((other, index) => (other ? [{ other, index }] : []));
  if (placed.some(({ other }) => other.top < slot.top && overlaps(other, slot))) return null;

  const fixed = [
    ...placed.filter(({ other }) => other.top < slot.top).map(({ other }) => other),
    slot,
  ];
  const below = placed
    .filter(({ other }) => other.top >= slot.top)
    .sort((a, b) => a.other.top - b.other.top || a.index - b.index);
  const next = [...layout];
  let nudged = 0;

  for (const { other, index } of below) {
    const moved = { ...other };
    for (
      let blocker = fixed.find((candidate) => overlaps(candidate, moved));
      blocker;
      blocker = fixed.find((candidate) => overlaps(candidate, moved))
    ) {
      moved.top = blocker.top + blocker.extent;
    }
    const shift = moved.top - other.top;
    if (shift > 0 && (other.pinned || shift > MAX_NUDGE)) return null;
    nudged += shift;
    next[index] = moved;
    fixed.push(moved);
  }
  return { layout: next, nudged };
}

/** The cheapest spot for card `index` by landing or nudging. */
function land(
  layout: Layout,
  index: number,
  shape: Shape,
  columns: number,
  allowed: (slot: Slot) => boolean = () => true,
): Option | undefined {
  const floor = bottomOf(layout);
  // A card lands at the top of the board or directly under another card; the
  // lowest of these is below everything, so an unrestricted search always
  // finds a spot. Search order doubles as the tie-break: highest, leftmost.
  const shelves = [
    ...new Set([0, ...layout.flatMap((slot) => (slot ? [slot.top + slot.extent] : []))]),
  ].sort((a, b) => a - b);

  let best: Option | undefined;
  for (const top of shelves) {
    for (let column = 0; column + shape.columns <= columns; column += 1) {
      const slot: Slot = { ...shape, column, top };
      if (!allowed(slot)) continue;
      const result = settle(layout, slot);
      if (!result) continue;
      result.layout[index] = slot;
      best = cheaper(best, {
        cost: top + (bottomOf(result.layout) - floor) + NUDGE_COST * result.nudged,
        layout: result.layout,
      });
    }
  }
  return best;
}

export function packBoard(
  pieces: PackablePiece[],
  options: {
    columns: number;
    columnWidth: number;
    gap: number;
    rowGap: number;
    /** Height of piece `index` once it is `width` pixels wide. */
    measure: (index: number, width: number) => number;
  },
): { placements: PiecePlacement[]; height: number } {
  const { columns, columnWidth, gap, rowGap, measure } = options;
  let layout: Layout = [];
  const sizes: Array<{ width: number; height: number }> = [];

  pieces.forEach((piece, index) => {
    const { preferred, min } = spanRange(piece, columns);
    const floor = bottomOf(layout);
    const pinned = piece.kind === "lead";

    // Widest first, so an equal-cost narrower option never wins.
    const shapes: Array<{ shape: Shape; width: number; height: number; narrowing: number }> = [];
    for (let span = preferred; span >= min; span -= 1) {
      const width = span * columnWidth + (span - 1) * gap;
      const height = measure(index, width);
      shapes.push({
        shape: { columns: span, extent: piece.drop + height + rowGap, pinned },
        width,
        height,
        narrowing: NARROW_COST * (preferred - span),
      });
    }

    let best: (Option & { width: number; height: number }) | undefined;
    for (const { shape, width, height, narrowing } of shapes) {
      const landed = land(layout, index, shape, columns);
      if (landed) {
        best = cheaper(best, { ...landed, cost: landed.cost + narrowing, width, height });
      }
    }
    // An unrestricted landing always succeeds. A bump has to beat it by leaving
    // the board genuinely shorter, not merely by scoring a little lower.
    const tallestAllowed = bottomOf(best!.layout) - BUMP_MIN_SAVING;

    for (const { shape, width, height, narrowing } of pinned ? [] : shapes) {
      bump: for (let liftedIndex = 0; liftedIndex < layout.length; liftedIndex += 1) {
        const lifted = layout[liftedIndex];
        if (!lifted || lifted.pinned) continue;
        if (lifted.columns * lifted.extent >= shape.columns * shape.extent) continue;

        // The arriving card takes (part of) the lifted card's spot...
        const without = [...layout];
        without[liftedIndex] = undefined;
        const arrived = land(without, index, shape, columns, (slot) => overlaps(slot, lifted));
        if (!arrived) continue;
        // ...and the lifted card, same width, re-lands wherever suits it best.
        const relanded = land(
          arrived.layout,
          liftedIndex,
          { columns: lifted.columns, extent: lifted.extent, pinned: false },
          columns,
        );
        if (!relanded || bottomOf(relanded.layout) > tallestAllowed) continue;

        let nudged = 0;
        for (let other = 0; other < layout.length; other += 1) {
          if (other === liftedIndex) continue;
          const before = layout[other]!;
          const after = relanded.layout[other]!;
          const shift = after.top - before.top;
          if (after.column !== before.column || shift < 0 || shift > MAX_NUDGE) continue bump;
          nudged += shift;
        }

        best = cheaper(best, {
          cost:
            relanded.layout[index]!.top +
            (bottomOf(relanded.layout) - floor) +
            NUDGE_COST * nudged +
            narrowing +
            BUMP_COST,
          layout: relanded.layout,
          width,
          height,
        });
      }
    }

    layout = best!.layout;
    sizes[index] = { width: best!.width, height: best!.height };
  });

  return {
    placements: layout.map((slot, index) => ({
      column: slot!.column,
      columns: slot!.columns,
      left: slot!.column * (columnWidth + gap),
      top: slot!.top + pieces[index].drop,
      width: sizes[index].width,
      height: sizes[index].height,
    })),
    height: layout.length ? bottomOf(layout) - rowGap : 0,
  };
}
