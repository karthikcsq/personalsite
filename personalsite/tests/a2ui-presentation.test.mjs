import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  arrangementForComponent,
  compositionCandidates,
  mixPresentationSeed,
  presentA2UIComponent,
  presentationTypeCandidates,
} from "../src/a2ui/presentation.ts";

const styles = readFileSync(
  new URL("../src/app/components/a2ui/a2ui.module.css", import.meta.url),
  "utf8",
);

function component(type, itemCount = 2) {
  return {
    id: `fixture-${type}`,
    type,
    title: "A complete answer",
    body: "The component carries the supporting context.",
    items: Array.from({ length: itemCount }, (_, index) => ({
      label: `Item ${index + 1}`,
      value: `Value ${index + 1}`,
      detail: `Detail ${index + 1}`,
      artifactId: index === 0 ? "projects/repple" : "",
      assetId: "",
    })),
    options: [],
    artifactIds: ["projects/repple"],
    quoteIds: [],
  };
}

test("compact answers expose every host composition without losing determinism", () => {
  const compact = component("artifact_focus", 2);
  const candidates = compositionCandidates(
    compact,
    ["stacked"],
    [component("narrative", 1)],
  );

  assert.deepEqual(
    new Set(candidates),
    new Set([
      "stacked",
      "split_primary_left",
      "split_primary_right",
      "primary_top",
    ]),
  );

  const compositions = new Set(
    Array.from({ length: 96 }, (_, seed) => {
      const index =
        mixPresentationSeed(seed, "document:composition") % candidates.length;
      return candidates[index];
    }),
  );

  assert.deepEqual(
    compositions,
    new Set([
      "stacked",
      "split_primary_left",
      "split_primary_right",
      "primary_top",
    ]),
  );

  const seed = 8124;
  const index =
    mixPresentationSeed(seed, "document:composition") % candidates.length;
  const repeatedCandidates = compositionCandidates(
    compact,
    ["stacked"],
    [component("narrative", 1)],
  );
  assert.equal(candidates[index], repeatedCandidates[index]);
});

test("four and six stage sequences never enter a narrow split column", () => {
  for (const itemCount of [4, 6]) {
    const candidates = compositionCandidates(
      component("timeline", itemCount),
      ["split_primary_left", "split_primary_right"],
      [component("narrative", 1)],
    );

    assert.deepEqual(candidates, ["primary_top", "stacked"]);
  }
});

test("a dense supporting timeline never enters a split or narrow support rail", () => {
  const candidates = compositionCandidates(
    component("narrative", 1),
    ["split_primary_left", "split_primary_right", "primary_top"],
    [component("timeline", 6)],
  );

  assert.deepEqual(candidates, ["primary_top", "stacked"]);
  assert.match(
    styles,
    /> \.supporting:has\(> \.timelineComponent\)[\s\S]*?width: 100%/,
  );
});

test("artifact presentations can move beyond the notebook family", () => {
  const artifact = component("artifact_focus", 4);
  assert.ok(presentationTypeCandidates(artifact).includes("essay_margin"));
  assert.equal(
    presentationTypeCandidates(artifact).includes("specimen_board"),
    false,
  );

  const presentations = new Set(
    Array.from({ length: 96 }, (_, seed) =>
      presentA2UIComponent(artifact, seed, "primary").type,
    ),
  );
  assert.ok(presentations.size >= 4);
});

test("specimen boards are reserved for several distinct artifacts", () => {
  const specimens = component("specimen_board", 3);
  specimens.artifactIds = [];
  specimens.items = specimens.items.map((item, index) => ({
    ...item,
    artifactId: `project:item-${index + 1}`,
  }));

  assert.ok(
    presentationTypeCandidates(specimens).includes("specimen_board"),
  );

  const singleArtifact = component("specimen_board", 4);
  assert.equal(
    presentationTypeCandidates(singleArtifact).includes("specimen_board"),
    false,
  );
});

test("item arrangement is stable for a cached seed and varied across fresh seeds", () => {
  const narrative = component("narrative", 4);
  assert.equal(
    arrangementForComponent(narrative, 9217, "primary"),
    arrangementForComponent(narrative, 9217, "primary"),
  );

  const arrangements = new Set(
    Array.from({ length: 96 }, (_, seed) =>
      arrangementForComponent(narrative, seed, "primary"),
    ),
  );
  assert.deepEqual(arrangements, new Set(["balanced", "lead", "rail"]));
});

test("responsive styles reserve the dock and protect dense stage layouts", () => {
  assert.match(
    styles,
    /--a2ui-composer-clearance:[\s\S]*env\(safe-area-inset-bottom\)/,
  );
  assert.match(
    styles,
    /\.canvas\s*\{[\s\S]*padding:[\s\S]*var\(--a2ui-composer-clearance\);[\s\S]*scroll-padding-bottom: var\(--a2ui-composer-clearance\)/,
  );
  assert.match(
    styles,
    /ol\[data-count="4"\][\s\S]*li:nth-child\(4\)[\s\S]*grid-column: 1 \/ -1/,
  );
  assert.match(
    styles,
    /\.foldStrip\[data-count="4"\][\s\S]*grid-template-columns: repeat\(3,[\s\S]*> :last-child[\s\S]*grid-column: 1 \/ -1/,
  );
});
