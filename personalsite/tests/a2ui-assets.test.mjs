import assert from "node:assert/strict";
import test from "node:test";

import { matchA2UIVisualAsset } from "../src/a2ui/assetCatalog.ts";

test("specific Repple concepts outrank the generic project-name match", () => {
  assert.equal(
    matchA2UIVisualAsset(
      "Repple turns workout logging and streaks into a consistency loop.",
    ),
    "repple-consistency",
  );
  assert.equal(
    matchA2UIVisualAsset("Repple pairs friends in a weekly matchup."),
    "repple-matchup",
  );
});

test("semantic system assets require a meaningful phrase match", () => {
  assert.equal(
    matchA2UIVisualAsset("The work uses an agent control plane."),
    "agent-control-plane",
  );
  assert.equal(matchA2UIVisualAsset("General background context"), undefined);
});
