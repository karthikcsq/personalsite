import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAttentiveQuestion,
  buildAttentiveState,
  resolveAttentiveQuote,
} from "../src/lib/living-corpus/attentive.ts";

const artifact = {
  id: "project:signal-garden",
  category: "projects",
  title: "Signal Garden",
  meta: "2026",
  description: "A visible summary.",
  href: "/projects#signal-garden",
  topics: ["agents", "tools"],
  quotes: [
    {
      id: "implementation",
      heading: "Implementation",
      text: "The system keeps the fast path local and asks a model only for judgment.",
      href: "/notes/signal-garden#implementation",
      source: "Signal Garden",
    },
    {
      id: "tradeoff",
      heading: "The tradeoff",
      text: "The hard part was making uncertainty visible without making the interface noisy.",
      href: "/notes/signal-garden#tradeoff",
      source: "Signal Garden",
    },
  ],
};

test("the attentive question offers every exact quote plus a deliberate no-reveal option", () => {
  const question = buildAttentiveQuestion(artifact);

  assert.equal(question.type, "choice");
  assert.deepEqual(Object.keys(question.criteria), ["quote_0", "quote_1", "nothing"]);
  assert.equal(question.criteria.quote_0.passage, artifact.quotes[0].text);
  assert.match(question.instructions.join(" "), /Never invent, rewrite, or summarize/i);
});

test("recent browsing is context, while the selected result stays server-owned", () => {
  const state = buildAttentiveState(artifact, [
    { id: "work:lab", title: "A lab", category: "work" },
  ]);
  const selected = resolveAttentiveQuote(artifact, {
    choice: "quote_1",
    confidence: 0.67,
    probabilities: { quote_0: 0.18, quote_1: 0.62, nothing: 0.2 },
  });

  assert.equal(state.recent_path[0].id, "work:lab");
  assert.equal(selected.quote, artifact.quotes[1]);
  assert.equal(selected.confidence, 0.67);
});

test("weak, invalid, or no-match decisions reveal nothing", () => {
  assert.equal(
    resolveAttentiveQuote(artifact, {
      choice: "nothing",
      confidence: 0.8,
      probabilities: { quote_0: 0.1, quote_1: 0.1, nothing: 0.8 },
    }).quote,
    null,
  );
  assert.equal(
    resolveAttentiveQuote(artifact, {
      choice: "quote_99",
      confidence: 0.7,
      probabilities: { quote_99: 0.7, nothing: 0.3 },
    }).quote,
    null,
  );
  assert.equal(
    resolveAttentiveQuote(artifact, {
      choice: "quote_0",
      confidence: 0.1,
      probabilities: { quote_0: 0.2, quote_1: 0.19, nothing: 0.18 },
    }).quote,
    null,
  );
});
