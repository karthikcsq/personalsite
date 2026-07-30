export type AnswerRoute = "fast" | "quality";
export type AnswerRoutingMode = "hybrid" | "fast_only" | "quality_only";
export type HydeMode = "adaptive" | "speculative" | "off";
export type ReasoningEffort = "low" | "medium" | "high";

export interface ModelRoutingConfig {
  answerFastModel: string;
  answerQualityModel: string;
  answerReasoningEffort: ReasoningEffort;
  answerRoutingMode: AnswerRoutingMode;
  rewriteModel: string;
  embeddingModel: string;
  quoteModel: string;
  topicModel: string;
  a2uiModel: string;
  a2uiReasoningEffort: ReasoningEffort;
  hydeMode: HydeMode;
}

export interface AnswerRouteDecision {
  route: AnswerRoute;
  model: string;
  reason:
    | "forced_fast"
    | "forced_quality"
    | "weak_retrieval"
    | "multi_turn"
    | "complex_question"
    | "simple_fact"
    | "quality_default";
}

export interface ModelUsageRecord {
  stage:
    | "retrieval_rewrite"
    | "baseline_embedding"
    | "expanded_embedding"
    | "answer"
    | "quote_picker"
    | "topic_extractor"
    | "a2ui_compose"
    | "a2ui_repair";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
}

type Environment = Record<string, string | undefined>;

function valueOr(env: Environment, key: string, fallback: string): string {
  return env[key]?.trim() || fallback;
}

function parseRoutingMode(value: string | undefined): AnswerRoutingMode {
  if (value === "fast_only" || value === "quality_only") return value;
  return "hybrid";
}

function parseHydeMode(value: string | undefined): HydeMode {
  if (value === "speculative" || value === "off") return value;
  return "adaptive";
}

function parseReasoningEffort(
  value: string | undefined,
  fallback: ReasoningEffort,
): ReasoningEffort {
  if (value === "medium" || value === "high") return value;
  if (value === "low") return value;
  return fallback;
}

export function getModelRoutingConfig(
  env: Environment = process.env,
): ModelRoutingConfig {
  const legacyAnswerModel = env.OPENAI_ANSWER_MODEL?.trim();
  return {
    answerFastModel: valueOr(
      env,
      "OPENAI_ANSWER_FAST_MODEL",
      legacyAnswerModel || "gpt-5-mini",
    ),
    answerQualityModel: valueOr(
      env,
      "OPENAI_ANSWER_QUALITY_MODEL",
      legacyAnswerModel || "gpt-5.6-luna",
    ),
    answerReasoningEffort: parseReasoningEffort(
      env.OPENAI_ANSWER_REASONING_EFFORT,
      "low",
    ),
    answerRoutingMode: parseRoutingMode(env.OPENAI_ANSWER_ROUTING_MODE),
    rewriteModel: valueOr(
      env,
      "OPENAI_REWRITE_MODEL",
      "gpt-5.4-nano",
    ),
    embeddingModel: valueOr(
      env,
      "OPENAI_EMBEDDING_MODEL",
      "text-embedding-3-small",
    ),
    quoteModel: valueOr(env, "OPENAI_QUOTE_MODEL", "gpt-5.4-nano"),
    topicModel: valueOr(env, "OPENAI_TOPIC_MODEL", "gpt-5.4-nano"),
    a2uiModel: valueOr(env, "OPENAI_A2UI_MODEL", "gpt-5.6-luna"),
    a2uiReasoningEffort: parseReasoningEffort(
      env.OPENAI_A2UI_REASONING_EFFORT,
      "low",
    ),
    hydeMode: parseHydeMode(env.OPENAI_HYDE_MODE),
  };
}

const COMPLEX_QUESTION =
  /\b(?:why|how|compare|versus|vs\.?|difference|differ|evolv|journey|timeline|career|history|think|believe|view|opinion|approach|philosophy|favorite|best|most impressive|tell me about|explain|walk me through|what does (?:he|karthik) do at|what did (?:he|karthik) build at)\b/i;

const SIMPLE_FACT =
  /\b(?:study|studying|major|degree|graduate|graduating|graduation|school|university|college|instrument|piano|hometown|where (?:is|does) (?:he|karthik) (?:study|live)|when (?:does|will) (?:he|karthik) graduate)\b/i;

export function selectAnswerRoute(input: {
  config: ModelRoutingConfig;
  query: string;
  baselineStrong: boolean;
  conversationMessageCount: number;
}): AnswerRouteDecision {
  const { config, query, baselineStrong, conversationMessageCount } = input;

  if (config.answerRoutingMode === "fast_only") {
    return {
      route: "fast",
      model: config.answerFastModel,
      reason: "forced_fast",
    };
  }
  if (config.answerRoutingMode === "quality_only") {
    return {
      route: "quality",
      model: config.answerQualityModel,
      reason: "forced_quality",
    };
  }
  if (!baselineStrong) {
    return {
      route: "quality",
      model: config.answerQualityModel,
      reason: "weak_retrieval",
    };
  }
  if (conversationMessageCount > 1) {
    return {
      route: "quality",
      model: config.answerQualityModel,
      reason: "multi_turn",
    };
  }
  if (COMPLEX_QUESTION.test(query)) {
    return {
      route: "quality",
      model: config.answerQualityModel,
      reason: "complex_question",
    };
  }
  if (SIMPLE_FACT.test(query)) {
    return {
      route: "fast",
      model: config.answerFastModel,
      reason: "simple_fact",
    };
  }
  return {
    route: "quality",
    model: config.answerQualityModel,
    reason: "quality_default",
  };
}

export function shouldStartHydeBeforeBaseline(input: {
  config: ModelRoutingConfig;
}): boolean {
  return input.config.hydeMode === "speculative";
}

export function shouldRunHydeAfterBaseline(input: {
  config: ModelRoutingConfig;
  baselineStrong: boolean;
}): boolean {
  return input.config.hydeMode !== "off" && !input.baselineStrong;
}

export function summarizeUsage(records: ModelUsageRecord[]) {
  return records.reduce(
    (summary, record) => {
      summary.inputTokens += record.inputTokens;
      summary.outputTokens += record.outputTokens;
      summary.cachedInputTokens += record.cachedInputTokens;
      summary.totalTokens += record.totalTokens;
      return summary;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      totalTokens: 0,
    },
  );
}

export function toUsageRecord(
  stage: ModelUsageRecord["stage"],
  model: string,
  usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number } | null;
      }
    | null
    | undefined,
): ModelUsageRecord | null {
  if (!usage) return null;
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  return {
    stage,
    model,
    inputTokens,
    outputTokens,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens || 0,
    totalTokens: usage.total_tokens || inputTokens + outputTokens,
  };
}
