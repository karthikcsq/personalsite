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
  projects?: ProjectEntry[];
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
    return data.projects ?? [];
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
