import { choice, noul, type EntryType } from "@typesafe-ai/sdk";
import { isAuthoredJourneyConnection } from "./journeyData.ts";
import type { JourneyNode, JourneyOption } from "./types.ts";

const NO_MATCH = "no_match";

interface JourneyChoiceAnswer {
  choice: string;
  confidence: number;
  probabilities: Readonly<Record<string, number>>;
}

interface JourneyNoulAnswer {
  noul: number;
}

export interface JourneyAnswers {
  continuity: JourneyChoiceAnswer;
  novelty: JourneyChoiceAnswer;
  substance: JourneyChoiceAnswer;
  portrait: JourneyChoiceAnswer;
  path_complete: JourneyNoulAnswer;
}

export function buildJourneyState(
  current: JourneyNode,
  trail: readonly JourneyNode[],
  candidates: readonly JourneyNode[],
) {
  return {
    current_chapter: {
      source: current.title,
      heading: current.heading,
      passage: current.text,
      context: current.context,
      topics: current.topics,
    },
    path_so_far: trail.map((node, index) => ({
      source: node.title,
      heading: node.heading,
      passage: node.text,
      context: node.context,
      topics: node.topics,
      editorial_bridge_from_previous:
        index > 0 && isAuthoredJourneyConnection(trail[index - 1].id, node.id),
    })),
    candidates: candidates.map((node, index) => ({
      option: `candidate_${index}`,
      source: node.title,
      category: node.category,
      heading: node.heading,
      passage: node.text,
      context: node.context,
      topics: node.topics,
      has_image: Boolean(node.media),
      known_good_bridge: isAuthoredJourneyConnection(current.id, node.id),
    })),
  };
}

function candidateCriteria(candidates: readonly JourneyNode[]) {
  const criteria: Record<string, EntryType> = {};
  candidates.forEach((node, index) => {
    criteria[`candidate_${index}`] = {
      candidate: `The passage at candidates[${index}]`,
      source: node.title,
      heading: node.heading,
    };
  });
  criteria[NO_MATCH] = {
    choose_when:
      "None of the candidate passages fits this judgment. Do not force a connection.",
  };
  return criteria;
}

export function buildJourneyQuestions(candidates: readonly JourneyNode[]) {
  const criteria = candidateCriteria(candidates);
  return {
    continuity: choice(
      [
        "Pick the candidate that most naturally continues the idea in current_chapter while keeping path_so_far coherent.",
        "Judge the underlying idea, decision, constraint, or way of thinking—not shared keywords or résumé category.",
        "A good continuation makes the relationship understandable as soon as the passage appears.",
        "known_good_bridge is an editorial prior from the corpus. Prefer it when two candidates are similarly strong, but reject it when the actual passage does not fit this path.",
      ],
      criteria,
    ),
    novelty: choice(
      [
        "Pick the candidate that adds the most genuinely new information to path_so_far without changing the subject arbitrarily.",
        "Prefer a new consequence, tension, domain, failure, or firsthand lesson over another version of a point already shown.",
      ],
      criteria,
    ),
    substance: choice(
      [
        "Pick the candidate that gives the visitor the strongest concrete reason to keep reading.",
        "Prefer specific technical decisions, results, constraints, mistakes, or observed human consequences over broad claims.",
      ],
      criteria,
    ),
    portrait: choice(
      [
        "Pick the candidate that best reveals the person behind the work while still feeling like a natural next beat in this path.",
        "This can be a value, taste, formative background, human consequence, place, photograph, or life outside technology. Prefer something specific and lived-in over a generic personality claim.",
        "A personal or photo candidate is useful when it adds a real dimension to the portrait. Do not choose it just because it is personal if it feels disconnected from the path.",
      ],
      criteria,
    ),
    path_complete: noul([
      "Does path_so_far now form a coherent, satisfying short portrait with a clear through-line and a meaningful final point?",
      "Answer false if it still feels like setup, repetition, or an arbitrary sequence. A path can remain open even when each individual passage is good.",
    ]),
  };
}

function stableFraction(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function topicOverlap(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right);
  return left.reduce((count, topic) => count + Number(rightSet.has(topic)), 0);
}

function sourceKey(node: JourneyNode): string {
  return node.href.split("#", 1)[0] || node.artifactId;
}

export function resolveJourneySelection(
  candidates: readonly JourneyNode[],
  trail: readonly JourneyNode[],
  sessionId: string,
  answers: JourneyAnswers,
): {
  options: JourneyOption[];
  complete: boolean;
  confidence: number;
} {
  const confidence =
    (answers.continuity.confidence +
      answers.novelty.confidence +
      answers.substance.confidence +
      answers.portrait.confidence) /
    4;
  const sourceVariety = new Set(trail.map((node) => sourceKey(node))).size;
  const complete =
    trail.length >= 6 ||
    (trail.length >= 4 &&
      sourceVariety >= 2 &&
      Number(answers.path_complete.noul) >= 0.72);

  if (complete) return { options: [], complete: true, confidence };

  const ranked = candidates.map((node, index) => {
    const key = `candidate_${index}`;
    const continuity = Number(answers.continuity.probabilities[key] ?? 0);
    const novelty = Number(answers.novelty.probabilities[key] ?? 0);
    const substance = Number(answers.substance.probabilities[key] ?? 0);
    const portrait = Number(answers.portrait.probabilities[key] ?? 0);
    const boundedVariation =
      stableFraction(`${sessionId}:${trail.length}:${node.id}`) * 0.035;
    const authoredPrior = isAuthoredJourneyConnection(
      trail.at(-1)?.id ?? "",
      node.id,
    )
      ? 0.14
      : 0;
    return {
      node,
      score:
        continuity * 0.52 +
        novelty * 0.22 +
        substance * 0.16 +
        portrait * 0.1 +
        authoredPrior +
        boundedVariation,
    };
  });

  const selected: JourneyNode[] = [];
  const remaining = [...ranked];
  const chooseAnswer = (choice: string) => {
    const match = /^candidate_(\d+)$/.exec(choice);
    const index = match ? Number(match[1]) : -1;
    const node = candidates[index];
    if (!node || selected.some((item) => item.id === node.id)) return;
    selected.push(node);
    const remainingIndex = remaining.findIndex((item) => item.node.id === node.id);
    if (remainingIndex >= 0) remaining.splice(remainingIndex, 1);
  };

  chooseAnswer(answers.continuity.choice);
  chooseAnswer(answers.novelty.choice);
  chooseAnswer(answers.portrait.choice);

  const chooseBest = (requireNewSource: boolean) => {
    remaining.sort((left, right) => {
      const adjusted = (item: (typeof remaining)[number]) => {
        const sameSource = selected.some(
          (chosen) => sourceKey(chosen) === sourceKey(item.node),
        );
        const repeatedTopics = selected.reduce(
          (count, chosen) => count + topicOverlap(chosen.topics, item.node.topics),
          0,
        );
        return item.score - Number(sameSource) * 0.22 - repeatedTopics * 0.018;
      };
      return adjusted(right) - adjusted(left);
    });
    const nextIndex = requireNewSource
      ? remaining.findIndex(
          (item) =>
            !selected.some(
              (chosen) => sourceKey(chosen) === sourceKey(item.node),
            ),
        )
      : 0;
    if (nextIndex < 0) return false;
    const [next] = remaining.splice(nextIndex, 1);
    selected.push(next.node);
    return true;
  };

  while (remaining.length && selected.length < 3) {
    if (!chooseBest(true)) break;
  }
  while (remaining.length && selected.length < 3) {
    if (!chooseBest(false)) break;
  }

  return {
    options: selected.map((node) => ({ label: node.label, node })),
    complete: false,
    confidence,
  };
}
