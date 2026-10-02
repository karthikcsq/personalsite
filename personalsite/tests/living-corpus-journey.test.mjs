import assert from "node:assert/strict";
import test from "node:test";

import {
  auditJourneyCoverage,
  assertJourneyCoverage,
  buildJourneyBootstrap,
  buildJourneyCandidatePool,
  buildJourneyNodes,
} from "../src/lib/living-corpus/journeyData.ts";
import {
  buildJourneyState,
  buildJourneyQuestions,
  resolveJourneySelection,
} from "../src/lib/living-corpus/journeySelection.ts";

function artifact(id, category, title, quoteId, heading, topics = []) {
  return {
    id,
    category,
    title,
    meta: "2026",
    description: `${title} description`,
    referenceItems: [`${title} reference bullet`],
    href: `/notes/${id}`,
    topics,
    quotes: [
      {
        id: quoteId,
        heading,
        text: `${heading} is explained with a concrete decision, constraint, and firsthand result that makes this passage useful to a visitor.`,
        href: `/notes/${id}#${quoteId}`,
        source: title,
      },
    ],
  };
}

const payload = {
  artifacts: [
    artifact(
      "idea:agents:when-an-agent-is-worth-building",
      "ideas",
      "Agents",
      "when-an-agent-is-worth-building",
      "When an agent is worth building",
      ["agents", "product"],
    ),
    artifact(
      "work:naval-research-laboratory",
      "work",
      "Naval Research Laboratory",
      "the-image-to-image-insight",
      "The image-to-image insight",
      ["research", "representation"],
    ),
    artifact(
      "project:repple",
      "projects",
      "Repple",
      "why-i-joined",
      "Why I joined",
      ["product", "founders"],
    ),
    artifact(
      "involvement:buildpurdue",
      "involvement",
      "buildpurdue",
      "founding-rationale",
      "Founding rationale",
      ["founders", "community"],
    ),
    artifact(
      "work:samsung-research-america",
      "work",
      "Samsung Research America",
      "when-to-ask-permission",
      "When to ask permission",
      ["agents", "trust"],
    ),
    artifact(
      "project:verbatim",
      "projects",
      "Verbatim",
      "why-we-kept-going-past-the-hackathon-and-why-it-died",
      "Why we kept going past the hackathon, and why it died",
      ["product", "failure"],
    ),
  ],
};

test("the home replaces portfolio categories with four short topics", () => {
  const bootstrap = buildJourneyBootstrap(payload);
  assert.deepEqual(
    bootstrap.entries.map((entry) => entry.label),
    ["AI", "Research", "Products", "Founders"],
  );
  assert.equal(
    bootstrap.entries[0].node.heading,
    "When an agent is worth building",
  );
  assert.deepEqual(bootstrap.entries[2].node.referenceItems, [
    "Repple reference bullet",
  ]);
});

test("candidate selection never repeats a visited chapter and stays stable for a session", () => {
  const nodes = buildJourneyNodes(payload);
  const current = nodes[0];
  const first = buildJourneyCandidatePool(nodes, current, [current], "session-a", 5);
  const second = buildJourneyCandidatePool(nodes, current, [current], "session-a", 5);

  assert.deepEqual(
    first.map((node) => node.id),
    second.map((node) => node.id),
  );
  assert.ok(first.every((node) => node.id !== current.id));
});

test("the journey moves to a new note instead of resurfacing another section from the same one", () => {
  const firstSection = artifact(
    "idea:agents:first",
    "ideas",
    "First section",
    "first",
    "First",
    ["agents"],
  );
  const secondSection = artifact(
    "idea:agents:second",
    "ideas",
    "Second section",
    "second",
    "Second",
    ["agents"],
  );
  firstSection.quotes[0].href = "/notes/topic/agents#first";
  secondSection.quotes[0].href = "/notes/topic/agents#second";
  const outside = artifact(
    "work:agents-lab",
    "work",
    "Agents Lab",
    "outside",
    "Outside",
    ["agents"],
  );
  const nodes = buildJourneyNodes({ artifacts: [firstSection, secondSection, outside] });
  const candidates = buildJourneyCandidatePool(
    nodes,
    nodes[0],
    [nodes[0]],
    "session-a",
    5,
  );

  assert.deepEqual(candidates.map((node) => node.id), [nodes[2].id]);
});

test("the Founders path stays with BuildPurdue and Repple, including deeper sections", () => {
  const founderPayload = structuredClone(payload);
  const buildPurdue = founderPayload.artifacts.find(
    (item) => item.id === "involvement:buildpurdue",
  );
  buildPurdue.quotes.push({
    id: "why-founder-led-workshops-over-guest-speakers",
    heading: "Why founder-led workshops over guest speakers",
    text: "BuildPurdue uses working founders to teach concrete decisions because peers can show the unfinished process, not only the polished outcome.",
    href: "/notes/involvement:buildpurdue#why-founder-led-workshops-over-guest-speakers",
    source: "BuildPurdue",
  });
  const repple = founderPayload.artifacts.find(
    (item) => item.id === "project:repple",
  );
  repple.quotes.push({
    id: "marketing-before-we-had-a-ui",
    heading: "Marketing before we had a UI",
    text: "Repple tested its founder thesis in public before the product was polished, turning early distribution into product evidence.",
    href: "/notes/project:repple#marketing-before-we-had-a-ui",
    source: "Repple",
  });

  const nodes = buildJourneyNodes(founderPayload);
  const current = nodes.find(
    (node) => node.id === "involvement:buildpurdue::founding-rationale",
  );
  const candidates = buildJourneyCandidatePool(
    nodes,
    current,
    [current],
    "founder-session",
    20,
  );

  assert.ok(candidates.some((node) => node.artifactId === "involvement:buildpurdue"));
  assert.ok(candidates.some((node) => node.artifactId === "project:repple"));
  assert.ok(
    candidates.every((node) =>
      ["involvement:buildpurdue", "project:repple"].includes(node.artifactId),
    ),
  );
});

test("the Founders path has to leave BuildPurdue after two follow-up chapters", () => {
  const founderPayload = structuredClone(payload);
  const buildPurdue = founderPayload.artifacts.find(
    (item) => item.id === "involvement:buildpurdue",
  );
  for (const [id, heading] of [
    ["operating-model", "Operating model"],
    ["why-founder-led-workshops-over-guest-speakers", "Why founder-led workshops"],
    ["why-the-cohort-is-gated", "Why the cohort is gated"],
  ]) {
    buildPurdue.quotes.push({
      id,
      heading,
      text: `${heading} explains a concrete operating choice in enough detail to be a useful and substantive founder passage.`,
      href: `/notes/involvement:buildpurdue#${id}`,
      source: "BuildPurdue",
    });
  }
  const repple = founderPayload.artifacts.find(
    (item) => item.id === "project:repple",
  );
  repple.quotes.push({
    id: "marketing-before-we-had-a-ui",
    heading: "Marketing before we had a UI",
    text: "Repple tested distribution before the product was polished, turning early attention into real product evidence for the founding team.",
    href: "/notes/project:repple#marketing-before-we-had-a-ui",
    source: "Repple",
  });

  const nodes = buildJourneyNodes(founderPayload);
  const get = (id) => nodes.find((node) => node.id === id);
  const trail = [
    get("involvement:buildpurdue::founding-rationale"),
    get("involvement:buildpurdue::operating-model"),
    get("involvement:buildpurdue::why-founder-led-workshops-over-guest-speakers"),
  ];
  const candidates = buildJourneyCandidatePool(
    nodes,
    trail.at(-1),
    trail,
    "founder-variety",
    20,
  );

  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((node) => node.artifactId === "project:repple"));
});

test("editorial bridge hints describe the candidate, not the chapter behind it", () => {
  const nodes = buildJourneyNodes(payload);
  const current = nodes.find(
    (node) =>
      node.id ===
      "idea:agents:when-an-agent-is-worth-building::when-an-agent-is-worth-building",
  );
  const candidate = nodes.find(
    (node) =>
      node.id === "work:samsung-research-america::when-to-ask-permission",
  );
  const state = buildJourneyState(current, [current], [candidate]);

  assert.equal(state.path_so_far[0].editorial_bridge_from_previous, false);
  assert.equal(state.candidates[0].known_good_bridge, true);
});

test("TypeSafe judgments expose every candidate and compose into three distinct continuations", () => {
  const nodes = buildJourneyNodes(payload);
  const current = nodes[0];
  const candidates = nodes.slice(1);
  const questions = buildJourneyQuestions(candidates);

  assert.equal(questions.continuity.type, "choice");
  assert.equal(questions.portrait.type, "choice");
  assert.deepEqual(Object.keys(questions.continuity.criteria), [
    "candidate_0",
    "candidate_1",
    "candidate_2",
    "candidate_3",
    "candidate_4",
    "no_match",
  ]);

  const probabilities = {
    candidate_0: 0.34,
    candidate_1: 0.28,
    candidate_2: 0.2,
    candidate_3: 0.1,
    candidate_4: 0.08,
    no_match: 0,
  };
  const selected = resolveJourneySelection(
    candidates,
    [current],
    "session-a",
    {
      continuity: { choice: "candidate_0", confidence: 0.5, probabilities },
      novelty: { choice: "candidate_1", confidence: 0.4, probabilities },
      substance: { choice: "candidate_0", confidence: 0.5, probabilities },
      portrait: { choice: "candidate_2", confidence: 0.45, probabilities },
      path_complete: { noul: 0.1 },
    },
  );

  assert.equal(selected.options.length, 3);
  assert.equal(new Set(selected.options.map((option) => option.node.id)).size, 3);
  assert.equal(selected.complete, false);
});

test("a developed path can end without manufacturing more related notes", () => {
  const nodes = buildJourneyNodes(payload);
  const trail = nodes.slice(0, 4);
  const selected = resolveJourneySelection(nodes.slice(4), trail, "session-a", {
    continuity: {
      choice: "candidate_0",
      confidence: 0.5,
      probabilities: { candidate_0: 0.7, candidate_1: 0.3, no_match: 0 },
    },
    novelty: {
      choice: "candidate_1",
      confidence: 0.4,
      probabilities: { candidate_0: 0.4, candidate_1: 0.6, no_match: 0 },
    },
    substance: {
      choice: "candidate_0",
      confidence: 0.5,
      probabilities: { candidate_0: 0.8, candidate_1: 0.2, no_match: 0 },
    },
    portrait: {
      choice: "candidate_1",
      confidence: 0.4,
      probabilities: { candidate_0: 0.35, candidate_1: 0.65, no_match: 0 },
    },
    path_complete: { noul: 0.84 },
  });

  assert.equal(selected.complete, true);
  assert.deepEqual(selected.options, []);
});

test("a repetitive single-source path cannot declare itself complete", () => {
  const nodes = buildJourneyNodes(payload);
  const trail = Array.from({ length: 4 }, (_, index) => ({
    ...nodes[0],
    id: `same-source-${index}`,
    href: `/notes/topic/agents#section-${index}`,
  }));
  const candidates = nodes.slice(1, 4);
  const probabilities = {
    candidate_0: 0.5,
    candidate_1: 0.3,
    candidate_2: 0.2,
    no_match: 0,
  };
  const selected = resolveJourneySelection(candidates, trail, "session-a", {
    continuity: { choice: "candidate_0", confidence: 0.5, probabilities },
    novelty: { choice: "candidate_1", confidence: 0.4, probabilities },
    substance: { choice: "candidate_0", confidence: 0.5, probabilities },
    portrait: { choice: "candidate_2", confidence: 0.45, probabilities },
    path_complete: { noul: 0.99 },
  });

  assert.equal(selected.complete, false);
  assert.equal(selected.options.length, 3);
});

test("a representative chapter gives every section in its note context without repeating itself", () => {
  const multi = artifact(
    "project:multi",
    "projects",
    "Multi",
    "first",
    "First section",
    ["product"],
  );
  multi.quotes.push({
    id: "second",
    heading: "Second section",
    text: "A second section with enough concrete detail to remain available inside the same source note.",
    href: "/notes/project/multi#second",
    source: "Multi",
  });
  const [node] = buildJourneyNodes({ artifacts: [multi] });

  assert.equal(node.context, "from my build notes on Multi");
  assert.equal(node.sectionId, "first");
  assert.deepEqual(node.sections.map((section) => section.id), ["first", "second"]);
});

test("coverage is audited by whole artifact and includes personal material in every corridor", () => {
  const withPersonal = structuredClone(payload);
  withPersonal.artifacts.push(
    artifact(
      "personal:music",
      "personal",
      "Piano",
      "piano",
      "Piano",
      ["personal", "music"],
    ),
  );
  const report = auditJourneyCoverage(withPersonal);

  assert.deepEqual(report.uncoveredArtifacts, []);
  assert.ok(
    Object.values(report.byEntry).every((ids) => ids.includes("personal:music")),
  );

  const nodes = buildJourneyNodes(withPersonal);
  const get = (id) => nodes.find((node) => node.id === id);
  const trail = [
    get("idea:agents:when-an-agent-is-worth-building::when-an-agent-is-worth-building"),
    get("work:samsung-research-america::when-to-ask-permission"),
    get("personal:music::piano"),
  ];
  const afterPersonal = buildJourneyCandidatePool(
    nodes,
    trail.at(-1),
    trail,
    "one-personal-beat",
    20,
  );
  assert.ok(afterPersonal.every((node) => node.category !== "personal"));

  const stranded = structuredClone(withPersonal);
  stranded.artifacts.push(
    artifact("project:stranded", "projects", "Stranded", "only", "Only", []),
  );
  assert.throws(
    () => assertJourneyCoverage(stranded),
    /project:stranded/,
  );
});
