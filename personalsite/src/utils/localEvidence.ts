import fs from "fs";
import path from "path";

export interface LocalEvidenceMatch {
  source: string;
  text: string;
  score: number;
}

interface LocalEvidenceChunk {
  source: string;
  text: string;
  terms: Set<string>;
}

const QUERY_STOP_WORDS = new Set([
  "about", "and", "are", "can", "did", "does", "for", "from", "has",
  "have", "his", "how", "is", "karthik", "me", "of", "please", "problem",
  "show", "solve", "tell", "the", "this", "to", "was", "what", "when",
  "where", "which", "who", "with", "you",
]);

const AUTHORITATIVE_TEXT_FILES = [
  "faq.txt",
  "opinions_and_takes.txt",
  "summary.txt",
  "personal_narrative.txt",
];

let cachedChunks: LocalEvidenceChunk[] | null = null;

function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length >= 2) ?? [];
}

function findRagDocsDirectory(): string | null {
  const candidates = [
    path.join(process.cwd(), "..", "python-rag", "rag-docs"),
    path.join(process.cwd(), "python-rag", "rag-docs"),
    path.join(process.cwd(), "rag-docs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

function splitSourceText(source: string, raw: string): string[] {
  const normalized = raw.replaceAll("\r\n", "\n").trim();
  if (!normalized) return [];

  if (source === "faq.txt") {
    return normalized
      .split(/\n\s*\n(?=Q:)/g)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.startsWith("Q:") && chunk.includes("\nA:"));
  }

  return normalized
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(
      (chunk) =>
        chunk.length >= 40 &&
        !chunk.startsWith("#") &&
        !chunk.endsWith("Perspectives"),
    );
}

function loadChunks(): LocalEvidenceChunk[] {
  if (cachedChunks) return cachedChunks;

  const directory = findRagDocsDirectory();
  if (!directory) {
    cachedChunks = [];
    return cachedChunks;
  }

  const chunks: LocalEvidenceChunk[] = [];
  for (const source of AUTHORITATIVE_TEXT_FILES) {
    const filePath = path.join(directory, source);
    if (!fs.existsSync(filePath)) continue;

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    for (const text of splitSourceText(source, raw)) {
      chunks.push({
        source,
        text,
        terms: new Set(tokenize(text)),
      });
    }
  }

  cachedChunks = chunks;
  return cachedChunks;
}

function overlapRatio(left: string, right: string): number {
  const leftTerms = new Set(tokenize(left));
  const rightTerms = new Set(tokenize(right));
  if (leftTerms.size === 0 || rightTerms.size === 0) return 0;
  let intersection = 0;
  for (const term of leftTerms) {
    if (rightTerms.has(term)) intersection += 1;
  }
  return intersection / Math.min(leftTerms.size, rightTerms.size);
}

export function findLocalEvidence(
  query: string,
  limit = 3,
): LocalEvidenceMatch[] {
  const chunks = loadChunks();
  if (chunks.length === 0) return [];

  const queryTerms = [
    ...new Set(
      tokenize(query).filter((term) => !QUERY_STOP_WORDS.has(term)),
    ),
  ];
  if (queryTerms.length === 0) return [];

  const documentFrequency = new Map<string, number>();
  for (const term of queryTerms) {
    documentFrequency.set(
      term,
      chunks.filter((chunk) => chunk.terms.has(term)).length,
    );
  }

  const normalizedQuery = query
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const ranked = chunks
    .map((chunk) => {
      const matchedTerms = queryTerms.filter((term) => chunk.terms.has(term));
      if (matchedTerms.length === 0) return null;

      const lexicalScore = matchedTerms.reduce((score, term) => {
        const frequency = documentFrequency.get(term) ?? chunks.length;
        return score + Math.log(1 + chunks.length / Math.max(1, frequency));
      }, 0);
      const coverage = matchedTerms.length / queryTerms.length;
      const normalizedChunk = chunk.text
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, " ");
      const phraseBonus =
        normalizedQuery.length >= 8 && normalizedChunk.includes(normalizedQuery)
          ? 4
          : 0;
      const questionAnswerBonus =
        chunk.source === "faq.txt" && chunk.text.startsWith("Q:") ? 0.75 : 0;

      return {
        source: chunk.source,
        text: chunk.text,
        score:
          lexicalScore * (0.6 + coverage) +
          phraseBonus +
          questionAnswerBonus,
        matchedTerms: matchedTerms.length,
        coverage,
      };
    })
    .filter(
      (
        match,
      ): match is LocalEvidenceMatch & {
        matchedTerms: number;
        coverage: number;
      } =>
        Boolean(match) &&
        (match!.matchedTerms >= 2 || match!.coverage >= 0.66),
    )
    .sort((left, right) => right.score - left.score);

  const selected: LocalEvidenceMatch[] = [];
  for (const match of ranked) {
    if (
      selected.some(
        (existing) => overlapRatio(existing.text, match.text) >= 0.78,
      )
    ) {
      continue;
    }
    selected.push({
      source: match.source,
      text: match.text,
      score: match.score,
    });
    if (selected.length >= limit) break;
  }
  return selected;
}

export function formatLocalEvidenceContext(
  matches: LocalEvidenceMatch[],
): string {
  if (matches.length === 0) return "";
  return `=== QUERY-MATCHED AUTHORITATIVE LOCAL RECORDS ===
These records come directly from the current portfolio corpus and outrank conflicting or stale retrieved chunks.
${matches
  .map(
    (match, index) =>
      `[local:${index + 1}] source=${match.source}\n${match.text}`,
  )
  .join("\n\n---\n\n")}`;
}

export function resetLocalEvidenceCacheForTests(): void {
  cachedChunks = null;
}
