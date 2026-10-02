import { choice, type EntryType } from "@typesafe-ai/sdk";
import type {
  FailureExcerpt,
  LivingCorpusPayload,
} from "./types.ts";

const NO_MATCH = "no_match";
const STRONG_HEADING =
  /\b(?:what (?:i|we|the .+?) (?:got|gets?) wrong|why .+ (?:failed|died)|where .+ fail|hard part|constraint|limitation|mistake|abandoned|didn.t work)\b/i;
const FAILURE_LANGUAGE =
  /\b(?:got wrong|gets wrong|mistake|failed|failure|didn.t work|couldn.t|cannot|hard part|constraint|limitation|frustrat|abandon|died|too slow|low quality|if i (?:rebuilt|did|started)|build differently)\b/i;

interface RankedFailureExcerpt extends FailureExcerpt {
  rank: number;
}

interface ChoiceAnswer {
  choice: string;
  confidence: number;
  probabilities: Readonly<Record<string, number>>;
}

export interface WhatBrokeAnswers {
  wrong_assumption: ChoiceAnswer;
  failed_approach: ChoiceAnswer;
  build_differently: ChoiceAnswer;
}

export function buildFailureCandidates(
  corpus: LivingCorpusPayload,
): RankedFailureExcerpt[] {
  const candidates: RankedFailureExcerpt[] = [];

  for (const artifact of corpus.artifacts) {
    for (const section of artifact.sections) {
      const headingMatch = STRONG_HEADING.test(section.heading);
      const textMatch = FAILURE_LANGUAGE.test(section.text);
      if (!headingMatch && !textMatch) continue;

      const lowerHeading = section.heading.toLowerCase();
      const rank =
        Number(headingMatch) * 8 +
        Number(/got wrong|gets wrong|mistake/.test(lowerHeading)) * 5 +
        Number(/fail|died|didn.t work/.test(lowerHeading)) * 4 +
        Number(/hard part|constraint|limitation/.test(lowerHeading)) * 3 +
        Math.min(section.text.length / 420, 2);

      candidates.push({
        id: `${artifact.id}::${section.id}`,
        artifactId: artifact.id,
        category: artifact.category,
        source: artifact.title,
        meta: artifact.meta,
        heading: section.heading,
        text: section.text,
        href: section.href,
        rank,
      });
    }
  }

  return candidates
    .sort((left, right) => right.rank - left.rank)
    .filter(
      (candidate, index, all) =>
        all.findIndex((item) => item.id === candidate.id) === index,
    )
    .slice(0, 18);
}

export function buildWhatBrokeState(
  candidates: readonly RankedFailureExcerpt[],
  recentPath: readonly string[],
  activeCategory: string | null,
) {
  return {
    visitor_context: {
      recently_read: [...recentPath],
      active_category: activeCategory,
    },
    candidates: candidates.map((candidate, index) => ({
      option: `candidate_${index}`,
      source: candidate.source,
      category: candidate.category,
      heading: candidate.heading,
      exact_passage: candidate.text,
    })),
  };
}

function candidateCriteria(candidates: readonly RankedFailureExcerpt[]) {
  const criteria: Record<string, EntryType> = {};
  candidates.forEach((candidate, index) => {
    criteria[`candidate_${index}`] = {
      passage: `The exact passage at candidates[${index}].exact_passage`,
      source: candidate.source,
      heading: candidate.heading,
    };
  });
  criteria[NO_MATCH] = {
    choose_when: "No candidate honestly fits this judgment. Do not force one.",
  };
  return criteria;
}

export function buildWhatBrokeQuestions(
  candidates: readonly RankedFailureExcerpt[],
) {
  const criteria = candidateCriteria(candidates);
  return {
    wrong_assumption: choice(
      [
        "Pick the exact passage that most honestly shows something Karthik or his team got wrong.",
        "Prefer a concrete mistaken assumption or design decision over broad advice about failure.",
        "The passage must stand on its own without a generated explanation.",
      ],
      criteria,
    ),
    failed_approach: choice(
      [
        "Pick the exact passage with the clearest abandoned, failed, brittle, or sharply constrained approach.",
        "Prefer firsthand technical or product evidence over a generic opinion.",
      ],
      criteria,
    ),
    build_differently: choice(
      [
        "Pick the exact passage that gives the clearest evidence of what Karthik would now build, scope, or approach differently.",
        "A useful lesson must be visible in the passage itself. Do not infer or write a conclusion.",
      ],
      criteria,
    ),
  };
}

function selectedCandidate(
  candidates: readonly RankedFailureExcerpt[],
  answer: ChoiceAnswer,
): RankedFailureExcerpt | null {
  const match = /^candidate_(\d+)$/.exec(answer.choice);
  const candidate = match ? candidates[Number(match[1])] : undefined;
  if (!candidate) return null;

  const selectedProbability = Number(answer.probabilities[answer.choice] ?? 0);
  const noMatchProbability = Number(answer.probabilities[NO_MATCH] ?? 0);
  if (!Number.isFinite(selectedProbability) || selectedProbability <= noMatchProbability) {
    return null;
  }
  return candidate;
}

function authoredFallback(
  candidates: readonly RankedFailureExcerpt[],
  existing: readonly FailureExcerpt[] = [],
): FailureExcerpt[] {
  const selected = [...existing];
  for (const candidate of candidates) {
    if (selected.some((item) => item.id === candidate.id)) continue;
    const hasDifferentSource = !selected.some(
      (item) => item.artifactId === candidate.artifactId,
    );
    if (selected.length > 0 && !hasDifferentSource) continue;
    selected.push(candidate);
    if (selected.length === 3) break;
  }

  if (selected.length < 3) {
    for (const candidate of candidates) {
      if (selected.some((item) => item.id === candidate.id)) continue;
      selected.push(candidate);
      if (selected.length === 3) break;
    }
  }
  return selected.slice(0, 3);
}

export function resolveWhatBroke(
  candidates: readonly RankedFailureExcerpt[],
  answers: WhatBrokeAnswers,
): { excerpts: FailureExcerpt[]; confidence: number } {
  const selected: FailureExcerpt[] = [];
  for (const answer of [
    answers.wrong_assumption,
    answers.failed_approach,
    answers.build_differently,
  ]) {
    const candidate = selectedCandidate(candidates, answer);
    if (
      candidate &&
      !selected.some((item) => item.artifactId === candidate.artifactId)
    ) {
      selected.push(candidate);
    }
  }

  const confidence =
    (answers.wrong_assumption.confidence +
      answers.failed_approach.confidence +
      answers.build_differently.confidence) /
    3;
  return { excerpts: authoredFallback(candidates, selected), confidence };
}

export function buildAuthoredWhatBroke(
  candidates: readonly RankedFailureExcerpt[],
): FailureExcerpt[] {
  return authoredFallback(candidates);
}
