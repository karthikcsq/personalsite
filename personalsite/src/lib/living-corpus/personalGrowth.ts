import { LIVING_CORPUS_SESSION_KEYS as KEYS } from "./visitState.ts";
import { recordLeafCoverage, unlockAchievement } from "./achievements.ts";

export const PERSONAL_PAGES = ["about", "photos"] as const;
export type PersonalPage = typeof PERSONAL_PAGES[number];

function recordPersonalEntry(page: PersonalPage, entryId: string): void {
  recordLeafCoverage(entryId);
  unlockAchievement("leaf");
  try {
    const rawBranches: unknown = JSON.parse(window.sessionStorage.getItem(KEYS.branches) ?? "[]");
    const branches = Array.isArray(rawBranches) ? rawBranches.filter((value) => typeof value === "string") : [];
    const rawEntries: unknown = JSON.parse(window.sessionStorage.getItem(KEYS.readEntries) ?? "{}");
    const entries = rawEntries && typeof rawEntries === "object" && !Array.isArray(rawEntries) ? rawEntries as Record<string, unknown> : {};
    const current = Array.isArray(entries[page]) ? entries[page].filter((value): value is string => typeof value === "string" && value !== "page:photos#opened") : [];
    window.sessionStorage.setItem(KEYS.branches, JSON.stringify([...new Set([...branches, page])]));
    window.sessionStorage.setItem(KEYS.readEntries, JSON.stringify({ ...entries, [page]: [...new Set([...current, entryId])] }));
  } catch {
    // The page and cumulative leaf achievement still work without session storage.
  }
}

export function recordAboutVisit(): void {
  recordPersonalEntry("about", "page:about#opened");
}

export function recordPhotoAlbumVisit(album: string): void {
  if (!album.trim()) return;
  recordPersonalEntry("photos", `page:photos#album:${encodeURIComponent(album)}`);
}
