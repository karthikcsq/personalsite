import { corpusItemHref } from "./links";

// Shared editorial summary of public portfolio sources. Keep metrics scoped to
// their original context; links distinguish firsthand accounts from artifacts.
export const founderBrief = {
  title: "For startups and founding teams",
  summary:
    "Karthik Thyagarajan is a founder-engineer studying Computer Science and Artificial Intelligence at Purdue. At Samsung Research America, he co-architected an always-on AI agent runtime for XR glasses. He is currently building Tavi, a voice teammate for engineering standups, and co-founded buildpurdue, a founder community at Purdue. His work spans agent infrastructure, on-device AI, product engineering, and evaluation.",
  fit:
    "For an early team building AI products, his strongest demonstrated fit is owning a broad technical problem from product decisions through implementation and evaluation. His current interests are live voice and video AI, AI-first wearables, and infrastructure that lets agents discover and use internet services.",
  evidence: [
    {
      title: "Substantial ownership of agent systems",
      text: "At Samsung Research America (May to August 2026), he co-architected an always-on agent orchestrator in Kotlin and owned half of a 25+ module runtime. His reported on-device router achieved 95% signal suppression and 90% intent-routing accuracy. His work also covered tool permissions, model routing, memory, and phone control, connecting model behavior to a usable device experience.",
      sources: [
        { label: "Samsung work and technical account", href: "/notes/work/samsung-research-america" },
      ],
    },
    {
      title: "Builds teams and operating systems around a problem",
      text: "As buildpurdue's co-founder and co-president, he helped turn an informal gathering into a founder community with a selective cohort, weekly co-working, funding, and founder-led problem-solving workshops. He built much of its web platform and integrated CRM, applications, events, and check-ins. His account describes data on around 500 students and a mailing list of about 1,000.",
      sources: [
        { label: "buildpurdue operating account", href: "/notes/involvement/buildpurdue" },
        { label: "buildpurdue", href: "https://buildpurdue.org" },
      ],
    },
    {
      title: "Makes technical claims testable",
      text: "He built PARM, an open-source causal benchmark for when an agent should use personal memory: 157 frozen scenarios and 471 executable cases, with deterministic scoring and versioned replay artifacts. Its portfolio account explicitly distinguishes development results from held-out claims. He also built google-tools-mcp, a published MCP server exposing 169 Google Workspace tools through one OAuth flow.",
      sources: [
        { label: "PARM", href: corpusItemHref("projects", "project:parm") },
        { label: "PARM repository", href: "https://github.com/karthikcsq/parm" },
        { label: "google-tools-mcp", href: "https://github.com/karthikcsq/google-tools-mcp" },
      ],
    },
    {
      title: "Pursues difficult product problems",
      text: "He is currently building Tavi, a voice teammate intended to answer codebase questions and handle small action items during engineering standups. The project tackles multi-person turn-taking, when to stay quiet, sandboxed coding, and synthetic meeting evaluations. This is ongoing work, rather than a claim of shipped adoption. His published interests explain the direction behind it.",
      sources: [
        { label: "Tavi", href: corpusItemHref("projects", "project:tavi") },
        { label: "What I'm looking for", href: "/notes/topic/what-im-looking-for" },
      ],
    },
    {
      title: "Co-founder who ships and thinks about distribution",
      text: "At Repple (November 2025 to June 2026), he co-founded a competitive fitness app released on the App Store and built the entire FastAPI, PostgreSQL, and Supabase backend, including synchronized workouts, ELO matchmaking, and weekly competition logic. His firsthand account also describes marketing before the UI existed, campus distribution, and why local community density mattered to the product.",
      sources: [
        { label: "Repple", href: corpusItemHref("projects", "project:repple") },
        { label: "Technical and distribution account", href: "/notes/project/repple" },
      ],
    },
  ],
  provenance:
    "This brief summarizes Karthik's public portfolio and firsthand accounts. Employment contributions and internal performance metrics are self-reported; linked code and artifacts provide additional evidence where available.",
  contact: "mailto:karthik6002@gmail.com",
} as const;

export function founderBriefMarkdown(): string {
  const absolute = (href: string) => href.startsWith("/") ? `https://www.karthikthyagarajan.com${href}` : href;
  return [
    `## ${founderBrief.title}`,
    "",
    founderBrief.summary,
    "",
    founderBrief.fit,
    "",
    ...founderBrief.evidence.flatMap((item) => [
      `### ${item.title}`, "", item.text, "",
      item.sources.map((source) => `[${source.label}](${absolute(source.href)})`).join(" | "), "",
    ]),
    "[Full portfolio index](https://www.karthikthyagarajan.com/llms.txt) | [Complete public notes](https://www.karthikthyagarajan.com/llms-full.txt)", "",
    `[Contact Karthik](${founderBrief.contact})`, "", founderBrief.provenance, "",
  ].join("\n");
}
