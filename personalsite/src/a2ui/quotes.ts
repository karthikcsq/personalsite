// Server-side verification for quotes the A2UI generator proposes.
//
// The generator now picks its own pull-quotes in the same call that writes the
// document, so nothing between the model and the visitor re-reads the source.
// These checks are that gate: a quote only reaches the page when it is a
// contiguous substring of the artifact's own corpus on disk, reads as a
// self-contained thought, and adds something the card does not already show.
//
// The corpus is the source of truth, never the retrieved Pinecone chunk text.

export type A2UIQuoteCandidate = {
  artifactId: string;
  text: string;
};

const MIN_QUOTE_CHARS = 6;
const MAX_QUOTE_CHARS = 400;

export function normalizeForQuoteMatch(value: string): string {
  return value
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, "…")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeNeedle(value: string): string {
  return normalizeForQuoteMatch(value)
    .replace(/^["'…\s]+|["'…\s]+$/g, "")
    .trim();
}

/** Identity of a quote's words, ignoring the curly quotes and whitespace that
 * differ between the stored form and a fresh proposal. Two quotes with the
 * same fingerprint would put the same words on screen twice. */
export function quoteFingerprint(value: string): string {
  return normalizeNeedle(value);
}

/** True when every segment of the candidate appears verbatim in the corpus.
 * A mid-quote ellipsis is allowed; both halves must match independently. */
export function isVerbatimQuote(corpus: string, candidate: string): boolean {
  const haystack = normalizeForQuoteMatch(corpus);
  const cleaned = normalizeNeedle(candidate);
  if (cleaned.length < MIN_QUOTE_CHARS) return false;
  const segments = cleaned
    .split("…")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return false;
  let position = 0;
  for (const segment of segments) {
    if (segment.length < MIN_QUOTE_CHARS) return false;
    const index = haystack.indexOf(segment, position);
    if (index < 0) return false;
    position = index + segment.length;
  }
  return true;
}

/** A quote that opens on a dangling pronoun has lost its antecedent. */
export function startsWithBarePronoun(value: string): boolean {
  const cleaned = value.replace(/^[\s"'“”…]+/, "").toLowerCase();
  return /^(that|this|it|they|them|those|these|such|he|she|here|there)\b/.test(
    cleaned,
  );
}

/** The card already shows what the artifact is and what his title was, so a
 * quote that only restates either adds nothing next to it. */
export function isDefinitionalRestatement(value: string): boolean {
  const cleaned = value.replace(/^[\s"'“”…]+/, "").trim();
  if (
    /^(we|i)\s+(built|created|made|developed|launched|shipped|wrote|designed|built out|put together)\b[^,.]{1,60},\s+(a|an)\s+/i.test(
      cleaned,
    )
  ) {
    return true;
  }
  if (/^[A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3}\s+is\s+(a|an)\s+/.test(cleaned)) {
    return true;
  }
  if (
    /^(i\s+am|i'?m|i\s+serve\s+as)\s+(the\s+|a\s+|an\s+)?(co[-\s]?founder|founder|founding\s+\w+|president|vice[\s-]?president|ceo|cto|coo|cfo|chair(?:man|person|woman)?|director|head|lead(?:er)?|engineer|owner|partner|principal|chief|manager)\b/i.test(
      cleaned,
    )
  ) {
    return true;
  }
  return false;
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^["“”]+|["“”]+$/g, "").trim();
}

/** Read the `quotes` array the model streamed and keep only the entries that
 * survive every check. Returns artifact id -> display-ready quoted string, at
 * most one quote per artifact. Anything unparseable fails closed. */
export function validateA2UIQuotes(
  raw: unknown,
  corpusFor: (artifactId: string) => string,
  allowedArtifactIds: Set<string>,
  limit = 3,
  alreadyUsed: ReadonlySet<string> = new Set(),
): Map<string, string> {
  const accepted = new Map<string, string>();
  if (!Array.isArray(raw)) return accepted;

  for (const entry of raw) {
    if (accepted.size >= limit) break;
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Partial<A2UIQuoteCandidate>;
    const artifactId =
      typeof candidate.artifactId === "string" ? candidate.artifactId.trim() : "";
    const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
    if (!artifactId || !text) continue;
    if (accepted.has(artifactId)) continue;
    if (!allowedArtifactIds.has(artifactId)) {
      console.warn(`A2UI quote rejected (unknown artifact): ${artifactId}`);
      continue;
    }
    if (text.length > MAX_QUOTE_CHARS) {
      console.warn(`A2UI quote rejected (too long) for ${artifactId}`);
      continue;
    }
    // An earlier answer in this conversation already pinned these words, and
    // the visitor can still see it. The model is asked not to repeat one; this
    // is the part that does not depend on it complying.
    if (alreadyUsed.has(quoteFingerprint(text))) {
      console.warn(`A2UI quote rejected (already used this conversation) for ${artifactId}`);
      continue;
    }
    const corpus = corpusFor(artifactId);
    if (!corpus) continue;
    if (!isVerbatimQuote(corpus, text)) {
      console.warn(`A2UI quote rejected (not verbatim) for ${artifactId}: ${text}`);
      continue;
    }
    if (startsWithBarePronoun(text)) {
      console.warn(`A2UI quote rejected (bare pronoun) for ${artifactId}: ${text}`);
      continue;
    }
    if (isDefinitionalRestatement(text)) {
      console.warn(
        `A2UI quote rejected (definitional restatement) for ${artifactId}: ${text}`,
      );
      continue;
    }
    const trimmed = stripWrappingQuotes(text);
    if (!trimmed) continue;
    accepted.set(artifactId, `“${trimmed}”`);
  }

  return accepted;
}
