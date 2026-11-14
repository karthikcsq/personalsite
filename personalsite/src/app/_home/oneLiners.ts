// The one-line summary of each piece of work: shown in the home page's work
// list and under the title of its note page (and used as that page's
// description for search). Every line is his, verbatim or approved by him.
import { getSiteData, type SpikeItem } from "@/app/_home/_data/siteData";
import type { PlateKey } from "@/app/_home/exhibit/types";
import { verbatim } from "@/app/_home/exhibit/engrave";

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// The stage order: most important first. Every line is verbatim from his descriptions.
export const PLAN: { id: string; plate: PlateKey; also?: { label: string; href: string }; line: (i: SpikeItem) => string }[] = [
  // His line (Nov 2026).
  { id: "project:tavi", plate: "tavi", line: () => "Tavi joins engineering standups as a voice teammate and clears small items before the meeting ends." },
  // Verbatim from his résumé bullet (src/utils/karthik_thyagarajan_truth.yaml).
  { id: "work:samsung-research-america", plate: "samsung", line: () => "Co-architected Samsung's always-on AI agent orchestrator from scratch in Kotlin." },
  { id: "project:parm", plate: "parm", line: (i) => i.lede },
  // Workshopped with him (Nov 2026).
  { id: "work:memories-ai", plate: "memories", line: () => "Built a pipeline that indexes hours of video so vision language models can search it." },
  { id: "project:repple", plate: "repple", line: (i) => i.lede },
  { id: "involvement:buildpurdue", plate: "buildpurdue", line: (i) => i.lede },
  // His line (Nov 2026).
  { id: "project:qkd", plate: "qkd", also: { label: "Paper", href: "https://aip.brightspotcdn.com/2d/d1/92e8ebfd41debaa238ed0e28a30e/8-riso-online.pdf" }, line: () => "We showed that a real, working quantum key distribution setup could be built using photonics for under $2,000." },
  { id: "work:peraton-labs", plate: "peraton", line: (i) => capitalize(verbatim(i.description, "a first-of-its-kind reinforcement learning agent for IoT malware detection", i.lede)) + "." },
];

/**
 * The sentence under a note's title: the home page's one-liner for featured
 * work, else (projects and involvement) the first sentence of his own
 * description. Other jobs have none: their descriptions are résumé bullets.
 */
export async function noteSummary(id: string): Promise<string | undefined> {
  const item = (await getSiteData()).items.find((i) => i.id === id);
  if (!item) return undefined;
  const planned = PLAN.find((p) => p.id === id);
  if (planned) return planned.line(item);
  return id.startsWith("work:") ? undefined : item.lede || undefined;
}
