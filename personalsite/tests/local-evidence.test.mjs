import assert from "node:assert/strict";
import test from "node:test";

import {
  findLocalEvidence,
  formatLocalEvidenceContext,
} from "../src/utils/localEvidence.ts";

test("exact portfolio questions surface their authoritative local record", () => {
  const matches = findLocalEvidence("Show me his favorite project.");

  assert.ok(matches.length > 0);
  assert.match(matches[0].text, /favorite project is Repple/i);
  assert.match(
    formatLocalEvidenceContext(matches),
    /outrank conflicting or stale retrieved chunks/i,
  );
});

test("award records preserve second place as a win", () => {
  const matches = findLocalEvidence("What awards has Karthik won?");
  const combined = matches.map((match) => match.text).join("\n");

  assert.match(combined, /2nd Place at HackGT with Caladrius/i);
});

test("unrelated questions do not inject arbitrary local evidence", () => {
  assert.deepEqual(findLocalEvidence("Can you solve this calculus problem?"), []);
});
