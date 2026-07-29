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
} as const;

export type A2UIVisualAssetId = keyof typeof A2UI_VISUAL_ASSETS;

export const A2UI_VISUAL_ASSET_IDS = Object.keys(
  A2UI_VISUAL_ASSETS,
) as A2UIVisualAssetId[];

export function isA2UIVisualAssetId(value: string): value is A2UIVisualAssetId {
  return value in A2UI_VISUAL_ASSETS;
}

export function a2uiVisualAssetPromptDirectory(): string {
  return A2UI_VISUAL_ASSET_IDS.map((id) => {
    const asset = A2UI_VISUAL_ASSETS[id];
    return `- ${id}: ${asset.promptHint}`;
  }).join("\n");
}
