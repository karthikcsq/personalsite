import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface ProjectEntry {
  title: string;
  tools: string;
  date: string;
  link?: string;
  bullets: string[];
}

interface RootYaml {
  projects?: (Omit<ProjectEntry, "bullets"> & { bullets?: unknown[] })[];
}

/** A résumé bullet is a string, or `{ text, show_on }` when it is limited to the CV or résumé. */
export function bulletText(bullet: unknown): string {
  if (typeof bullet === "string") return bullet;
  if (bullet && typeof bullet === "object" && "text" in bullet) {
    return String((bullet as { text: unknown }).text);
  }
  return String(bullet ?? "");
}

const candidates = () => [
  path.join(process.cwd(), "..", "python-rag", "rag-docs", "karthik_thyagarajan_truth.yaml"),
  path.join(process.cwd(), "rag-docs", "karthik_thyagarajan_truth.yaml"),
  path.join(process.cwd(), "..", "rag-docs", "karthik_thyagarajan_truth.yaml"),
];

export function getProjectsFromYaml(): ProjectEntry[] {
  let raw: string | undefined;
  for (const p of candidates()) {
    if (fs.existsSync(p)) {
      try {
        raw = fs.readFileSync(p, "utf8");
        break;
      } catch {}
    }
  }
  if (!raw) return [];
  try {
    const data = yaml.load(raw) as RootYaml;
    return (data.projects ?? []).map((p) => ({ ...p, bullets: (p.bullets ?? []).map(bulletText) }));
  } catch {
    return [];
  }
}

export function findProjectByTitle(title: string): ProjectEntry | undefined {
  const projects = getProjectsFromYaml();
  const normalized = title.trim().toLowerCase();
  return projects.find(
    (p) => p.title.toLowerCase() === normalized || p.title.toLowerCase().includes(normalized),
  );
}
