import type { JobEntry } from "./jobUtils";

const GENERIC_WORK_PATTERNS = [
  /\bwhere\b.*\bwork(?:ed|ing|s)?\b/,
  /\bwork experience\b/,
  /\bemploy(?:ed|er|ers|ment)\b/,
  /\bcareer\b/,
  /\bcurrent(?:ly)?\b.*\b(?:job|role|work|intern)\b/,
  /\b(?:job|role|internship)\b/,
];

const CURRENT_WORK_PATTERNS = [
  /\bworking now\b/,
  /\bwhere\b.*\bworking\b.*\bnow\b/,
  /\bcurrent(?:ly)?\b.*\b(?:job|role|work|intern|employ)\b/,
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function queryMentionsCompany(query: string, company: string): boolean {
  const normalizedQuery = normalize(query);
  const names = [
    normalize(company),
    ...company.split(/\s+[—–]\s+/).map(normalize),
  ];
  return names.some((name) => name && normalizedQuery.includes(name));
}

export function isGenericWorkQuery(query: string): boolean {
  const normalizedQuery = normalize(query);
  return GENERIC_WORK_PATTERNS.some((pattern) => pattern.test(normalizedQuery));
}

export function isCurrentWorkQuery(query: string): boolean {
  const normalizedQuery = normalize(query);
  return CURRENT_WORK_PATTERNS.some((pattern) => pattern.test(normalizedQuery));
}

export function selectCanonicalJobsForQuery(
  query: string,
  jobs: JobEntry[],
): JobEntry[] {
  const companyMatches = jobs.filter((job) =>
    queryMentionsCompany(query, job.company),
  );
  if (companyMatches.length > 0) return companyMatches;
  return isGenericWorkQuery(query) ? jobs : [];
}

function parseMonthYear(value: string, endOfMonth: boolean): Date | null {
  if (value.trim().toLowerCase() === "present") {
    return new Date(8640000000000000);
  }

  const parsed = new Date(`${value.trim()} 1, 00:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (!endOfMonth) return parsed;
  return new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    0,
    23,
    59,
    59,
  ));
}

export function isJobCurrent(job: JobEntry, now = new Date()): boolean {
  const range = job.year.match(/^(.+?)\s+-\s+(.+)$/);
  if (!range) return false;
  const start = parseMonthYear(range[1], false);
  const end = parseMonthYear(range[2], true);
  if (!start || !end) return false;
  return start.getTime() <= now.getTime() && now.getTime() <= end.getTime();
}

export function selectCanonicalReceiptJobs(
  query: string,
  jobs: JobEntry[],
  now = new Date(),
): JobEntry[] {
  const selected = selectCanonicalJobsForQuery(query, jobs);
  return isCurrentWorkQuery(query)
    ? selected.filter((job) => isJobCurrent(job, now))
    : selected;
}

export function formatCanonicalWorkContext(
  jobs: JobEntry[],
  now = new Date(),
): string {
  if (jobs.length === 0) return "";

  const asOf = now.toISOString().slice(0, 10);
  const records = jobs.map((job) => {
    const responsibilities = job.description.join(" ");
    const status = isJobCurrent(job, now) ? "current" : "past";
    const slug = job.company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return [
      `- ${job.title} at ${job.company}`,
      `  Dates: ${job.year}`,
      `  Status as of ${asOf}: ${status}`,
      `  Work URL: https://www.karthikthyagarajan.com/work#${slug}`,
      responsibilities ? `  Responsibilities: ${responsibilities}` : "",
    ].filter(Boolean).join("\n");
  });

  return [
    "=== CANONICAL WORK RECORD ===",
    "These records come directly from the source-of-truth work YAML used by the Work page.",
    "For employment history, company names, roles, dates, and current status, these records override retrieved prose.",
    records.join("\n\n"),
  ].join("\n");
}
