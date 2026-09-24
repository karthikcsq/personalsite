import {
  MINIMAL_CATEGORIES,
  readableSections,
  type MinimalCategory,
  type MinimalCorpusItem,
} from "./minimalTypes.ts";

export type AchievementId =
  | "branch"
  | "all-branches"
  | "leaf"
  | "all-leaves"
  | "night"
  | "break"
  | "eclipse";

export interface AchievementRecord {
  id: AchievementId;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: readonly AchievementRecord[] = [
  { id: "branch", title: "First branch", description: "Grow your first category branch." },
  { id: "all-branches", title: "All branches", description: "Grow the Work, Projects, Ideas, and Writing branches." },
  { id: "leaf", title: "First leaf", description: "Open your first piece of the corpus." },
  { id: "all-leaves", title: "All leaves", description: "Read every item and section in the corpus." },
  { id: "night", title: "Winter night", description: "Discover the winter version of the page." },
  { id: "break", title: "What broke", description: "Break the branch." },
  { id: "eclipse", title: "Total eclipse", description: "Hold the sun until the eclipse completes." },
];

export const ACHIEVEMENT_EVENT = "living-corpus:achievement-unlocked";
export const ACHIEVEMENT_SYNC_EVENT = "living-corpus:achievements-synced";
export const ACHIEVEMENT_RESET_EVENT = "living-corpus:achievements-reset";
export const ACHIEVEMENT_STORAGE_KEY = "living-corpus:achievements:v2";
export const GROWTH_COVERAGE_STORAGE_KEY = "living-corpus:growth-coverage:v1";
const LEGACY_STORAGE_KEY = "living-corpus:achievements:v1";

const staticAchievements = new Map(ACHIEVEMENTS.map((item) => [item.id, item]));
const validCategories = new Set<MinimalCategory>(MINIMAL_CATEGORIES.map(({ id }) => id));
const memory = new Map<AchievementId, AchievementRecord>();

export interface GrowthCoverage {
  branches: MinimalCategory[];
  entries: string[];
}

let growthMemory: GrowthCoverage = { branches: [], entries: [] };

function isCategory(value: unknown): value is MinimalCategory {
  return typeof value === "string" && validCategories.has(value as MinimalCategory);
}

export function isAchievementRecord(value: unknown): value is AchievementRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AchievementRecord>;
  return typeof record.id === "string" && staticAchievements.has(record.id as AchievementId);
}

export function parseAchievementIds(raw: string | null): AchievementId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(
      (id): id is AchievementId => typeof id === "string" && staticAchievements.has(id as AchievementId),
    ))];
  } catch {
    return [];
  }
}

export function parseAchievementRecords(raw: string | null): AchievementRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(isAchievementRecord).map(({ id }) => id))]
      .flatMap((id) => staticAchievements.get(id) ?? []);
  } catch {
    return [];
  }
}

export function parseGrowthCoverage(raw: string | null, legacyAchievements: string | null = null): GrowthCoverage {
  let saved: unknown = null;
  let oldAchievements: unknown = null;
  try { saved = raw ? JSON.parse(raw) : null; } catch { /* Ignore damaged storage. */ }
  try { oldAchievements = legacyAchievements ? JSON.parse(legacyAchievements) : null; } catch { /* Ignore damaged storage. */ }
  const coverage = saved && typeof saved === "object" ? saved as Partial<GrowthCoverage> : {};
  const oldIds = Array.isArray(oldAchievements)
    ? oldAchievements.flatMap((record) =>
        record && typeof record === "object" && typeof record.id === "string"
          ? [record.id as string]
          : [],
      )
    : [];
  const branches = [
    ...(Array.isArray(coverage.branches) ? coverage.branches : []),
    ...oldIds.filter((id) => id.startsWith("branch:")).map((id) => id.slice(7)),
  ];
  const entries = [
    ...(Array.isArray(coverage.entries) ? coverage.entries : []),
    ...oldIds.filter((id) => id.startsWith("leaf:")).map((id) => id.slice(5)),
  ];
  return {
    branches: [...new Set(branches.filter(isCategory))],
    entries: [...new Set(entries.filter((entry): entry is string =>
      typeof entry === "string" && entry.length > 0 && entry.length <= 500,
    ))],
  };
}

export function readGrowthCoverage(): GrowthCoverage {
  if (typeof window === "undefined") return growthMemory;
  let stored: GrowthCoverage = { branches: [], entries: [] };
  try {
    stored = parseGrowthCoverage(
      window.localStorage.getItem(GROWTH_COVERAGE_STORAGE_KEY),
      window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY),
    );
  } catch {
    // The current page can still track progress in memory.
  }
  return {
    branches: [...new Set([...stored.branches, ...growthMemory.branches])],
    entries: [...new Set([...stored.entries, ...growthMemory.entries])],
  };
}

function saveGrowthCoverage(coverage: GrowthCoverage): void {
  growthMemory = coverage;
  try {
    window.localStorage.setItem(GROWTH_COVERAGE_STORAGE_KEY, JSON.stringify(coverage));
  } catch {
    // In-memory progress still works for this page.
  }
}

export function recordBranchCoverage(category: MinimalCategory): GrowthCoverage {
  const coverage = readGrowthCoverage();
  if (coverage.branches.includes(category)) return coverage;
  const next = { ...coverage, branches: [...coverage.branches, category] };
  saveGrowthCoverage(next);
  return next;
}

export function recordLeafCoverage(entryId: string): GrowthCoverage {
  const coverage = readGrowthCoverage();
  if (coverage.entries.includes(entryId)) return coverage;
  const next = { ...coverage, entries: [...coverage.entries, entryId] };
  saveGrowthCoverage(next);
  return next;
}

export function hasAllBranches(branches: readonly MinimalCategory[]): boolean {
  const grown = new Set(branches);
  return MINIMAL_CATEGORIES.every(({ id }) => grown.has(id));
}

export function leafTargets(items: readonly MinimalCorpusItem[]): string[] {
  return items.flatMap((item) => [
    `${item.id}#opened`,
    ...readableSections(item).map((section) => `${item.id}#${section.id}`),
  ]);
}

export function hasAllLeaves(targets: readonly string[], entries: readonly string[]): boolean {
  if (targets.length === 0) return false;
  const read = new Set(entries);
  return targets.every((target) => read.has(target));
}

export function readUnlockedAchievements(): AchievementRecord[] {
  if (typeof window === "undefined") return [];
  let stored: AchievementRecord[] = [];
  try {
    stored = [
      ...parseAchievementRecords(window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY)),
      ...parseAchievementIds(window.localStorage.getItem(LEGACY_STORAGE_KEY)).flatMap(
        (id) => staticAchievements.get(id) ?? [],
      ),
    ];
  } catch {
    // The current page still retains achievements when storage is unavailable.
  }
  return [...new Map([...stored, ...memory.values()].map((record) => [record.id, record])).values()];
}

function saveAchievements(records: AchievementRecord[]): void {
  // Preserve old per-item awards as coverage before rewriting the v2 list.
  saveGrowthCoverage(readGrowthCoverage());
  records.forEach((record) => memory.set(record.id, record));
  try {
    window.localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // In-memory achievements still work for this page.
  }
}

export function unlockAchievement(id: AchievementId): boolean {
  if (typeof window === "undefined") return false;
  const record = staticAchievements.get(id);
  if (!record) return false;
  const current = readUnlockedAchievements();
  if (current.some((item) => item.id === id)) return false;
  saveAchievements([...current, record]);
  window.dispatchEvent(new CustomEvent<AchievementRecord>(ACHIEVEMENT_EVENT, { detail: record }));
  return true;
}

export function syncAchievements(ids: AchievementId[]): void {
  if (typeof window === "undefined") return;
  const records = new Map(readUnlockedAchievements().map((record) => [record.id, record]));
  const before = records.size;
  ids.forEach((id) => {
    const record = staticAchievements.get(id);
    if (record) records.set(id, record);
  });
  if (records.size === before) return;
  saveAchievements([...records.values()]);
  window.dispatchEvent(new Event(ACHIEVEMENT_SYNC_EVENT));
}

export function resetAchievements(): void {
  if (typeof window === "undefined") return;
  memory.clear();
  growthMemory = { branches: [], entries: [] };
  try {
    window.localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
    window.localStorage.removeItem(GROWTH_COVERAGE_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // The in-memory collection can still be reset without storage access.
  }
  window.dispatchEvent(new Event(ACHIEVEMENT_RESET_EVENT));
}
