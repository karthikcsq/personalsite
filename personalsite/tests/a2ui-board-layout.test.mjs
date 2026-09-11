import test from "node:test";
import assert from "node:assert/strict";
import { MAX_NUDGE, packBoard, spanRange } from "../src/a2ui/boardLayout.ts";

const piece = (kind, span, drop = 0) => ({ kind, span, drop });

const layout = (pieces, heights, columns = 12) =>
  packBoard(pieces, {
    columns,
    columnWidth: 60,
    gap: 20,
    rowGap: 20,
    measure: (index) => heights[index],
  });

function assertNoOverlap(placements, columns) {
  placements.forEach((a, i) => {
    assert.ok(a.column >= 0 && a.column + a.columns <= columns, `piece ${i} stays on the board`);
    placements.slice(i + 1).forEach((b, offset) => {
      const sideBySide = a.column + a.columns <= b.column || b.column + b.columns <= a.column;
      const stacked = a.top + a.height <= b.top || b.top + b.height <= a.top;
      assert.ok(sideBySide || stacked, `pieces ${i} and ${i + offset + 1} overlap`);
    });
  });
}

test("cards move up beneath a short card instead of waiting for the row to end", () => {
  // The reported board: a wide note beside a much taller card.
  const pieces = [
    piece("lead", "hero"),
    piece("note", "hero"),
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("quote", "wide"),
  ];
  const { placements } = layout(pieces, [100, 470, 870, 400, 300]);
  const [, note, tall, under, quote] = placements;
  const noteBottom = note.top + note.height + 20;

  assert.equal(tall.column, 8);
  assert.equal(under.column, 0);
  assert.equal(under.top, noteBottom);
  // The quote narrows to slot into the rest of the hole beside the tall card
  // rather than dropping below it.
  assert.equal(quote.top, noteBottom);
  assert.equal(quote.column, 4);
  assert.equal(quote.columns, spanRange(piece("quote", "wide"), 12).min);
  assert.ok(quote.top < tall.top + tall.height);
  assertNoOverlap(placements, 12);
});

test("a later card fills a gap sealed under an earlier wide card", () => {
  const pieces = [
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("note", "hero"),
    piece("fact", "standard"),
  ];
  // The middle card is too big to bump, so the wide card drops below it.
  const { placements } = layout(pieces, [200, 700, 200, 300, 150]);
  const [short, , , wide, later] = placements;

  assert.equal(wide.top, 720);
  // The next card climbs back into the space under the first short card.
  assert.equal(later.column, short.column);
  assert.equal(later.top, short.top + short.height + 20);
  assert.ok(later.top < wide.top);
  assertNoOverlap(placements, 12);
});

test("a card lands in a slightly short gap and nudges the card below it down", () => {
  const pieces = [
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("note", "hero"),
    piece("fact", "standard"),
  ];
  // The hero card spans a short and a tall column, leaving a 100px gap above
  // it on the left; the last card needs 120px including its gap.
  const heights = [180, 280, 280, 200, 100];
  const before = layout(pieces.slice(0, 4), heights).placements;
  const { placements } = layout(pieces, heights);
  const [, , , hero, later] = placements;

  assert.equal(before[3].top, 300);
  assert.equal(later.column, 0);
  assert.equal(later.top, 200);
  assert.equal(hero.column, before[3].column);
  assert.equal(hero.top, 320);
  assertNoOverlap(placements, 12);
});

test("a tall card that arrives late bumps a short card into another column", () => {
  const pieces = [
    piece("lead", "hero"),
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("note", "hero"),
    piece("diagram", "standard"),
  ];
  const heights = [100, 200, 200, 200, 180, 650];
  const before = layout(pieces.slice(0, 5), heights).placements;
  const { placements, height } = layout(pieces, heights);
  const [, , , bumped, note, tall] = placements;

  // Without the bump the tall card could only go below the third fact, 990px.
  assert.equal(before[3].column, 8);
  assert.equal(tall.column, 8);
  assert.equal(tall.top, 120);
  // The fact it lifted re-lands, same width, under the note.
  assert.equal(bumped.column, 0);
  assert.equal(bumped.columns, before[3].columns);
  assert.equal(bumped.top, note.top + note.height + 20);
  assert.equal(height, 770);
  assertNoOverlap(placements, 12);
});

test("a bump only happens when it makes the board shorter", () => {
  const pieces = [
    piece("lead", "hero"),
    piece("note", "hero"),
    piece("fact", "standard"),
    piece("quote", "hero"),
    piece("fact", "standard"),
    piece("fact", "standard"),
    piece("fact", "standard"),
  ];
  const { placements } = layout(pieces, [100, 200, 200, 600, 200, 200, 200]);
  const [, note] = placements;

  // The tall quote is too wide to sit beside the fact, so lifting the main note
  // for it would only re-land the note at the bottom with no height saved. The
  // cheaper-looking bump is refused and the note stays directly under the lead.
  assert.equal(note.column, 0);
  assert.equal(note.top, 120);
  assertNoOverlap(placements, 12);
});

test("an arriving card nudges placed cards down and bumps at most one aside", () => {
  const kinds = [
    ["lead", "hero"],
    ["note", "hero"],
    ["fact", "narrow"],
    ["fact", "standard"],
    ["photo", "wide"],
    ["quote", "hero"],
    ["fact", "narrow"],
    ["option", "standard"],
    ["diagram", "wide"],
    ["fact", "standard"],
  ];
  const pieces = kinds.map(([kind, span], index) =>
    piece(kind, span, index === 0 ? 0 : [0, 10, 18][index % 3]),
  );
  const heights = [90, 420, 260, 510, 380, 300, 180, 240, 700, 150];

  for (const columns of [12, 4]) {
    for (let count = 1; count < pieces.length; count += 1) {
      const previous = layout(pieces.slice(0, count), heights, columns).placements;
      const next = layout(pieces.slice(0, count + 1), heights, columns).placements;
      const bumped = previous.filter((placed, index) => {
        const now = next[index];
        const shift = now.top - placed.top;
        return now.column !== placed.column || shift < 0 || shift > MAX_NUDGE;
      });
      assert.ok(bumped.length <= 1, `${bumped.length} cards were moved aside at once`);
      previous.forEach((placed, index) => {
        assert.equal(next[index].columns, placed.columns, `card ${index} changed width`);
      });
      assert.equal(next[0].top, previous[0].top, "the lead moved");
      assertNoOverlap(next, columns);
    }
  }
});

test("the lead spans the board and is never pushed", () => {
  for (const columns of [12, 4]) {
    const { placements } = layout([piece("lead", "hero"), piece("fact", "narrow")], [80, 120], columns);
    assert.equal(placements[0].columns, columns);
    assert.equal(placements[0].top, 0);
    assert.equal(placements[1].top, 100);
  }
});

test("cards never grow past the width their content asked for", () => {
  const pieces = [piece("photo", "wide"), piece("fact", "narrow"), piece("note", "hero")];
  const { placements } = layout(pieces, [300, 200, 250]);
  pieces.forEach((value, index) => {
    assert.ok(placements[index].columns <= spanRange(value, 12).preferred);
  });
});
