import assert from "node:assert/strict";
import test from "node:test";

import {
  artifactPath,
  buildFallbackA2UI,
  componentNavigationPath,
  isSafeA2UIPath,
  normalizeA2UIPath,
  sanitizeA2UIDocument,
} from "../src/a2ui/protocol.ts";

const artifacts = [
  {
    id: "work:Peraton Labs",
    annotation: "“The future of agents lies in control.”",
    data: { company: "Peraton Labs" },
  },
  {
    id: "project:caladrius",
    data: { title: "Caladrius" },
  },
];

const component = {
  id: "focus",
  type: "metric_grid",
  title: "Measured results",
  body: "The work improved both measures.",
  items: [
    {
      label: "Latency",
      value: "35%",
      detail: "Lower exploration latency.",
      artifactId: "work:Peraton Labs",
    },
  ],
  options: [],
  artifactIds: ["work:Peraton Labs", "work:Invented Company"],
  quoteIds: [
    "quote:work:Peraton Labs",
    "quote:work:Invented Company",
  ],
};

test("sanitizer keeps only host-known evidence and quote references", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What changed?",
      title: "What changed at Peraton Labs",
      lead: "The agent explored faster.",
      primary: component,
      supporting: [],
      actions: [],
    },
    "What changed?",
    "The agent explored faster.",
    artifacts,
  );

  assert.deepEqual(document.primary.artifactIds, ["work:Peraton Labs"]);
  assert.deepEqual(document.primary.quoteIds, ["quote:work:Peraton Labs"]);
});

test("sanitizer rejects unsafe paths and fabricated intent payloads", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What changed?",
      title: "What changed at Peraton Labs",
      lead: "The agent explored faster.",
      primary: component,
      supporting: [],
      actions: [
        { label: "Unsafe", intent: "open_path", payload: "https://evil.example" },
        { label: "Unknown", intent: "open_artifact", payload: "project:invented" },
        { label: "Work", intent: "open_artifact", payload: "work:Peraton Labs" },
      ],
    },
    "What changed?",
    "The agent explored faster.",
    artifacts,
  );

  assert.deepEqual(document.actions, [
    { label: "Work", intent: "open_artifact", payload: "work:Peraton Labs" },
  ]);
});

test("em dashes cannot reach the rendered A2UI document", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What changed?",
      title: "Agents move faster — with safer edits.",
      lead: "One server &mdash; many tools.",
      primary: {
        ...component,
        title: "A connected system — without repeated setup",
        body: "Authentication expires — the server recovers.",
        items: [
          {
            label: "Coverage — Workspace",
            value: "169 tools — one server",
            detail: "Drive through Forms — behind one OAuth flow.",
            artifactId: "work:Peraton Labs",
          },
        ],
        options: [
          {
            label: "Explore — now",
            summary: "See the system — end to end.",
            detail: "Open the source — then inspect the flow.",
          },
        ],
      },
      supporting: [],
      actions: [
        {
          label: "Ask — follow-up",
          intent: "ask_prompt",
          payload: "How does it work — technically?",
        },
      ],
    },
    "What changed?",
    "A grounded answer.",
    artifacts,
  );

  const serialized = JSON.stringify(document);
  assert.equal(serialized.includes("—"), false);
  assert.equal(serialized.toLowerCase().includes("&mdash;"), false);
  assert.match(document.title, /faster; with safer edits/);
});

test("unknown component types fall back to a narrative document", () => {
  const document = sanitizeA2UIDocument(
    {
      primary: { ...component, type: "raw_html" },
    },
    "Tell me about this",
    "A grounded answer.",
    artifacts,
  );

  assert.equal(document.primary.type, "narrative");
  assert.equal(document.primary.body, "A grounded answer.");
});

test("structured narrative items do not repeat a summary body", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What was his school experience?",
      title: "TJHSST shaped Karthik's STEM foundation",
      lead: "",
      primary: {
        ...component,
        type: "narrative",
        body: "He attended from 2020 to 2024 and earned a 5.",
      },
      supporting: [],
      actions: [],
    },
    "What was his school experience?",
    "He attended from 2020 to 2024 and earned a 5.",
    artifacts,
  );

  assert.equal(document.primary.body, "");
});

test("repeated decorative assets collapse to one illustration", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What makes Veritas work?",
      title: "Veritas protects clinical research integrity",
      lead: "",
      primary: {
        id: "veritas",
        type: "specimen_board",
        title: "",
        body: "",
        items: [
          {
            label: "Identity",
            value: "Proof of personhood",
            detail: "",
            artifactId: "project:caladrius",
            assetId: "veritas-verification",
          },
          {
            label: "Integrity",
            value: "Response checks",
            detail: "",
            artifactId: "",
            assetId: "veritas-verification",
          },
          {
            label: "Recognition",
            value: "Catapult winner",
            detail: "",
            artifactId: "",
            assetId: "veritas-verification",
          },
        ],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "What makes Veritas work?",
    "A grounded answer.",
    artifacts,
  );

  assert.deepEqual(
    document.primary.items.map((item) => item.assetId),
    ["veritas-verification", "", ""],
  );
});

test("structured items keep their facts while a repetitive lead and body are removed", () => {
  const googleToolsArtifacts = [
    {
      id: "project:google-tools-mcp",
      data: { title: "google-tools-mcp" },
    },
  ];
  const items = [
    {
      label: "What it is",
      value: "One MCP server",
      detail: "Connects agents to Google Workspace.",
      artifactId: "project:google-tools-mcp",
    },
    {
      label: "What it covers",
      value: "169 tools",
      detail: "Drive, Docs, Sheets, Slides, Gmail, Calendar, and Forms.",
      artifactId: "project:google-tools-mcp",
    },
    {
      label: "Authentication",
      value: "One OAuth flow",
      detail: "Automatically re-authenticates expired sessions.",
      artifactId: "project:google-tools-mcp",
    },
    {
      label: "Safety",
      value: "Read-before-edit guards",
      detail: "Telemetry stays off.",
      artifactId: "project:google-tools-mcp",
    },
  ];
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What is google-tools-mcp?",
      title: "google-tools-mcp gives agents one Google Workspace connection.",
      lead: "It is one MCP server with 169 tools.",
      compositionOptions: ["stacked", "primary_top"],
      primary: {
        id: "google-tools",
        type: "paper_dossier",
        title: "google-tools-mcp",
        body:
          "It is one MCP server with 169 tools across Drive, Docs, Sheets, Slides, Gmail, Calendar, and Forms. It uses one OAuth flow, automatically re-authenticates expired sessions, adds read-before-edit guards, and keeps telemetry off.",
        items,
        options: [],
        artifactIds: ["project:google-tools-mcp"],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "What is google-tools-mcp?",
    "A grounded answer.",
    googleToolsArtifacts,
  );

  assert.equal(document.lead, "");
  assert.equal(document.primary.body, "");
  assert.deepEqual(document.primary.items, items.map((item) => ({
    ...item,
    assetId: "",
  })));
});

test("label-only placeholders are removed from structured components", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What is included?",
      title: "The component explains the useful parts.",
      lead: "",
      primary: {
        ...component,
        items: [
          {
            label: "Empty placeholder",
            value: "",
            detail: "",
            artifactId: "",
          },
          {
            label: "Useful fact",
            value: "169 tools",
            detail: "Covers the Workspace surface.",
            artifactId: "",
          },
        ],
      },
      supporting: [],
      actions: [],
    },
    "What is included?",
    "A grounded answer.",
    artifacts,
  );

  assert.deepEqual(document.primary.items.map((item) => item.label), [
    "Useful fact",
  ]);
});

test("document title owns facts that narrative items would otherwise repeat", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What does Karthik study at Purdue?",
      title: "Karthik studies Computer Science and Artificial Intelligence at Purdue.",
      lead: "",
      primary: {
        id: "purdue",
        type: "narrative",
        title: "Karthik's Purdue majors",
        body: "",
        items: [
          {
            label: "University",
            value: "Purdue University",
            detail: "",
            artifactId: "",
          },
          {
            label: "Majors",
            value: "Computer Science and Artificial Intelligence",
            detail: "Double majoring across both programs.",
            artifactId: "",
          },
          {
            label: "Class year",
            value: "2027",
            detail: "",
            artifactId: "",
          },
        ],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "What does Karthik study at Purdue?",
    "",
    [],
  );

  assert.deepEqual(
    document.primary.items.map(({ label, value, detail }) => ({
      label,
      value,
      detail,
    })),
    [
      {
        label: "Majors",
        value: "",
        detail: "Double majoring across both programs.",
      },
      { label: "Class year", value: "2027", detail: "" },
    ],
  );
});

test("document title suppresses a component heading that repeats the answer", () => {
  const title =
    "Karthik studies Computer Science and Artificial Intelligence at Purdue.";
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What does Karthik study at Purdue?",
      title,
      lead: "",
      primary: {
        id: "purdue",
        type: "narrative",
        title,
        body: "",
        items: [
          {
            label: "Graduation",
            value: "May 2027",
            detail: "",
            artifactId: "",
          },
        ],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "What does Karthik study at Purdue?",
    "",
    [],
  );

  assert.equal(document.primary.title, "");
  assert.equal(document.primary.items[0].value, "May 2027");
});

test("artifact focus requires a host-known artifact", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What was his school experience?",
      title: "TJHSST shaped Karthik's STEM foundation",
      lead: "",
      primary: {
        ...component,
        type: "artifact_focus",
        artifactIds: [],
        items: component.items.map((item) => ({ ...item, artifactId: "" })),
      },
      supporting: [],
      actions: [],
    },
    "What was his school experience?",
    "A grounded answer.",
    artifacts,
  );

  assert.equal(document.primary.type, "narrative");
  assert.equal(document.primary.body, "");
  assert.equal(document.primary.items.length, 1);
});

test("fallback surfaces verified quotes without copying them into model fields", () => {
  const document = buildFallbackA2UI(
    "What did he learn?",
    "He learned that control matters.",
    artifacts,
  );
  const quote = document.supporting.find((item) => item.type === "quote_focus");

  assert.equal(document.lead, "");
  assert.equal(document.primary.body, "He learned that control matters.");
  assert.deepEqual(quote?.quoteIds, ["quote:work:Peraton Labs"]);
  assert.equal(JSON.stringify(document).includes("future of agents"), false);
});

test("single-artifact fallback makes the paper own the answer", () => {
  const document = buildFallbackA2UI(
    "What's Caladrius?",
    "Caladrius is a privacy-first hospital triage assistant.",
    [artifacts[1]],
  );

  assert.equal(document.primary.type, "artifact_focus");
  assert.equal(
    document.primary.body,
    "Caladrius is a privacy-first hospital triage assistant.",
  );
  assert.deepEqual(document.primary.artifactIds, ["project:caladrius"]);
  assert.equal(
    document.supporting.some((item) => item.type === "artifact_focus"),
    false,
  );
  assert.equal(
    JSON.stringify(document).includes(
      "Select an item to see its original page.",
    ),
    false,
  );
});

test("artifact paths resolve through host-owned routing", () => {
  assert.equal(artifactPath("work:Peraton Labs"), "/work#peraton-labs");
  assert.equal(artifactPath("project:caladrius"), "/projects#caladrius");
  assert.equal(artifactPath("blog:agents"), "/blog/agents");
  assert.equal(artifactPath("topic:agents"), null);
});

test("A2UI page links stay inside known portfolio routes", () => {
  assert.equal(isSafeA2UIPath("/about"), true);
  assert.equal(isSafeA2UIPath("/work#peraton-labs"), true);
  assert.equal(isSafeA2UIPath("/projects?focus=repple"), true);
  assert.equal(isSafeA2UIPath("/api/chat"), false);
  assert.equal(isSafeA2UIPath("https://example.com/about"), false);
  assert.equal(normalizeA2UIPath("/about"), "/about");
  assert.equal(
    normalizeA2UIPath("https://www.karthikthyagarajan.com/work#peraton-labs"),
    "/work#peraton-labs",
  );
  assert.equal(normalizeA2UIPath("https://example.com/about"), null);
});

test("navigation-only components consume their matching page action", () => {
  const navigationComponent = {
    id: "more-background",
    type: "narrative",
    title: "More background",
    body: "You can read the same Purdue study details in his About section.",
    items: [],
    options: [],
    artifactIds: [],
    quoteIds: [],
  };
  const navigationActions = [
    { label: "Open About", intent: "open_path", payload: "/about" },
  ];

  assert.equal(
    componentNavigationPath(navigationComponent, navigationActions),
    "/about",
  );
  assert.equal(
    componentNavigationPath(
      { ...navigationComponent, body: "Read the [About page](/about)." },
      [],
    ),
    "/about",
  );
  assert.equal(
    componentNavigationPath(
      { ...navigationComponent, type: "artifact_focus" },
      navigationActions,
    ),
    null,
  );
  assert.equal(
    componentNavigationPath(
      { ...navigationComponent, title: "More on his background", body: "" },
      navigationActions,
    ),
    "/about",
  );
});

test("favorite-project documents state the answer in the title", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "Show me his favorite project.",
      title: "Repple",
      lead: "A competitive fitness app.",
      compositionOptions: [
        "split_primary_left",
        "split_primary_right",
        "primary_top",
      ],
      primary: {
        ...component,
        type: "artifact_focus",
        artifactIds: ["project:caladrius"],
      },
      supporting: [],
      actions: [],
    },
    "Show me his favorite project.",
    "His favorite project is Caladrius.",
    artifacts,
  );

  assert.equal(document.title, "Karthik's favorite project is Caladrius");
  assert.equal(document.primary.type, "artifact_focus");
  assert.deepEqual(document.compositionOptions, [
    "split_primary_left",
    "split_primary_right",
    "primary_top",
  ]);
});

test("one artifact can keep different model-authored component forms", () => {
  const forms = ["field_notebook", "system_blueprint", "evidence_stack"];

  for (const type of forms) {
    const document = sanitizeA2UIDocument(
      {
        version: "1.0",
        question: "Tell me about Caladrius.",
        title: "Caladrius is a privacy-first AI triage assistant.",
        lead: "",
        compositionOptions: ["stacked", "primary_top"],
        primary: {
          id: `caladrius-${type}`,
          type,
          title: "Caladrius",
          body: "It combines encrypted intake with multi-agent triage.",
          items: [
            {
              label: "Routing",
              value: "Multi-agent triage",
              detail: "LangGraph routes symptom evidence through specialists.",
              artifactId: "project:caladrius",
              assetId: "caladrius-triage",
            },
          ],
          options: [],
          artifactIds: ["project:caladrius"],
          quoteIds: [],
        },
        supporting: [],
        actions: [],
      },
      "Tell me about Caladrius.",
      "",
      [artifacts[1]],
    );

    assert.equal(document.primary.type, type);
    assert.equal(document.primary.items[0].assetId, "caladrius-triage");
  }
});

test("the sanitizer preserves a model-authored research map and its explicit assets", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What did Karthik build at NRL?",
      title: "Karthik built two constrained ML systems at NRL.",
      lead: "",
      primary: {
        id: "nrl",
        type: "research_map",
        title: "The systems",
        body: "He joined underwater prediction and local retrieval work.",
        items: [
          {
            label: "Acoustic representation",
            value: "Sound-speed profiles as images",
            detail: "Used for transmission-loss prediction.",
            artifactId: "work:Peraton Labs",
            assetId: "nrl-bathymetry",
          },
          {
            label: "Model",
            value: "Image-to-image translation",
            detail: "Replaced slow physics simulation steps.",
            artifactId: "work:Peraton Labs",
            assetId: "nrl-image-model",
          },
          {
            label: "Retrieval",
            value: "Local LangChain RAG",
            detail: "Chunked classified documents with no external APIs.",
            artifactId: "work:Peraton Labs",
            assetId: "nrl-local-retrieval",
          },
        ],
        options: [],
        artifactIds: ["work:Peraton Labs"],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "What did Karthik build at NRL?",
    "",
    [artifacts[0]],
  );

  assert.equal(document.primary.type, "research_map");
  assert.deepEqual(
    document.primary.items.map((item) => item.assetId),
    ["nrl-bathymetry", "nrl-image-model", "nrl-local-retrieval"],
  );
});

test("career timelines keep model-authored stages and suppress a nested title", () => {
  const careerArtifacts = [
    {
      id: "work:Naval Research Laboratory",
      data: {
        role: "Research Intern",
        company: "Naval Research Laboratory",
        year: "Jun 2023 - Aug 2023",
        description: ["Built domain-specific ML systems."],
      },
    },
    {
      id: "work:Samsung Research America",
      data: {
        role: "AI Research Intern",
        company: "Samsung Research America",
        year: "May 2026 - Aug 2026",
        description: ["Researching on-device language models and agents."],
      },
    },
    {
      id: "work:Peraton Labs",
      data: {
        role: "Machine Learning Engineering Intern",
        company: "Peraton Labs",
        year: "Jun 2025 - May 2026",
        description: ["Built reinforcement-learning systems."],
      },
    },
    {
      id: "project:google-tools-mcp",
      data: { title: "google-tools-mcp", date: "2025" },
    },
  ];
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "How has Karthik's work evolved over time?",
      title: "Karthik's research focus shifted from domain ML toward LLMs and agents.",
      lead: "",
      primary: {
        id: "career",
        type: "fold_timeline",
        title: "His evolution",
        body: "",
        items: [
          {
            label: "Domain ML",
            value: "2023",
            detail: "Underwater acoustics research.",
            artifactId: "work:Naval Research Laboratory",
            assetId: "nrl-bathymetry",
          },
          {
            label: "Agent tools",
            value: "2025",
            detail: "Built MCP infrastructure.",
            artifactId: "project:google-tools-mcp",
            assetId: "product-engineering",
          },
        ],
        options: [],
        artifactIds: [
          "work:Naval Research Laboratory",
          "project:google-tools-mcp",
        ],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "How has Karthik's work evolved over time?",
    "",
    careerArtifacts,
  );

  assert.equal(document.primary.type, "fold_timeline");
  assert.equal(document.primary.title, "");
  assert.equal(
    document.title,
    "Karthik's research focus shifted from domain ML toward LLMs and agents.",
  );
  assert.equal(document.primary.items.length, 2);
  assert.equal(
    document.primary.items.at(-1).artifactId,
    "project:google-tools-mcp",
  );
  assert.equal(
    document.primary.items.filter(
      (item) => item.assetId === "product-engineering",
    ).length,
    1,
  );
});

test("fold timelines preserve six model-authored stages", () => {
  const sixStages = Array.from({ length: 6 }, (_, index) => ({
    label: `Stage ${index + 1}`,
    value: `${2021 + index}`,
    detail: `A distinct step in the model-authored story: ${index + 1}.`,
    artifactId: "",
    assetId: "",
  }));

  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "Show the full progression.",
      title: "Six connected stages",
      lead: "",
      primary: {
        id: "progression",
        type: "fold_timeline",
        title: "",
        body: "",
        items: sixStages,
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "Show the full progression.",
    "",
    [],
  );

  assert.equal(document.primary.type, "fold_timeline");
  assert.equal(document.primary.items.length, 6);
  assert.equal(document.primary.items.at(-1).label, "Stage 6");
});

test("gallery questions recover the host category index when the model omits it", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "Show me Karthik's travel gallery.",
      title: "Karthik has photographed four travel collections",
      lead: "",
      primary: {
        id: "travel",
        type: "narrative",
        title: "His travel photography",
        body: "His gallery includes trips across several regions.",
        items: [],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "Show me Karthik's travel gallery.",
    "",
    [],
    [
      "Costa Rica",
      "Hawaii",
      "Kilimanjaro and Amsterdam",
      "San Fransisco",
    ],
  );

  assert.equal(document.primary.type, "visual_mosaic");
  assert.equal(document.primary.items.length, 4);
  assert.deepEqual(
    document.primary.items.map((item) => item.assetId),
    [
      "gallery:Costa Rica",
      "gallery:Hawaii",
      "gallery:Kilimanjaro and Amsterdam",
      "gallery:San Fransisco",
    ],
  );
});

test("a named gallery category adds its photo without inventing a URL", () => {
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "What did Karthik photograph in Hawaii?",
      title: "Karthik photographed Hawaii",
      lead: "",
      primary: {
        id: "hawaii",
        type: "narrative",
        title: "Hawaii",
        body: "",
        items: [
          {
            label: "Collection",
            value: "Pacific islands",
            detail: "A travel photography set.",
            artifactId: "",
            assetId: "",
          },
        ],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "What did Karthik photograph in Hawaii?",
    "",
    [],
    ["Costa Rica", "Hawaii"],
  );

  assert.equal(document.primary.type, "visual_mosaic");
  assert.equal(document.primary.items[0].assetId, "gallery:Hawaii");
});

test("a gallery category appears once even when the model repeats it", () => {
  const repeatedItem = {
    label: "Hawaii",
    value: "5 photographs",
    detail: "A travel collection.",
    artifactId: "",
    assetId: "gallery:Hawaii",
  };
  const document = sanitizeA2UIDocument(
    {
      version: "1.0",
      question: "Show me Karthik's Hawaii gallery.",
      title: "Karthik's Hawaii gallery contains five photographs",
      lead: "",
      primary: {
        id: "hawaii",
        type: "visual_mosaic",
        title: "Hawaii",
        body: "",
        items: [repeatedItem, repeatedItem, repeatedItem],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
      supporting: [],
      actions: [],
    },
    "Show me Karthik's Hawaii gallery.",
    "",
    [],
    ["Hawaii"],
  );

  assert.equal(document.primary.items.length, 1);
  assert.equal(document.primary.items[0].assetId, "gallery:Hawaii");
});
