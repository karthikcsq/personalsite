import type {
  JourneyBootstrap,
  JourneyEntry,
  JourneyNode,
  JourneyOption,
  JourneyTopicId,
  LivingCorpusPayload,
} from "./types.ts";

const ENTRY_SPECS: ReadonlyArray<{
  id: JourneyTopicId;
  label: string;
  seedId: string;
  fallbackTopic: string;
}> = [
  {
    id: "ai",
    label: "AI",
    seedId:
      "idea:agents:when-an-agent-is-worth-building::when-an-agent-is-worth-building",
    fallbackTopic: "agents",
  },
  {
    id: "research",
    label: "Research",
    seedId: "work:naval-research-laboratory::the-image-to-image-insight",
    fallbackTopic: "research",
  },
  {
    id: "products",
    label: "Products",
    seedId: "project:repple::why-i-joined",
    fallbackTopic: "product",
  },
  {
    id: "founders",
    label: "Founders",
    seedId: "involvement:buildpurdue::founding-rationale",
    fallbackTopic: "founders",
  },
];

const QUOTE_LABELS: Readonly<Record<string, string>> = {
  "when-an-agent-is-worth-building": "useful agents",
  "where-most-agents-fail": "bad agents",
  "why-agentic-coding-zapier-and-clay-work": "agentic tools",
  "the-gate-before-building-one": "when to build",
  "what-s-overhyped": "AI hype",
  "the-duct-tape-test": "human intent",
  "why-image-generation-isn-t-the-problem": "AI and art",
  "what-ambient-ai-is": "ambient AI",
  "scoping-to-what-the-model-can-actually-do": "small models",
  "matching-the-task-to-the-right-model": "model routing",
  "why-ambient-needs-approval-somewhere-in-the-chain": "approval",
  "what-makes-orchestration-hard": "orchestration",
  "exposing-capability-without-flooding-context": "context",
  "driving-the-phone-directly": "phone agents",
  "when-to-ask-permission": "permissions",
  "use-case-specific-modes": "modes",
  "the-boundary-between-aurora-and-host-devices": "boundaries",
  "host-defined-proactive-triggers": "proactive AI",
  "the-image-to-image-insight": "representation",
  "building-rag-before-rag-was-mainstream": "early RAG",
  "the-classified-hardware-constraint": "local models",
  "the-control-question": "control",
  "implications-for-robotics": "robotics",
  "on-unflashy-work": "unflashy work",
  "why-long-context-isn-t-the-answer": "long context",
  "what-it-taught-me-about-personal-ai": "personal AI",
  "what-i-d-do-differently": "what I'd change",
  "why-i-joined": "cofounders",
  "the-hardest-engineering-problem-was-time": "time bugs",
  "the-business-thesis-a-data-moat": "data moats",
  "marketing-before-we-had-a-ui": "early marketing",
  "quantity-beats-polish": "shipping",
  "distribution-is-everything-for-b2c": "distribution",
  "why-we-kept-going-past-the-hackathon-and-why-it-died": "why it ended",
  "the-technical-bet-i-d-defend": "the technical bet",
  "mcp-discovery-problem": "tool discovery",
  "who-s-actually-using-it": "real users",
  "the-broader-problem-agent-callable-services": "agent infrastructure",
  "the-honest-origin-story": "research honesty",
  "what-the-paper-got-wrong": "what was wrong",
  "what-we-actually-contributed": "low-cost quantum hardware",
  "what-research-teaches": "research process",
  "slowly-then-all-at-once": "slowly, then all at once",
  "data-is-the-real-problem": "the data",
  "what-hardtech-ml-costs-that-software-ml-doesn-t": "hardtech ML",
  "founding-rationale": "founder density",
  "operating-model": "how BuildPurdue works",
  "why-founder-led-workshops-over-guest-speakers": "peer learning",
  "why-the-cohort-is-gated": "the cohort",
  "my-role": "building the org",
  "internal-platform-and-tracking-entrepreneurship-at-purdue":
    "tracking founder activity",
  "what-purdue-s-existing-entrepreneurship-infrastructure-gets-wrong":
    "what Purdue gets wrong",
  "the-decision-that-draws-the-most-pushback": "pushback",
  "what-the-format-costs-us": "what this format costs",
  "the-we-don-t-do-anything-critique": "the criticism",
  "how-we-measure-success-in-year-one": "traction",
  "who-buildpurdue-isn-t-for": "who it isn't for",
  "why-it-s-fun": "building with friends",
  "why-fitness-apps-fail-non-disciplined-users": "fitness for normal people",
  "why-elo-beats-a-leaderboard": "competitive motivation",
  "ai-workout-plans-honest-assessment": "AI where it helps",
  "stickers-and-campus-density": "campus distribution",
  "how-we-grew-repple": "how Repple grew",
  "why-we-built-it": "why we built it",
  "what-i-got-wrong": "what I got wrong",
  "why-it-exists": "why this tool exists",
  "how-it-grew": "how it grew",
  "why-triage": "the triage problem",
  "why-hipaa-was-non-negotiable": "privacy as architecture",
  "multi-agent-architecture": "multi-agent design",
  "the-pitch": "the product pitch",
  "talking-to-clinical-researchers": "talking to users",
  "the-contradiction-questions": "finding contradictions",
  "the-flashy-vs-real-debate": "flashy versus useful",
  "core-thesis": "the core thesis",
  "what-i-d-build-now": "what I'd build now",
  "what-educational-games-get-wrong": "educational games",
  "was-it-worth-building": "was it worth it?",
  "what-s-actually-hard-about-ml-research": "hard parts of research",
  "reproducibility-in-robotics": "reproducibility",
  "what-research-lab-work-is-really-like": "day-to-day research",
  "what-i-m-proudest-of": "the result I'm proud of",
  "over-collecting-as-a-discipline": "over-collecting data",
  "indexing-and-retrieval": "retrieval design",
  "undergrad-research-and-the-cutting-edge-bias": "the novelty trap",
  "theory-and-implementation": "theory into hardware",
};

const NODE_LABELS: Readonly<Record<string, string>> = {
  "project:parm::project": "testing agent memory",
  "project:gantry::project": "human-in-the-loop coding",
  "project:veritas::the-problem": "clinical-trial fraud",
  "project:veritas::how-it-works": "proof plus response quality",
};

const PRIORITY_QUOTE_IDS = new Set(Object.keys(QUOTE_LABELS));

interface JourneyLane {
  nodeIds: readonly string[];
  defaultSourceLimit: number;
  sourceLimits?: Readonly<Record<string, number>>;
}

const JOURNEY_LANES: Readonly<Record<string, JourneyLane>> = {
  "idea:agents:when-an-agent-is-worth-building::when-an-agent-is-worth-building": {
    defaultSourceLimit: 1,
    sourceLimits: {
      "idea:agents:where-most-agents-fail": 2,
      "idea:agents:why-agentic-coding-zapier-and-clay-work": 2,
      "idea:agents:the-gate-before-building-one": 2,
      "idea:agents:what-s-overhyped": 2,
    },
    nodeIds: [
      "idea:agents:where-most-agents-fail::where-most-agents-fail",
      "idea:agents:why-agentic-coding-zapier-and-clay-work::why-agentic-coding-zapier-and-clay-work",
      "idea:agents:the-gate-before-building-one::the-gate-before-building-one",
      "idea:agents:what-s-overhyped::what-s-overhyped",
      "idea:where-ai-doesnt-belong:the-duct-tape-test::the-duct-tape-test",
      "idea:where-ai-doesnt-belong:why-image-generation-isn-t-the-problem::why-image-generation-isn-t-the-problem",
      "work:samsung-research-america::scoping-to-what-the-model-can-actually-do",
      "work:samsung-research-america::why-ambient-needs-approval-somewhere-in-the-chain",
      "work:samsung-research-america::what-makes-orchestration-hard",
      "work:samsung-research-america::exposing-capability-without-flooding-context",
      "work:samsung-research-america::when-to-ask-permission",
      "work:samsung-research-america::the-boundary-between-aurora-and-host-devices",
      "project:google-tools-mcp::mcp-discovery-problem",
      "project:google-tools-mcp::what-i-got-wrong",
      "project:google-tools-mcp::the-broader-problem-agent-callable-services",
      "work:memories-ai::why-long-context-isn-t-the-answer",
      "work:memories-ai::what-it-taught-me-about-personal-ai",
      "project:parm::project",
      "project:gantry::project",
      "work:naval-research-laboratory::building-rag-before-rag-was-mainstream",
      "project:caladrius::multi-agent-architecture",
      "project:repple::ai-workout-plans-honest-assessment",
      "writing:future-of-ai-work::the-future-of-work",
      "writing:stability-in-the-age-of-ai::ai-is-coming-to-fruition-why-is-it-frightening",
      "writing:the-ai-company-id-love-to-create::back-to-ai-work",
    ],
  },
  "work:naval-research-laboratory::the-image-to-image-insight": {
    defaultSourceLimit: 1,
    nodeIds: [
      "project:qkd::what-we-actually-contributed",
      "project:qkd::what-research-teaches",
      "project:qkd::theory-and-implementation",
      "project:kmeans-som::the-honest-origin-story",
      "project:kmeans-som::what-the-paper-got-wrong",
      "project:kmeans-som::undergrad-research-and-the-cutting-edge-bias",
      "work:ideas-lab::what-s-actually-hard-about-ml-research",
      "work:ideas-lab::reproducibility-in-robotics",
      "work:ideas-lab::what-research-lab-work-is-really-like",
      "work:ideas-lab::what-i-m-proudest-of",
      "work:agrpa::data-is-the-real-problem",
      "work:agrpa::what-hardtech-ml-costs-that-software-ml-doesn-t",
      "work:agrpa::over-collecting-as-a-discipline",
      "work:peraton-labs::on-unflashy-work",
      "work:peraton-labs::the-control-question",
      "work:memories-ai::indexing-and-retrieval",
      "project:parm::project",
      "writing:silicon-valley-trip::quality-control",
    ],
  },
  "project:repple::why-i-joined": {
    defaultSourceLimit: 1,
    sourceLimits: { "project:repple": 2 },
    nodeIds: [
      "project:repple::why-it-s-fun",
      "project:repple::why-fitness-apps-fail-non-disciplined-users",
      "project:repple::why-elo-beats-a-leaderboard",
      "project:repple::the-hardest-engineering-problem-was-time",
      "project:repple::ai-workout-plans-honest-assessment",
      "project:repple::the-business-thesis-a-data-moat",
      "project:repple::marketing-before-we-had-a-ui",
      "project:repple::stickers-and-campus-density",
      "project:repple::quantity-beats-polish",
      "project:repple::distribution-is-everything-for-b2c",
      "project:repple::how-we-grew-repple",
      "project:verbatim::why-we-built-it",
      "project:verbatim::why-we-kept-going-past-the-hackathon-and-why-it-died",
      "project:verbatim::what-i-d-do-differently",
      "project:verbatim::the-technical-bet-i-d-defend",
      "project:google-tools-mcp::why-it-exists",
      "project:google-tools-mcp::how-it-grew",
      "project:google-tools-mcp::what-i-got-wrong",
      "project:google-tools-mcp::who-s-actually-using-it",
      "project:caladrius::why-triage",
      "project:caladrius::why-hipaa-was-non-negotiable",
      "project:caladrius::the-pitch",
      "project:veritas::the-problem",
      "project:veritas::how-it-works",
      "project:veritas::talking-to-clinical-researchers",
      "project:veritas::the-contradiction-questions",
      "project:veritas::the-flashy-vs-real-debate",
      "project:formulator::core-thesis",
      "project:formulator::what-i-d-build-now",
      "project:quantum-racer::what-educational-games-get-wrong",
      "project:quantum-racer::was-it-worth-building",
      "project:gantry::project",
      "writing:future-of-ai-work::ideas-and-projects",
      "writing:the-ai-company-id-love-to-create::a-compromise",
    ],
  },
  "involvement:buildpurdue::founding-rationale": {
    defaultSourceLimit: 1,
    sourceLimits: {
      "involvement:buildpurdue": 3,
      "project:repple": 2,
    },
    nodeIds: [
      "involvement:buildpurdue::operating-model",
      "involvement:buildpurdue::why-founder-led-workshops-over-guest-speakers",
      "involvement:buildpurdue::why-the-cohort-is-gated",
      "involvement:buildpurdue::my-role",
      "involvement:buildpurdue::internal-platform-and-tracking-entrepreneurship-at-purdue",
      "involvement:buildpurdue::what-purdue-s-existing-entrepreneurship-infrastructure-gets-wrong",
      "involvement:buildpurdue::the-decision-that-draws-the-most-pushback",
      "involvement:buildpurdue::what-the-format-costs-us",
      "involvement:buildpurdue::the-we-don-t-do-anything-critique",
      "involvement:buildpurdue::how-we-measure-success-in-year-one",
      "involvement:buildpurdue::who-buildpurdue-isn-t-for",
      "project:repple::why-it-s-fun",
      "project:repple::why-i-joined",
      "project:repple::the-business-thesis-a-data-moat",
      "project:repple::marketing-before-we-had-a-ui",
      "project:repple::stickers-and-campus-density",
      "project:repple::quantity-beats-polish",
      "project:repple::distribution-is-everything-for-b2c",
      "project:repple::how-we-grew-repple",
    ],
  },
};

const AUTHORED_CONNECTIONS: Readonly<Record<string, readonly string[]>> = {
  "idea:agents:when-an-agent-is-worth-building::when-an-agent-is-worth-building": [
    "work:samsung-research-america::when-to-ask-permission",
    "project:google-tools-mcp::mcp-discovery-problem",
    "idea:where-ai-doesnt-belong:the-duct-tape-test::the-duct-tape-test",
  ],
  "work:naval-research-laboratory::the-image-to-image-insight": [
    "project:kmeans-som::the-honest-origin-story",
    "project:qkd::what-we-actually-contributed",
    "work:ideas-lab::what-s-actually-hard-about-ml-research",
  ],
  "project:repple::why-i-joined": [
    "project:repple::distribution-is-everything-for-b2c",
    "project:verbatim::why-we-kept-going-past-the-hackathon-and-why-it-died",
    "project:google-tools-mcp::who-s-actually-using-it",
  ],
  "involvement:buildpurdue::founding-rationale": [
    "involvement:buildpurdue::why-founder-led-workshops-over-guest-speakers",
    "involvement:buildpurdue::the-we-don-t-do-anything-critique",
    "project:repple::why-i-joined",
  ],
  "work:samsung-research-america::when-to-ask-permission": [
    "work:samsung-research-america::driving-the-phone-directly",
    "project:gantry::project",
    "idea:where-ai-doesnt-belong:the-duct-tape-test::the-duct-tape-test",
  ],
  "work:naval-research-laboratory::building-rag-before-rag-was-mainstream": [
    "work:memories-ai::why-long-context-isn-t-the-answer",
    "work:samsung-research-america::exposing-capability-without-flooding-context",
    "project:google-tools-mcp::mcp-discovery-problem",
  ],
  "project:verbatim::why-we-kept-going-past-the-hackathon-and-why-it-died": [
    "project:verbatim::the-technical-bet-i-d-defend",
    "project:google-tools-mcp::what-i-got-wrong",
    "project:repple::quantity-beats-polish",
  ],
  "idea:where-ai-doesnt-belong:the-duct-tape-test::the-duct-tape-test": [
    "work:samsung-research-america::why-ambient-needs-approval-somewhere-in-the-chain",
    "project:verbatim::why-we-kept-going-past-the-hackathon-and-why-it-died",
    "project:repple::ai-workout-plans-honest-assessment",
  ],
  "project:google-tools-mcp::what-it-does": [
    "work:samsung-research-america::exposing-capability-without-flooding-context",
    "work:naval-research-laboratory::building-rag-before-rag-was-mainstream",
    "work:memories-ai::why-long-context-isn-t-the-answer",
  ],
  "project:qkd::what-research-teaches": [
    "work:ideas-lab::what-s-actually-hard-about-ml-research",
    "project:kmeans-som::the-honest-origin-story",
    "work:agrpa::data-is-the-real-problem",
  ],
};

export function isAuthoredJourneyConnection(
  currentNodeId: string,
  candidateNodeId: string,
): boolean {
  return (AUTHORED_CONNECTIONS[currentNodeId] ?? []).includes(candidateNodeId);
}

const GENERIC_HEADINGS = /^(overview|what it does|the project)$/i;

function noteContext(
  category: JourneyNode["category"],
  title: string,
  meta: string,
): string {
  switch (category) {
    case "work":
      return `from my notes after working at ${title}`;
    case "projects":
      return `from my build notes on ${title}`;
    case "ideas":
      return "one section from a longer running note";
    case "writing":
      return `from “${title}”${meta ? ` · ${meta}` : ""}`;
    case "involvement":
      return `from my notes on building ${title}`;
    case "personal":
      return meta === "photography"
        ? `from my photo archive · ${title}`
        : `from my personal notes · ${title}`;
  }
}

function compactHeading(heading: string, title: string): string {
  const normalized = heading.trim().replace(/\s+/g, " ");
  if (GENERIC_HEADINGS.test(normalized)) {
    return title;
  }
  const override = QUOTE_LABELS[
    normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  ];
  if (override) return override;
  if (normalized.length <= 30) return normalized.toLowerCase();
  return `${normalized.split(" ").slice(0, 4).join(" ").toLowerCase()}…`;
}

export function journeyNodeId(artifactId: string, quoteId: string): string {
  return `${artifactId}::${quoteId}`;
}

export function buildJourneyNodes(data: LivingCorpusPayload): JourneyNode[] {
  return data.artifacts.flatMap((artifact) =>
    artifact.quotes.map((quote) => {
      const title = quote.source || artifact.title;
      return {
        id: journeyNodeId(artifact.id, quote.id),
        artifactId: artifact.id,
        category: artifact.category,
        title,
        meta: artifact.meta === title ? "" : artifact.meta,
        heading: GENERIC_HEADINGS.test(quote.heading.trim()) ? title : quote.heading,
        sectionId: quote.id,
        text: quote.text,
        href: quote.href,
        topics: artifact.topics,
        label:
          NODE_LABELS[journeyNodeId(artifact.id, quote.id)] ??
          QUOTE_LABELS[quote.id] ??
          compactHeading(quote.heading, title),
        context: noteContext(artifact.category, title, artifact.meta),
        summary: artifact.description,
        referenceItems: artifact.referenceItems ?? [],
        sections: artifact.quotes.map((section) => ({
          id: section.id,
          heading: section.heading,
          text: section.text,
        })),
        media: artifact.media,
      };
    }),
  );
}

export function buildJourneyBootstrap(
  data: LivingCorpusPayload,
): JourneyBootstrap {
  const nodes = buildJourneyNodes(data);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const used = new Set<string>();
  const entries: JourneyEntry[] = [];

  for (const spec of ENTRY_SPECS) {
    const exact = nodesById.get(spec.seedId);
    const fallback = nodes.find(
      (node) =>
        !used.has(node.id) &&
        (node.topics.includes(spec.fallbackTopic) ||
          node.heading.toLowerCase().includes(spec.fallbackTopic)),
    );
    const node = exact ?? fallback;
    if (!node) continue;
    used.add(node.id);
    entries.push({ id: spec.id, label: spec.label, node });
  }

  return { entries };
}

function overlap(left: readonly string[], right: readonly string[]): number {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  return left.reduce((count, value) => count + Number(rightSet.has(value)), 0);
}

function stableFraction(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function sourceKey(node: JourneyNode): string {
  return node.href.split("#", 1)[0] || node.artifactId;
}

function laneFor(trail: readonly JourneyNode[]): JourneyLane | undefined {
  return JOURNEY_LANES[trail[0]?.id ?? ""];
}

function sourceVisitCounts(
  trail: readonly JourneyNode[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const node of trail) {
    const source = sourceKey(node);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return counts;
}

function laneAllowsNode(
  lane: JourneyLane | undefined,
  node: JourneyNode,
  visits: ReadonlyMap<string, number>,
  trail: readonly JourneyNode[],
): boolean {
  if (!lane) return (visits.get(sourceKey(node)) ?? 0) < 1;
  if (node.category === "personal") {
    return (
      trail.length >= 2 &&
      !trail.some((chapter) => chapter.category === "personal") &&
      (visits.get(sourceKey(node)) ?? 0) < 1
    );
  }
  if (!lane.nodeIds.includes(node.id)) return false;
  const limit = lane.sourceLimits?.[node.artifactId] ?? lane.defaultSourceLimit;
  return (visits.get(sourceKey(node)) ?? 0) < limit;
}

export function buildJourneyCandidatePool(
  nodes: readonly JourneyNode[],
  current: JourneyNode,
  trail: readonly JourneyNode[],
  sessionId: string,
  limit = 20,
): JourneyNode[] {
  const visited = new Set(trail.map((node) => node.id));
  const visits = sourceVisitCounts(trail);
  const trailTopics = Array.from(new Set(trail.flatMap((node) => node.topics)));
  const lane = laneFor(trail);
  const laneIds = new Set(lane?.nodeIds ?? []);

  const scored = nodes
    .filter(
      (node) =>
        !visited.has(node.id) &&
        laneAllowsNode(lane, node, visits, trail) &&
        node.text.length >= 80,
    )
    .map((node) => {
      let score = overlap(node.topics, current.topics) * 4;
      score += overlap(node.topics, trailTopics) * 0.8;
      score += sourceKey(node) === sourceKey(current) ? 0.2 : 0.7;
      score += node.category !== current.category ? 0.6 : 0;
      score += PRIORITY_QUOTE_IDS.has(node.id.split("::").at(-1) ?? "") ? 2.4 : 0;
      score += isAuthoredJourneyConnection(current.id, node.id) ? 5 : 0;
      score += laneIds.has(node.id) ? 8 : 0;
      score += node.category === "personal" ? -1.2 : 0;
      score += node.text.length >= 180 ? 0.4 : 0;
      score += stableFraction(`${sessionId}:${current.id}:${node.id}`) * 0.3;
      return { node, score };
    })
    .sort((left, right) => right.score - left.score);

  const personal = scored
    .filter((item) => item.node.category === "personal")
    .sort(
      (left, right) =>
        stableFraction(`${sessionId}:personal:${right.node.id}`) -
        stableFraction(`${sessionId}:personal:${left.node.id}`),
    )[0]?.node;
  const primary = scored
    .filter((item) => item.node.category !== "personal")
    .slice(0, Math.max(0, limit - Number(Boolean(personal))))
    .map((item) => item.node);
  return personal ? [...primary, personal] : primary;
}

function diversify(nodes: readonly JourneyNode[], limit: number): JourneyNode[] {
  const selected: JourneyNode[] = [];
  const sources = new Set<string>();

  for (const node of nodes) {
    const source = sourceKey(node);
    if (sources.has(source)) continue;
    selected.push(node);
    sources.add(source);
    if (selected.length === limit) return selected;
  }

  for (const node of nodes) {
    if (selected.some((item) => item.id === node.id)) continue;
    selected.push(node);
    if (selected.length === limit) break;
  }
  return selected;
}

export function buildAuthoredJourneyOptions(
  nodes: readonly JourneyNode[],
  current: JourneyNode,
  trail: readonly JourneyNode[],
  sessionId: string,
  limit = 3,
): JourneyOption[] {
  const visited = new Set(trail.map((node) => node.id));
  const visits = sourceVisitCounts(trail);
  const lane = laneFor(trail);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const authored = (AUTHORED_CONNECTIONS[current.id] ?? [])
    .map((id) => nodesById.get(id))
    .filter(
      (node): node is JourneyNode =>
        Boolean(
          node &&
            !visited.has(node.id) &&
            laneAllowsNode(lane, node, visits, trail),
        ),
    );
  const candidates = buildJourneyCandidatePool(
    nodes,
    current,
    trail,
    sessionId,
  );
  const merged = [
    ...authored,
    ...candidates.filter(
      (candidate) => !authored.some((node) => node.id === candidate.id),
    ),
  ];
  return diversify(merged, limit).map((node) => ({
    label: node.label,
    node,
  }));
}

export interface JourneyCoverageReport {
  totalArtifacts: number;
  coveredArtifacts: string[];
  uncoveredArtifacts: string[];
  byEntry: Record<JourneyTopicId, string[]>;
}

/**
 * A representative chapter makes its whole artifact reachable because the
 * chapter disclosure exposes every remaining section and links to the source.
 * This audit therefore checks artifact coverage, not whether every paragraph
 * is promoted to a standalone chapter.
 */
export function auditJourneyCoverage(
  data: LivingCorpusPayload,
): JourneyCoverageReport {
  const bootstrap = buildJourneyBootstrap(data);
  const nodes = buildJourneyNodes(data);
  const byEntry = {} as Record<JourneyTopicId, string[]>;
  const covered = new Set<string>();

  for (const entry of bootstrap.entries) {
    const lane = JOURNEY_LANES[entry.node.id];
    const artifactIds = new Set<string>([entry.node.artifactId]);
    for (const node of nodes) {
      if (node.category === "personal" || lane?.nodeIds.includes(node.id)) {
        artifactIds.add(node.artifactId);
      }
    }
    byEntry[entry.id] = Array.from(artifactIds).sort();
    artifactIds.forEach((id) => covered.add(id));
  }

  const allArtifacts = data.artifacts.map((artifact) => artifact.id).sort();
  return {
    totalArtifacts: allArtifacts.length,
    coveredArtifacts: Array.from(covered).sort(),
    uncoveredArtifacts: allArtifacts.filter((id) => !covered.has(id)),
    byEntry,
  };
}

export function assertJourneyCoverage(data: LivingCorpusPayload): void {
  const report = auditJourneyCoverage(data);
  if (!report.uncoveredArtifacts.length) return;
  throw new Error(
    `Living corpus artifacts have no journey path: ${report.uncoveredArtifacts.join(", ")}`,
  );
}
