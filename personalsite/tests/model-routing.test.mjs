import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getModelRoutingConfig,
  selectAnswerRoute,
  shouldRunHydeAfterBaseline,
  shouldStartHydeBeforeBaseline,
  summarizeUsage,
} from "../src/utils/modelRouting.ts";
import {
  getRewriteCache,
  getSuggestedReplyCache,
  setRewriteCache,
  setSuggestedReplyCache,
} from "../src/utils/chatCache.ts";
import {
  isHostSuggestedQuestion,
  normalizeSuggestedQuestion,
} from "../src/data/chatSuggestions.ts";

const chatCacheSource = readFileSync(
  new URL("../src/utils/chatCache.ts", import.meta.url),
  "utf8",
);

test("routing defaults keep visual work on Luna and narrow facts on Mini", () => {
  const config = getModelRoutingConfig({});
  assert.equal(config.answerFastModel, "gpt-5-mini");
  assert.equal(config.answerQualityModel, "gpt-5.6-luna");
  assert.equal(config.a2uiModel, "gpt-5.6-luna");
  assert.equal(config.rewriteModel, "gpt-5.4-nano");
  assert.equal(config.quoteModel, "gpt-5.4-nano");
  assert.equal(config.hydeMode, "adaptive");
});

test("legacy answer override keeps isolated model benchmarks deterministic", () => {
  const config = getModelRoutingConfig({
    OPENAI_ANSWER_MODEL: "benchmark-model",
  });
  assert.equal(config.answerFastModel, "benchmark-model");
  assert.equal(config.answerQualityModel, "benchmark-model");
});

test("simple supported facts use Mini while narrative questions keep Luna", () => {
  const config = getModelRoutingConfig({});
  assert.deepEqual(
    selectAnswerRoute({
      config,
      query: "What does Karthik study at Purdue?",
      baselineStrong: true,
      conversationMessageCount: 1,
    }),
    {
      route: "fast",
      model: "gpt-5-mini",
      reason: "simple_fact",
    },
  );
  assert.equal(
    selectAnswerRoute({
      config,
      query: "How has Karthik's work evolved over time?",
      baselineStrong: true,
      conversationMessageCount: 1,
    }).route,
    "quality",
  );
  assert.equal(
    selectAnswerRoute({
      config,
      query: "What does he do at buildpurdue?",
      baselineStrong: true,
      conversationMessageCount: 1,
    }).route,
    "quality",
  );
});

test("weak retrieval and multi-turn questions always keep the quality model", () => {
  const config = getModelRoutingConfig({});
  assert.equal(
    selectAnswerRoute({
      config,
      query: "What does Karthik study at Purdue?",
      baselineStrong: false,
      conversationMessageCount: 1,
    }).reason,
    "weak_retrieval",
  );
  assert.equal(
    selectAnswerRoute({
      config,
      query: "What does Karthik study at Purdue?",
      baselineStrong: true,
      conversationMessageCount: 3,
    }).reason,
    "multi_turn",
  );
});

test("adaptive HyDE only runs after a weak baseline", () => {
  const config = getModelRoutingConfig({});
  assert.equal(shouldStartHydeBeforeBaseline({ config }), false);
  assert.equal(
    shouldRunHydeAfterBaseline({ config, baselineStrong: true }),
    false,
  );
  assert.equal(
    shouldRunHydeAfterBaseline({ config, baselineStrong: false }),
    true,
  );
});

test("usage summaries preserve cached and generated token totals", () => {
  assert.deepEqual(
    summarizeUsage([
      {
        stage: "answer",
        model: "gpt-5-mini",
        inputTokens: 100,
        outputTokens: 20,
        cachedInputTokens: 80,
        totalTokens: 120,
      },
      {
        stage: "a2ui_compose",
        model: "gpt-5.6-luna",
        inputTokens: 50,
        outputTokens: 30,
        cachedInputTokens: 0,
        totalTokens: 80,
      },
    ]),
    {
      inputTokens: 150,
      outputTokens: 50,
      cachedInputTokens: 80,
      totalTokens: 200,
    },
  );
});

test("host-authored suggestions normalize safely and gate reply caching", () => {
  assert.equal(
    normalizeSuggestedQuestion("  What's Caladrius??? "),
    "what's caladrius",
  );
  assert.equal(isHostSuggestedQuestion("What's Caladrius?"), true);
  assert.equal(isHostSuggestedQuestion("Tell me a joke"), false);
});

test("rewrite and suggested reply caches round-trip without freezing A2UI", async () => {
  assert.match(chatCacheSource, /REWRITE_CACHE_SCHEMA = "v3"/);
  assert.match(chatCacheSource, /SUGGESTED_REPLY_CACHE_SCHEMA = "v3"/);
  const rewriteQuestion = `Where did he work ${Date.now()}?`;
  const rewrites = ["one", "two", "three"];
  await setRewriteCache(rewriteQuestion, rewrites);
  assert.deepEqual(await getRewriteCache(rewriteQuestion), rewrites);

  await setSuggestedReplyCache("What's Caladrius?", {
    reply: "Caladrius is a privacy-first hospital triage assistant.",
    artifacts: [
      {
        kind: "project",
        id: "project:caladrius",
        data: { title: "Caladrius" },
      },
    ],
  });
  const cached = await getSuggestedReplyCache("What's Caladrius?");
  assert.equal(cached?.reply.includes("privacy-first"), true);
  assert.equal("a2ui" in (cached || {}), false);

  await setSuggestedReplyCache("Tell me a joke", {
    reply: "This must not be shared.",
    artifacts: [],
  });
  assert.equal(await getSuggestedReplyCache("Tell me a joke"), null);
});
