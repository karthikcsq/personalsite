import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Karthik's own ordering of his work by significance, from
// `python-rag/rag-docs/impact.yaml`. The chat generator reads it on every
// question so a broad answer leads with the work that matters most instead of
// whatever vector retrieval happened to match. It is private: the site never
// renders it, and the Pinecone indexer ignores its top-level key.

export const IMPACT_TIERS = ['flagship', 'strong', 'supporting', 'early'] as const;
export type ImpactTier = (typeof IMPACT_TIERS)[number];

export interface ImpactEntry {
  /** Artifact id as the chat directory spells it, e.g. `work:Peraton Labs`. */
  id: string;
  tier: ImpactTier;
  /** One factual sentence on why it matters. */
  why: string;
}

const TIER_USE: Record<ImpactTier, string> = {
  flagship: 'lead any broad answer about Karthik with these',
  strong: 'support a broad answer',
  supporting: 'feature only when the question points at them',
  early: 'feature only when the visitor asks about them or that era',
};

function readImpactYaml(): unknown {
  const candidates = [
    path.join(process.cwd(), '..', 'python-rag', 'rag-docs', 'impact.yaml'),
    path.join(process.cwd(), 'python-rag', 'rag-docs', 'impact.yaml'),
    path.join(process.cwd(), 'rag-docs', 'impact.yaml'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      return yaml.load(fs.readFileSync(p, 'utf8'));
    } catch {
      // try next candidate
    }
  }
  return null;
}

let cache: ImpactEntry[] | null = null;

/** Every ranked artifact, in rank order within each tier. */
export function getImpactRanking(): ImpactEntry[] {
  if (cache) return cache;
  const data = readImpactYaml() as { impact?: unknown } | null;
  const groups = Array.isArray(data?.impact) ? data.impact : [];
  const entries: ImpactEntry[] = [];
  for (const group of groups) {
    const { tier, entries: items } = (group ?? {}) as { tier?: unknown; entries?: unknown };
    if (!IMPACT_TIERS.includes(tier as ImpactTier) || !Array.isArray(items)) continue;
    for (const item of items) {
      const { id, why } = (item ?? {}) as { id?: unknown; why?: unknown };
      if (typeof id !== 'string' || !id.trim()) continue;
      entries.push({
        id: id.trim(),
        tier: tier as ImpactTier,
        why: typeof why === 'string' ? why.trim() : '',
      });
    }
  }
  cache = entries;
  return cache;
}

let focusCache: string | null = null;

/** The one sentence a broad answer frames Karthik around: what he works on now. */
export function getImpactFocus(): string {
  if (focusCache !== null) return focusCache;
  const data = readImpactYaml() as { focus?: unknown } | null;
  focusCache = typeof data?.focus === 'string' ? data.focus.trim() : '';
  return focusCache;
}

/** The ranking as the generator reads it: the current focus, then tiers in
 * order with one numbered line per artifact. Ids outside `citable` are
 * dropped, since the model may only reference artifacts it was given. */
export function formatImpactRanking(
  entries: ImpactEntry[],
  citable?: Set<string>,
  focus = '',
): string {
  const kept = citable ? entries.filter((entry) => citable.has(entry.id)) : entries;
  let rank = 0;
  const tiers = IMPACT_TIERS.flatMap((tier) => {
    const group = kept.filter((entry) => entry.tier === tier);
    if (group.length === 0) return [];
    return [
      `${tier} (${TIER_USE[tier]}):`,
      ...group.map((entry) => `${++rank}. ${entry.id}${entry.why ? `: ${entry.why}` : ''}`),
    ];
  });
  return [...(focus ? [`current focus: ${focus}`] : []), ...tiers].join('\n');
}
