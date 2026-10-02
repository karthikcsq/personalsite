import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFailureCandidates,
  buildWhatBrokeQuestions,
  resolveWhatBroke,
} from "../src/lib/living-corpus/whatBroke.ts";

function artifact(id, title, sections) {
  return {
    id,
    category: "projects",
    title,
    meta: "2026",
    description: `${title} description`,
    referenceItems: [],
    href: `/notes/${id}`,
    topics: ["failure"],
    quotes: sections,
    sections,
  };
}

const payload = {
  artifacts: [
    artifact("project:a", "A", [
      {
        id: "wrong",
        heading: "What I got wrong",
        text: "I made the mistake of requiring manual authentication before the first useful action.",
        href: "/notes/a#wrong",
        source: "A",
      },
    ]),
    artifact("project:b", "B", [
      {
        id: "constraint",
        heading: "The hard part",
        text: "The first approach was too slow to work inside the real hardware constraint.",
        href: "/notes/b#constraint",
        source: "B",
      },
    ]),
    artifact("project:c", "C", [
      {
        id: "lesson",
        heading: "What the paper got wrong",
        text: "The evaluation was inconsistent, so I would build the comparison around repeated trials instead.",
        href: "/notes/c#lesson",
        source: "C",
      },
    ]),
    artifact("project:d", "D", [
      {
        id: "success",
        heading: "What worked",
        text: "The final approach shipped and met every target.",
        href: "/notes/d#success",
        source: "D",
      },
    ]),
  ],
};

test("failure candidates are exact source sections, not generated summaries", () => {
  const candidates = buildFailureCandidates(payload);
  assert.deepEqual(
    candidates.map((candidate) => candidate.source).sort(),
    ["A", "B", "C"],
  );
  assert.equal(
    candidates.find((candidate) => candidate.source === "A")?.text,
    payload.artifacts[0].sections[0].text,
  );
});

test("TypeSafe receives three bounded selection judgments", () => {
  const candidates = buildFailureCandidates(payload);
  const questions = buildWhatBrokeQuestions(candidates);
  assert.deepEqual(Object.keys(questions), [
    "wrong_assumption",
    "failed_approach",
    "build_differently",
  ]);
  assert.ok(Object.values(questions).every((question) => question.type === "choice"));
});

test("selection deduplicates model choices and fills from different sources", () => {
  const candidates = buildFailureCandidates(payload);
  const answer = {
    choice: "candidate_0",
    confidence: 0.8,
    probabilities: { candidate_0: 0.7, no_match: 0.1 },
  };
  const selected = resolveWhatBroke(candidates, {
    wrong_assumption: answer,
    failed_approach: answer,
    build_differently: answer,
  });

  assert.equal(selected.excerpts.length, 3);
  assert.equal(new Set(selected.excerpts.map((item) => item.source)).size, 3);
});

test("different passages from the same artifact never occupy two slots", () => {
  const repeatedSourcePayload = {
    artifacts: payload.artifacts.map((item, index) =>
      index === 0
        ? {
            ...item,
            sections: [
              ...item.sections,
              {
                id: "failed",
                heading: "A failed approach",
                text: "A second approach failed because the dependency could not support the workload.",
                href: "/notes/a#failed",
                source: "A",
              },
            ],
          }
        : item,
    ),
  };
  const candidates = buildFailureCandidates(repeatedSourcePayload);
  const firstA = candidates.findIndex((item) => item.source === "A");
  const secondA = candidates.findIndex(
    (item, index) => item.source === "A" && index !== firstA,
  );
  assert.notEqual(secondA, -1);

  const answer = (index) => ({
    choice: `candidate_${index}`,
    confidence: 0.8,
    probabilities: { [`candidate_${index}`]: 0.7, no_match: 0.1 },
  });
  const selected = resolveWhatBroke(candidates, {
    wrong_assumption: answer(firstA),
    failed_approach: answer(secondA),
    build_differently: answer(secondA),
  });

  assert.equal(new Set(selected.excerpts.map((item) => item.artifactId)).size, 3);
});
