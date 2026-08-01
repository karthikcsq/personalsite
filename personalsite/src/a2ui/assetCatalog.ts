export const A2UI_VISUAL_ASSETS = {
  "nrl-bathymetry": {
    src: "/a2ui/assets/nrl-bathymetry.png",
    alt: "Pencil drawing of an underwater acoustics experiment and sound-speed profile",
    promptHint: "underwater acoustics, sonar, bathymetry, sound-speed profile",
  },
  "nrl-image-model": {
    src: "/a2ui/assets/nrl-image-model.png",
    alt: "Pencil drawing of an image-to-image encoder-decoder model",
    promptHint: "image-to-image model, physics simulation replacement, encoder decoder",
  },
  "nrl-local-retrieval": {
    src: "/a2ui/assets/nrl-local-retrieval.png",
    alt: "Pencil drawing of a local document retrieval pipeline",
    promptHint: "local retrieval, chunking, embeddings, LLaMA 2, no external APIs",
  },
  "repple-matchup": {
    src: "/a2ui/assets/repple-matchup.png",
    alt: "Pencil drawing of two dumbbells in a competitive matchup",
    promptHint: "Repple, fitness, workouts, points, streaks, weekly matchups",
  },
  "repple-consistency": {
    src: "/a2ui/assets/repple-consistency.png",
    alt: "Flat pencil diagram connecting workouts, a calendar, streaks, and points",
    promptHint:
      "Repple consistency loop, workout logging, calendar, streaks, points, habit formation",
  },
  "buildpurdue-community": {
    src: "/a2ui/assets/buildpurdue-community.png",
    alt: "Pencil diagram of a shared founder table and connected notebooks",
    promptHint: "buildpurdue, student founders, community, peer cohort",
  },
  "product-engineering": {
    src: "/a2ui/assets/product-engineering.png",
    alt: "Pencil diagram of a laptop connected to tools and approval gates",
    promptHint: "product engineering, users, interface, prototype, tools",
  },
  "qkd-optical-path": {
    src: "/a2ui/assets/qkd-optical-path.png",
    alt: "Flat pencil schematic of a photonic quantum key distribution path",
    promptHint:
      "QKD, photonics, laser, beam splitter, polarizer, fiber, photon detector, waveform",
  },
  "workspace-orchestration": {
    src: "/a2ui/assets/workspace-orchestration.png",
    alt: "Flat pencil diagram of one connector orchestrating workspace artifacts",
    promptHint:
      "google-tools-mcp, workspace orchestration, documents, sheets, slides, email, calendar, forms, OAuth",
  },
  "agent-control-plane": {
    src: "/a2ui/assets/agent-control-plane.png",
    alt: "Flat pencil diagram of agent tools, memory, routing, and approval",
    promptHint:
      "agents, MCP tools, memory, routing, safety, approval, control plane",
  },
  "writing-marginalia": {
    src: "/a2ui/assets/writing-marginalia.png",
    alt: "Pencil collage of essay fragments with margin annotations",
    promptHint:
      "writing, essays, blog posts, opinions, principles, annotations, editorial ideas",
  },
  "caladrius-triage": {
    src: "/a2ui/assets/caladrius-triage.png",
    alt: "Flat pencil diagram of a triage intake branching to care decisions",
    promptHint:
      "Caladrius, medical triage, multi-agent routing, urgency, privacy, diagnosis",
  },
  "hackathon-sprint": {
    src: "/a2ui/assets/hackathon-sprint.png",
    alt: "Flat pencil collage of a clock, system sketch, lightning, and award ribbon",
    promptHint:
      "hackathon, overnight build, award, rapid prototype, system design, sprint",
  },
  "veritas-verification": {
    src: "/a2ui/assets/veritas-verification.png",
    alt: "Flat pencil diagram of survey quality signals converging into a verified result",
    promptHint:
      "Veritas, clinical research, proof of personhood, response quality, contradiction checks, verification",
  },
  "formulator-motion": {
    src: "/a2ui/assets/formulator-motion.png",
    alt: "Flat pencil diagram of joint angles, motion paths, camera framing, and feedback",
    promptHint:
      "FORMulator, exercise form, pose tracking, joint angles, computer vision, realtime feedback",
  },
} as const;

export type A2UIVisualAssetId = keyof typeof A2UI_VISUAL_ASSETS;
export type A2UIGalleryAssetId = `gallery:${string}`;
export type A2UIAssetId = A2UIVisualAssetId | A2UIGalleryAssetId;

export const A2UI_VISUAL_ASSET_IDS = Object.keys(
  A2UI_VISUAL_ASSETS,
) as A2UIVisualAssetId[];

const A2UI_VISUAL_ASSET_MATCH_TERMS: Partial<
  Record<A2UIVisualAssetId, readonly string[]>
> = {
  "nrl-bathymetry": ["underwater acoustics", "bathymetry"],
  "nrl-image-model": ["transmission loss", "image-to-image"],
  "nrl-local-retrieval": ["local retrieval", "classified documents"],
  "repple-matchup": ["repple", "weekly matchup"],
  "repple-consistency": [
    "consistency loop",
    "workout logging",
    "habit formation",
    "streaks",
  ],
  "buildpurdue-community": ["buildpurdue"],
  "product-engineering": [
    "product engineering",
    "full-stack platform",
    "application platform",
  ],
  "qkd-optical-path": [
    "photonic implementation",
    "photonic qkd",
    "quantum key distribution",
  ],
  "workspace-orchestration": ["google-tools-mcp"],
  "agent-control-plane": [
    "agent control plane",
    "agent orchestration",
    "approval gate",
    "tool routing",
  ],
  "hackathon-sprint": ["hackathon", "rapid prototype", "overnight build"],
  "veritas-verification": ["veritas"],
  "caladrius-triage": ["caladrius"],
  "formulator-motion": ["formulator"],
};

export function isA2UIVisualAssetId(value: string): value is A2UIVisualAssetId {
  return value in A2UI_VISUAL_ASSETS;
}

export function galleryAssetId(category: string): A2UIGalleryAssetId {
  return `gallery:${category}`;
}

export function galleryCategoryFromAssetId(value: string): string | null {
  if (!value.startsWith("gallery:")) return null;
  const category = value.slice("gallery:".length).trim();
  return category || null;
}

export function matchA2UIVisualAsset(
  sourceText: string,
): A2UIVisualAssetId | undefined {
  const normalized = sourceText.toLocaleLowerCase();
  let bestMatch: A2UIVisualAssetId | undefined;
  let bestScore = 0;

  for (const id of A2UI_VISUAL_ASSET_IDS) {
    for (const term of A2UI_VISUAL_ASSET_MATCH_TERMS[id] ?? []) {
      if (!normalized.includes(term)) continue;
      const score = term.split(/\s+/).length * 100 + term.length;
      if (score > bestScore) {
        bestMatch = id;
        bestScore = score;
      }
    }
  }

  return bestMatch;
}

export function a2uiVisualAssetPromptDirectory(): string {
  return A2UI_VISUAL_ASSET_IDS.map((id) => {
    const asset = A2UI_VISUAL_ASSETS[id];
    return `- ${id}: ${asset.promptHint}`;
  }).join("\n");
}
