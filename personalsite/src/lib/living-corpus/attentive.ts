import { choice, type EntryType } from "@typesafe-ai/sdk";
import type { CorpusArtifact, CorpusQuote } from "./types.ts";

const NOTHING = "nothing";
const QUOTE_PREFIX = "quote_";

export function buildAttentiveState(
  artifact: CorpusArtifact,
  trail: Array<Pick<CorpusArtifact, "id" | "title" | "category">>,
) {
  return {
    current_item: {
      id: artifact.id,
      category: artifact.category,
      title: artifact.title,
      summary: artifact.description,
      topics: artifact.topics,
    },
    recent_path: trail.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
    })),
  };
}

export function buildAttentiveQuestion(artifact: CorpusArtifact) {
  const criteria: Record<string, EntryType> = {};

  artifact.quotes.forEach((quote, index) => {
    criteria[`${QUOTE_PREFIX}${index}`] = {
      passage: quote.text,
      heading: quote.heading,
      source: quote.source,
      choose_when:
        "This exact passage adds the strongest concrete detail, reasoning, tension, implementation choice, or outcome beyond the visible summary.",
    };
  });

  criteria[NOTHING] = {
    choose_when:
      "None of the passages adds a genuinely useful next layer. Do not reveal something just to fill the space.",
  };

  return choice(
    [
      "You are shaping a quiet technical portfolio, not chatting with the visitor.",
      "The visitor paused on current_item. Pick one exact existing passage that makes the item more interesting or legible in this moment.",
      "Use recent_path as light context: prefer a new angle over repeating what they just saw.",
      "Choose nothing when the visible summary already says the useful part. Never invent, rewrite, or summarize a passage.",
    ],
    criteria,
  );
}

interface AttentiveAnswer {
  choice: string;
  confidence: number;
  probabilities: Readonly<Record<string, number>>;
}

export interface ResolvedAttentiveQuote {
  quote: CorpusQuote | null;
  confidence: number;
}

export function resolveAttentiveQuote(
  artifact: CorpusArtifact,
  answer: AttentiveAnswer,
): ResolvedAttentiveQuote {
  if (answer.choice === NOTHING) {
    return { quote: null, confidence: answer.confidence };
  }

  const match = new RegExp(`^${QUOTE_PREFIX}(\\d+)$`).exec(answer.choice);
  const quoteIndex = match ? Number(match[1]) : Number.NaN;
  const quote = artifact.quotes[quoteIndex];
  const selectedProbability = Number(answer.probabilities[answer.choice] ?? 0);
  const nothingProbability = Number(answer.probabilities[NOTHING] ?? 0);
  const optionCount = artifact.quotes.length + 1;
  const lowRiskThreshold = Math.max(0.24, 1 / optionCount + 0.05);

  if (
    !quote ||
    !Number.isFinite(selectedProbability) ||
    selectedProbability < lowRiskThreshold ||
    selectedProbability <= nothingProbability
  ) {
    return { quote: null, confidence: answer.confidence };
  }

  return { quote, confidence: answer.confidence };
}
