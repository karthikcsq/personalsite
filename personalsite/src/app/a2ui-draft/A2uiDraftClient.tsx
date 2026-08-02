"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Crosshair,
  Gauge,
  History,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { InteriorBotanicalFrame } from "@/app/components/BotanicalDetails";
import {
  A2UIExperience,
  type A2UITurn,
} from "@/app/components/a2ui/A2UIExperience";
import type { A2UIDocument } from "@/a2ui/protocol";
import { galleryAssetId } from "@/a2ui/assetCatalog";
import styles from "@/app/a2ui-draft/a2ui-draft.module.css";

type TurnSnapshot = {
  id: string;
  question: string;
};

const INITIAL_HISTORY: TurnSnapshot[] = [
  {
    id: "turn-current-work",
    question: "What is Karthik working on?",
  },
  {
    id: "turn-ai-approach",
    question: "How does Karthik approach AI?",
  },
];

const ACTION_STATES = [
  {
    label: "High-level actions",
    summary: "More predictable, less adaptable.",
    body:
      "A smaller action set makes training easier to reason about, but gives the agent fewer ways to respond when the network changes.",
  },
  {
    label: "Broader action set",
    summary: "More options, a larger learning problem.",
    body:
      "Additional actions help the agent inspect more of the network, while increasing the number of choices it has to learn from.",
  },
  {
    label: "Low-level control",
    summary: "More flexibility, harder learning.",
    body:
      "Low-level control gives the agent the most flexibility to adapt in complex environments, but it requires more exploration to learn effective behavior.",
  },
] as const;

const RESULT_ITEMS = [
  {
    value: "35%",
    label: "lower exploration latency",
    icon: Gauge,
  },
  {
    value: "25%",
    label: "higher detection coverage",
    icon: Crosshair,
  },
  {
    value: "500K+",
    label: "daily device events",
    icon: BarChart3,
  },
] as const;

const FOLD_TIMELINE_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "How has Karthik's AI work evolved?",
  title: "Karthik's research now spans models, tools, and agent systems",
  lead:
    "Each stage widened the system boundary while keeping research at the center.",
  compositionOptions: ["stacked", "primary_top"],
  presentationSeed: 0,
  primary: {
    id: "career-fold",
    type: "fold_timeline",
    title: "",
    body: "",
    items: [
      {
        label: "Underwater acoustics",
        value: "Naval Research Laboratory",
        detail:
          "Replaced slow physics simulation with deep learning while preserving the structure of a real acoustic problem.",
        artifactId: "",
        assetId: "nrl-bathymetry",
      },
      {
        label: "Research data systems",
        value: "AGRPA",
        detail:
          "Built data infrastructure that made scientific work easier to inspect and reuse.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Autonomous malware search",
        value: "Peraton Labs",
        detail:
          "Built a reinforcement-learning agent that explored large IoT environments using low-level network actions.",
        artifactId: "",
        assetId: "agent-control-plane",
      },
      {
        label: "On-device vision",
        value: "Memories.ai",
        detail:
          "Worked on computer-vision research shaped by local inference and product constraints.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Applied AI research",
        value: "Samsung Research",
        detail:
          "Worked across vision, robotics, reinforcement learning, and complete AI research systems.",
        artifactId: "",
        assetId: "product-engineering",
      },
      {
        label: "LLMs, agents, and tools",
        value: "Current direction",
        detail:
          "Builds agent infrastructure, retrieval systems, and products that make model capabilities useful under real constraints.",
        artifactId: "",
        assetId: "workspace-orchestration",
      },
    ],
    options: [],
    artifactIds: [],
    quoteIds: [],
  },
  supporting: [],
  actions: [],
};

const SPECIMEN_BOARD_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "What has Karthik built at hackathons?",
  title: "Three hackathon projects, each solving a different trust problem",
  lead:
    "Each project turns a messy real-world decision into something a system can help people make.",
  compositionOptions: ["stacked", "primary_top"],
  presentationSeed: 0,
  primary: {
    id: "hackathon-specimens",
    type: "specimen_board",
    title: "Built under a deadline",
    body:
      "The projects span clinical research, hospital triage, and real-time movement feedback.",
    items: [
      {
        label: "Veritas",
        value: "Best Proof-of-Human Application",
        detail:
          "Pairs proof of personhood with response-quality scoring so clinical researchers can trust who answered and how carefully they responded.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Caladrius",
        value: "2nd place, HackGT social impact",
        detail:
          "Uses encrypted patient data and a multi-agent triage workflow to help hospitals route urgent cases with human oversight.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "FORMulator",
        value: "Prize-winning first Purdue hackathon",
        detail:
          "Tracks pose and movement in real time, then turns joint angles and timing into concrete feedback on physical form.",
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
};

const QUANTUM_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "Has he done quantum computing research?",
  title: "Karthik built and published a working photonic QKD prototype",
  lead:
    "The project combined hands-on optics, a Python signal pipeline, and a practical result: quantum-secure key exchange built for under $2,000.",
  compositionOptions: ["primary_top", "stacked"],
  presentationSeed: 0,
  primary: {
    id: "quantum-process",
    type: "system_blueprint",
    title: "From laser pulse to shared key",
    body:
      "The research followed the complete physical and computational path instead of stopping at a circuit simulation.",
    items: [
      {
        label: "Build the optical path",
        value: "Lasers, polarizers, and beamsplitters",
        detail:
          "The team assembled and aligned a polarization-based setup for exchanging encoded bits.",
        artifactId: "",
        assetId: "qkd-optical-path",
      },
      {
        label: "Capture the signal",
        value: "10K+ oscilloscope samples",
        detail:
          "Measurements from the physical setup became the input for bit extraction and noise analysis.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Process it in Python",
        value: "Basis sifting and QBER analysis",
        detail:
          "A NumPy pipeline applied the cutoff, extracted bit sequences, and measured the quantum bit error rate.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Publish the result",
        value: "Working QKD under $2,000",
        detail:
          "The paper showed that a real photonic setup can be explored with modest laboratory resources.",
        artifactId: "",
        assetId: "",
      },
    ],
    options: [],
    artifactIds: [],
    quoteIds: [],
  },
  supporting: [
    {
      id: "quantum-cost",
      type: "metric_grid",
      title: "Why the result matters",
      body:
        "The prototype made a specialized security system accessible to a modest lab.",
      items: [
        {
          label: "prototype budget",
          value: "< $2,000",
          detail: "A working photonic implementation",
          artifactId: "",
          assetId: "",
        },
      ],
      options: [],
      artifactIds: [],
      quoteIds: [],
    },
  ],
  actions: [],
};

const TOOLS_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "What tools does he use to build?",
  title: "Karthik works across product code, ML systems, data, and agent tools",
  lead:
    "His stack is broad because his projects often cross the boundary between a model, its infrastructure, and the interface people use.",
  compositionOptions: ["stacked", "primary_top"],
  presentationSeed: 0,
  primary: {
    id: "tool-groups",
    type: "narrative",
    title: "A stack organized by what it enables",
    body:
      "The recurring pattern is Python for research and services, TypeScript for products, PostgreSQL for durable state, and MCP for agent integrations.",
    items: [
      {
        label: "Models and services",
        value: "Python, PyTorch, FastAPI",
        detail:
          "Used for machine learning experiments, retrieval systems, and production APIs.",
        artifactId: "",
        assetId: "agent-control-plane",
      },
      {
        label: "Product interfaces",
        value: "TypeScript, Next.js, React",
        detail:
          "Used to turn technical systems into complete web products and internal tools.",
        artifactId: "",
        assetId: "product-engineering",
      },
      {
        label: "Data platforms",
        value: "PostgreSQL and Supabase",
        detail:
          "Used for relational application state, authentication, and real-time product data.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Agent infrastructure",
        value: "MCP, OAuth, Google Workspace APIs",
        detail:
          "Used to give agents reliable access to tools and external systems.",
        artifactId: "",
        assetId: "workspace-orchestration",
      },
    ],
    options: [],
    artifactIds: [],
    quoteIds: [],
  },
  supporting: [
    {
      id: "tool-throughline",
      type: "quote_focus",
      title: "",
      body:
        "The tool changes with the layer of the problem; the goal is still to make the complete system useful.",
      items: [],
      options: [],
      artifactIds: [],
      quoteIds: [],
    },
  ],
  actions: [],
};

const MCP_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "What's his take on MCP?",
  title: "Karthik thinks MCP discovery should feel as simple as visiting a URL",
  lead:
    "His view comes from building google-tools-mcp and repeatedly running into setup, authentication, and service coverage friction.",
  compositionOptions: ["stacked", "primary_top"],
  presentationSeed: 0,
  primary: {
    id: "mcp-opinion",
    type: "manifesto_fold",
    title: "The protocol is useful; the experience around it still needs work",
    body:
      "He wants agents to discover trustworthy action surfaces directly, with authentication and capabilities described by the service.",
    items: [],
    options: [
      {
        label: "Discovery",
        summary: "A service should tell an agent what it can do.",
        detail:
          "Visiting an endpoint could expose the available actions and the requirements for using them.",
        assetId: "workspace-orchestration",
      },
      {
        label: "Authentication",
        summary: "OAuth should be part of the normal connection flow.",
        detail:
          "Users should not have to install several servers and maintain separate configuration files.",
        assetId: "agent-control-plane",
      },
      {
        label: "Business actions",
        summary: "Services can publish small, standardized tool definitions.",
        detail:
          "That gives agents a dependable way to book, search, or update without fragile page automation.",
        assetId: "",
      },
    ],
    artifactIds: [],
    quoteIds: [],
  },
  supporting: [
    {
      id: "mcp-proof",
      type: "metric_grid",
      title: "He tested the idea in public",
      body:
        "google-tools-mcp packages one large real-world action surface behind a single OAuth flow.",
      items: [
        {
          label: "Google Workspace tools",
          value: "169",
          detail: "Drive, Docs, Sheets, Slides, Gmail, Calendar, and Forms",
          artifactId: "",
          assetId: "",
        },
      ],
      options: [],
      artifactIds: [],
      quoteIds: [],
    },
  ],
  actions: [],
};

const FAVORITE_PROJECT_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "Show me his favorite project.",
  title: "Karthik's favorite project is Repple",
  lead:
    "Repple is a competitive fitness app for iOS with more than 200 active users. Karthik values it because the product connects software to a real motivation problem at the gym.",
  compositionOptions: ["stacked", "primary_top"],
  presentationSeed: 0,
  primary: {
    id: "repple-favorite",
    type: "field_notebook",
    title: "Repple turns consistency into a social game",
    body:
      "Workouts earn points, points build streaks, and weekly friend matchups make progress visible. ELO matchmaking keeps competition useful as people improve.",
    items: [
      {
        label: "Who uses it",
        value: "200+ active users",
        detail:
          "The app has a real community whose behavior shaped the product.",
        artifactId: "",
        assetId: "repple-consistency",
      },
      {
        label: "Core loop",
        value: "Workouts, points, streaks",
        detail:
          "Each workout contributes to a visible pattern of progress and consistency.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Friendly competition",
        value: "Weekly ELO matchups",
        detail:
          "Friends compete at a level that adjusts as their performance changes.",
        artifactId: "",
        assetId: "repple-matchup",
      },
      {
        label: "Why it is his favorite",
        value: "Real users and a real need",
        detail:
          "It creates the gym community and accountability that motivated the project in the first place.",
        artifactId: "",
        assetId: "",
      },
    ],
    options: [],
    artifactIds: ["projects/repple"],
    quoteIds: [],
  },
  supporting: [
    {
      id: "repple-quote",
      type: "quote_focus",
      title: "",
      body:
        "Working on Repple has been the most fun I've had working on an app.",
      items: [],
      options: [],
      artifactIds: [],
      quoteIds: [],
    },
  ],
  actions: [],
};

const OUTSIDE_CODE_FIXTURE: A2UIDocument = {
  version: "1.0",
  question: "What does he do outside code?",
  title: "Music, photography, and travel shape Karthik's life outside software",
  lead:
    "His interests span disciplined practice, visual observation, and exploring unfamiliar places.",
  compositionOptions: ["stacked", "primary_top"],
  presentationSeed: 0,
  primary: {
    id: "outside-code",
    type: "specimen_board",
    title: "Three ways he resets and pays attention",
    body:
      "These interests show up across his portfolio and personal history.",
    items: [
      {
        label: "Piano",
        value: "Royal Conservatory Level 8",
        detail:
          "Years of classical training gave him a creative practice built around precision and repetition.",
        artifactId: "",
        assetId: "",
      },
      {
        label: "Photography",
        value: "Landscapes and travel",
        detail:
          "His gallery collects scenes from places including Costa Rica, Hawaii, Kilimanjaro, and Amsterdam.",
        artifactId: "",
        assetId: "writing-marginalia",
      },
      {
        label: "Travel",
        value: "New places and perspectives",
        detail:
          "Travel gives him time away from projects and a steady source of visual inspiration.",
        artifactId: "",
        assetId: "",
      },
    ],
    options: [],
    artifactIds: [],
    quoteIds: [],
  },
  supporting: [
    {
      id: "gallery-link",
      type: "narrative",
      title: "See the places through his camera",
      body:
        "The [gallery](/gallery) collects photographs from trips and landscapes.",
      items: [],
      options: [],
      artifactIds: [],
      quoteIds: [],
    },
  ],
  actions: [
    {
      label: "Open the gallery",
      intent: "open_path",
      payload: "/gallery",
    },
  ],
};

function displayGalleryCategory(category: string): string {
  return category.replace(/Fransisco/gi, "Francisco");
}

function buildDynamicGalleryFixture(
  index: Record<string, string[]>,
  requestedCategory: string,
): A2UIDocument {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .replace(/fransisco/g, "francisco")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const requested = normalize(requestedCategory);
  const categories = Object.keys(index);
  const matchedCategory = requested
    ? categories.find((category) => normalize(category).includes(requested))
    : undefined;
  const selectedCategories = matchedCategory ? [matchedCategory] : categories;
  const singleCategory = selectedCategories.length === 1;
  const visibleCategory = singleCategory
    ? displayGalleryCategory(selectedCategories[0])
    : "";
  const photoCount = singleCategory
    ? index[selectedCategories[0]]?.length ?? 0
    : selectedCategories.reduce(
        (total, category) => total + (index[category]?.length ?? 0),
        0,
      );

  return {
    version: "1.0",
    question: singleCategory
      ? `Show me Karthik's ${visibleCategory} gallery.`
      : "Where has Karthik traveled?",
    title: singleCategory
      ? `Karthik photographed ${visibleCategory}`
      : `Karthik's gallery contains ${photoCount} photographs across ${selectedCategories.length} travel collections`,
    lead: "",
    compositionOptions: ["stacked", "primary_top"],
    presentationSeed: 0,
    primary: {
      id: singleCategory ? "gallery-category" : "gallery-overview",
      type: "visual_mosaic",
      title: singleCategory ? "" : "Places he photographed",
      body: singleCategory
        ? ""
        : "Each image is selected from its corresponding gallery album.",
      items: selectedCategories.map((category) => ({
        label: displayGalleryCategory(category),
        value: `${index[category]?.length ?? 0} photographs`,
        detail: "Open the gallery to browse the complete collection.",
        artifactId: "",
        assetId: galleryAssetId(category),
      })),
      options: [],
      artifactIds: [],
      quoteIds: [],
    },
    supporting: [
      {
        id: "gallery-link",
        type: "narrative",
        title: "Open the full gallery",
        body: "Browse every photograph in the [gallery](/gallery).",
        items: [],
        options: [],
        artifactIds: [],
        quoteIds: [],
      },
    ],
    actions: [
      {
        label: "Open the gallery",
        intent: "open_path",
        payload: "/gallery",
      },
    ],
  };
}

const A2UI_FIXTURES: Record<string, A2UIDocument> = {
  favorite: FAVORITE_PROJECT_FIXTURE,
  fold: FOLD_TIMELINE_FIXTURE,
  mcp: MCP_FIXTURE,
  outside: OUTSIDE_CODE_FIXTURE,
  quantum: QUANTUM_FIXTURE,
  specimen: SPECIMEN_BOARD_FIXTURE,
  tools: TOOLS_FIXTURE,
};

export default function A2uiDraftClient() {
  const [fixture, setFixture] = useState("");
  const [dynamicGalleryFixture, setDynamicGalleryFixture] =
    useState<A2UIDocument | null>(null);
  const [fixtureSeed, setFixtureSeed] = useState(0);
  const [selectedAction, setSelectedAction] = useState(2);
  const [question, setQuestion] = useState(
    "How did Karthik's work at Peraton Labs shape his views on AI agents?",
  );
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<TurnSnapshot[]>(INITIAL_HISTORY);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    setFixture(parameters.get("fixture") ?? "");
    setFixtureSeed(Number.parseInt(parameters.get("seed") ?? "0", 10) || 0);
    const galleryCategory = parameters.get("gallery");
    if (galleryCategory === null) return;
    const controller = new AbortController();
    fetch("/api/gallery", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : {}))
      .then((value: unknown) => {
        if (!value || typeof value !== "object") return;
        setDynamicGalleryFixture(
          buildDynamicGalleryFixture(
            value as Record<string, string[]>,
            galleryCategory === "all" ? "" : galleryCategory,
          ),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const fixtureDocument = dynamicGalleryFixture ?? A2UI_FIXTURES[fixture];
  if (fixtureDocument) {
    const baseDocument = fixtureDocument;
    const document = {
      ...baseDocument,
      presentationSeed: fixtureSeed,
    };
    const turns: A2UITurn[] = [
      {
        id: `visual-qa-${fixture || "gallery"}`,
        question: document.question,
        content: "",
        document,
        artifacts: [],
        isLoading: false,
      },
    ];
    return (
      <A2UIExperience
        turns={turns}
        onAsk={() => {}}
        onNewConversation={() => {}}
        suggestions={[]}
        queuedPrompts={[]}
        editingQueueIndex={-1}
        onEditQueued={() => {}}
        onRemoveQueued={() => {}}
        onReorderQueued={() => {}}
        footer={
          <div
            style={{
              width: "min(620px, calc(100vw - 32px))",
              margin: "0 auto",
              padding: "18px 28px",
              border: "1px solid var(--color-hairline)",
              borderRadius: 999,
              background: "var(--color-surface-raised)",
              boxShadow: "var(--shadow-lift)",
              color: "var(--color-ink-muted)",
            }}
          >
            Ask a follow-up
          </div>
        }
      />
    );
  }

  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuestion = prompt.trim();
    if (!nextQuestion) return;

    setHistory((current) => [
      {
        id: `turn-${Date.now()}`,
        question,
      },
      ...current,
    ]);
    setQuestion(nextQuestion);
    setPrompt("");
    setSelectedAction(2);
  };

  return (
    <div className={styles.shell} data-a2ui-draft>
      <div className={styles.botanicalFrame}>
        <InteriorBotanicalFrame />
      </div>

      <HistoryRail history={history} />

      <button
        type="button"
        className={styles.mobileHistoryButton}
        onClick={() => setHistoryOpen(true)}
        aria-label="Open previous questions"
      >
        <History aria-hidden="true" />
      </button>

      {historyOpen ? (
        <MobileHistory
          history={history}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      <main className={styles.canvas}>
        <section
          key={question}
          className={styles.answerScene}
          aria-live="polite"
        >
          <h1 className={styles.question}>{question}</h1>

          <article className={styles.answerCard}>
            <p className={styles.introduction}>
              At Peraton Labs, Karthik built a reinforcement-learning agent to
              search a large IoT network for malware. The core design question
              was how much control the agent should have over its actions in the
              network.
            </p>

            <ActionSpaceControl
              selected={selectedAction}
              onSelect={setSelectedAction}
            />

            <div className={styles.results}>
              <h2>Measured results</h2>
              <div className={styles.resultList}>
                {RESULT_ITEMS.map((result) => {
                  const Icon = result.icon;
                  return (
                    <div className={styles.resultItem} key={result.value}>
                      <span className={styles.resultIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{result.value}</strong>
                        <small>{result.label}</small>
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link
                href="/work#peraton-labs"
                className={styles.workLink}
              >
                View the Peraton work
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <blockquote className={styles.quoteCard}>
              <span className={styles.quoteMark} aria-hidden="true">
                &ldquo;
              </span>
              <p>The future of agents lies in control.</p>
              <span className={styles.quoteRule} aria-hidden="true" />
            </blockquote>
          </article>
        </section>
      </main>

      <Composer
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={submitPrompt}
      />
    </div>
  );
}

function ActionSpaceControl({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  const selectedState = ACTION_STATES[selected];

  return (
    <fieldset
      className={styles.actionSpace}
      data-selected={selected}
      aria-label="Choose the agent's level of control"
    >
      <div className={styles.actionTrack} aria-hidden="true" />
      <div className={styles.actionOptions}>
        {ACTION_STATES.map((state, index) => (
          <label
            key={state.label}
            className={styles.actionOption}
            data-active={selected === index}
          >
            <span>{state.label}</span>
            <input
              type="radio"
              name="agent-control"
              checked={selected === index}
              onChange={() => onSelect(index)}
            />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>

      <div className={styles.actionDetail}>
        <span className={styles.actionDetailPointer} aria-hidden="true" />
        <span className={styles.actionCheck}>
          <Check aria-hidden="true" />
        </span>
        <div>
          <strong>{selectedState.summary}</strong>
          <p>{selectedState.body}</p>
        </div>
      </div>
    </fieldset>
  );
}

function Composer({
  prompt,
  onPromptChange,
  onSubmit,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className={styles.composer} onSubmit={onSubmit}>
      <MessageCircle aria-hidden="true" className={styles.composerIcon} />
      <span className={styles.composerDivider} aria-hidden="true" />
      <textarea
        rows={1}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Ask another question"
        aria-label="Ask another question"
      />
      <button type="submit" disabled={!prompt.trim()} aria-label="Send question">
        <Send aria-hidden="true" />
      </button>
    </form>
  );
}

function HistoryRail({ history }: { history: TurnSnapshot[] }) {
  return (
    <aside className={styles.historyRail} aria-label="Previous questions">
      <div className={styles.historyList}>
        {history.map((turn) => (
          <div className={styles.historyItem} key={turn.id}>
            <span aria-hidden="true" />
            <p>{turn.question}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MobileHistory({
  history,
  onClose,
}: {
  history: TurnSnapshot[];
  onClose: () => void;
}) {
  return (
    <aside className={styles.mobileHistory} aria-label="Previous questions">
      <button type="button" onClick={onClose} aria-label="Close previous questions">
        <X aria-hidden="true" />
      </button>
      <div>
        {history.map((turn) => (
          <div className={styles.mobileHistoryItem} key={turn.id}>
            <span aria-hidden="true" />
            <p>{turn.question}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
