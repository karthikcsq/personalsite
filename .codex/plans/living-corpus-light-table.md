# Living Corpus Light Table — Candidate Build Plan

Status: superseded after visual review. The physical light-table metaphor was rejected as too visually heavy. Retained only as a record of the explored interaction model; do not implement this plan.

## Product contract

The homepage is a minimalist, spatial publishing interface for Karthik's corpus.
It is not a chatbot, a generated answer surface, a node graph, or a conventional
portfolio landing page.

The resting view is a compact, server-rendered index of real note-section titles.
The surrounding negative space is an active light table. Visitors can pull notes
out of the index, drag them through the field, and combine them. AI filters likely
targets, chooses a short semantic label, and selects the related note sections.
The authored renderer then repaints the whole page through light, shadow, weather,
position, and visibility.

The content remains Karthik's exact prose. AI may label, rank, filter, and choose
among authored scene behaviors. It must not write explanatory answer paragraphs.

## Chosen combination

- Day condition: **Solar Shadow** — true-white field, one vermilion sun, one
  botanical shadow, black type.
- Night condition: **Winter Branch** — near-black field, the actual frost-covered
  branch, a few snow particles, the same vermilion point expressed as a berry.
- Resting information model: **Living Table of Contents** — real internal note
  headings with provenance, not project bullet points.
- Dynamic model: **Light Table** — headings can be pulled into the canvas and
  combined; every successful combination repaints the entire projection.
- AI role: create/select short lenses, filter candidate sections, rank targets,
  and abstain when the relationship is weak.

## Minimalism invariants

1. Show at most eight note objects at rest and at most five after a repaint.
2. Only one note may be dragged at a time.
3. Only one environmental event may dominate a state.
4. A repaint replaces the previous projection; it never appends a transcript.
5. AI-generated visible text is limited to a one-to-four-word lens label.
6. Exact note titles, excerpts, source names, and links always come from the corpus.
7. No cards except the temporary, nearly edgeless physical paper slip during drag.
8. No nodes, connector lines, chat input, response bubbles, confidence readouts,
   AI badges, dashboards, or decorative controls.
9. The site must remain complete and readable when AI or JavaScript is unavailable.

## Interaction state machine

### 1. Rest — `index`

- Render Karthik's name, short identity line, essential navigation, and a compact
  index of seven or eight note-section headings.
- Each row includes its parent artifact as quiet provenance.
- The initial headings are curated to span work, projects, and opinions so the
  site is immediately glanceable.
- A small line of three or four AI-authored lenses may appear as plain text, not
  pills. Selecting one repaints directly into `lens`.
- The rest view is server-rendered. It makes no runtime AI call.

### 2. Pull — `dragging`

- Pointer drag lifts a heading into the open canvas as a thin piece of translucent
  paper. The original row leaves a quiet gap.
- Keyboard equivalent: focus a row, press Space to lift, arrow through candidate
  targets, Enter to combine, Escape to cancel.
- Touch equivalent: long-press to lift, then drag or tap a highlighted target.
- Drag start begins a cached semantic lookup. Likely targets increase in contrast;
  unrelated headings recede without disappearing abruptly.
- The sun/berry and branch respond continuously to position. This motion is
  renderer-owned and does not wait on the network.

### 3. Combine — `resolving`

- Dropping onto a likely target submits the sorted pair of stable section IDs.
- If a high-confidence cached edge exists, repaint immediately.
- For an uncached pair, hold the two slips together while the environment completes
  one short physical motion. Do not show a spinner or model status text.
- If the relationship is weak, the slips separate and return to their exact places.
  Abstention is a deliberate result, not an error message.

### 4. Repaint — `lens`

- Replace the entire index with one sparse semantic projection.
- Move the sun/berry, change the light plane or snow behavior, and reposition the
  branch/shadow.
- Settle the two source notes into one layered physical object.
- Show a one-to-four-word AI lens at their overlap.
- Reveal at most three additional related note headings in separate areas of the
  canvas. No generated explanatory sentence appears.
- Clicking the lens filters/recasts related sections under the same lens.
- Clicking a note opens its complete source page at the exact section anchor.
- `return all notes` restores the resting projection and original geometry.

### 5. Recast — `recasting`

- Clicking the sun during day or berry during night requests another valid lens
  set from the current projection.
- Use a session seed so a projection is stable while the visitor explores it but
  may differ on a later visit.
- Recasting changes the label, surviving headings, positions, and environmental
  parameters together. It still obeys the same object-count limits.

## Day and night as one physical system

- Default to `prefers-color-scheme`; allow the sun/berry to toggle and persist the
  visitor's override.
- Avoid a hydration flash by applying the saved theme before first paint.
- Day reveals the off-screen tree through its shadow.
- Night removes the shadow and reveals the actual branch through frost and sparse
  snow. It is the same tree and the same semantic geometry.
- Repaint semantics are identical in both themes. Only the physical expression
  changes, so this does not become two separate demos.
- `prefers-reduced-motion` performs an immediate cross-fade and position change;
  no dragging-dependent meaning is lost.

## Corpus model

The repository currently contains 18 public corpus notes and 125 internal headings.
Treat each heading section as an addressable note object.

```ts
type CorpusSection = {
  id: string;             // stable: kind/slug/heading-slug
  parentId: string;       // existing note artifact id
  kind: "project" | "work" | "involvement" | "topic";
  title: string;          // exact heading
  parentTitle: string;    // exact artifact/source name
  excerpt: string;        // exact first paragraph under the heading
  href: string;           // /notes/<kind>/<slug>#<heading>
  ordinal: number;
  sourceTopics: string[];
};

type CorpusLens = {
  id: string;
  label: string;          // one to four words
  sectionIds: string[];
  provenance: "generated" | "curated";
};

type CorpusEdge = {
  a: string;
  b: string;
  candidateLensIds: string[];
  deterministicStrength: number;
};
```

- Extend the existing note parser rather than duplicating Markdown parsing.
- Generate stable section IDs from the existing normalized heading IDs.
- Never send full note bodies to the client. Initial HTML contains the visible
  projection; the lightweight catalog contains IDs, titles, provenance, URLs, and
  short exact excerpts only.
- Preserve existing note pages as canonical reading destinations.

## AI boundary

### Offline corpus compilation

Add an explicit script that runs when corpus content changes, not on every deploy:

1. Parse all sections.
2. Embed sections and compute the nearest-neighbor graph.
3. Use structured generation to propose a reviewed vocabulary of concise lenses
   and candidate labels for high-similarity pairs.
4. Assign stable IDs and write a versioned `corpus-projections.json` artifact.
5. Validate that every referenced section exists, every label is one to four words,
   and every excerpt is byte-derived from the corpus.

This makes the first interaction instant and keeps arbitrary generated language out
of the public interface.

### Runtime TypeSafe decision layer

Use TypeSafe only for the judgments it is designed to make:

- `Noul`: is this pair meaningfully related enough to repaint?
- `Choice`: which candidate lens best describes the pair?
- `Score`: how strong is each candidate target or resulting projection?

The server receives stable section IDs, resolves their exact text, and submits the
state plus bounded candidate choices. The browser never sends or receives arbitrary
AI prose. The response contains only known IDs, probabilities, confidence, and the
chosen lens ID.

For controlled nondeterminism, sample from candidates that clear the confidence
gate and remain close to the top probability. Seed the sample per session and pair,
so back/forward navigation is stable.

Fallback behavior is mandatory: if TypeSafe is unavailable, use the precompiled
highest-strength edge and label. The visual interaction and content remain complete.

## Renderer contract

The AI never emits coordinates, CSS, colors, assets, animation instructions, or
component types. It emits semantic IDs. The authored repaint engine maps those IDs
to one of a small number of scene cues:

```ts
type Projection =
  | { mode: "index"; sectionIds: string[]; seed: number }
  | { mode: "lens"; lensId: string; sourceIds: [string, string]; sectionIds: string[]; seed: number };

type SceneCue = {
  focus: "rest" | "pull" | "combine" | "abstain";
  sun: { x: number; y: number };
  branchAngle: number;
  lightPlane: number;
  precipitationSeed: number;
};
```

- Layout geometry comes from authored slots and seeded variants, never generated CSS.
- Animate transforms and opacity; avoid layout-thrashing top/left loops.
- Use `startTransition` when swapping projections so dragging remains responsive.
- Keep transient pointer coordinates in refs rather than React state.
- Load the environmental renderer dynamically after the server-rendered content.

## Visual implementation

- Day background is true white, not the current oat/cream surface.
- Night background is near-black with warm-white text.
- Keep Karla initially; validate it against the accepted concept before considering
  a font change. Expanded passages may retain Source Serif only if it improves
  reading without making the home page editorially busy.
- Produce a small authored asset set after concept approval: transparent botanical
  shadow layers for day, a matching frost-covered branch for night, and sparse snow
  particles. The sun/berry remains code-native.
- Use CSS transforms, masks, and opacity to reposition the assets; do not generate
  images at runtime.
- The temporary paper slip uses square edges, subtle fiber, and one soft physical
  shadow. It must not resemble an app card.

## Proposed code shape

- `src/app/page.tsx`: retain identity JSON-LD, `llms.txt` discovery, crawlable
  navigation, and server-render the initial corpus projection.
- `src/app/components/corpus/LivingCorpus.tsx`: client state machine and composition.
- `src/app/components/corpus/NoteIndex.tsx`: resting rows and semantic target states.
- `src/app/components/corpus/DraggableNote.tsx`: pointer, keyboard, and touch behavior.
- `src/app/components/corpus/LightTableScene.tsx`: day/night environment renderer.
- `src/app/components/corpus/CorpusProjection.tsx`: repainted lens view.
- `src/app/components/corpus/useCorpusDrag.ts`: transient gesture logic.
- `src/app/components/corpus/useProjectionHistory.ts`: URL and back/forward state.
- `src/app/api/corpus/compose/route.ts`: validated TypeSafe decision endpoint.
- `src/ai/typesafe.ts`: server-only client wrapper, confidence gates, timeouts,
  and deterministic fallback.
- `src/utils/noteSections.ts`: section extraction built on the existing notes parser.
- `src/data/corpus-projections.json`: generated and validated semantic graph.
- `scripts/compile-corpus-projections.ts`: explicit offline compiler.

Do not delete or rewrite the existing A2UI/chat work while building this surface.
Remove `HomeChatClient` from the homepage only when the replacement passes visual,
interaction, and accessibility QA. Keep the old implementation intact until the
new direction is explicitly accepted.

## Delivery sequence

1. **Content foundation**
   - Extract and test the 125 addressable sections.
   - Add canonical URLs and exact excerpts.
   - Create a deterministic initial projection.

2. **Static visual repaint**
   - Implement the accepted rest and combined states with hard-coded sample IDs.
   - Lock desktop and mobile typography, geometry, day/night palette, and assets.

3. **Interaction mechanics**
   - Implement pointer, keyboard, and touch pull/combine/reset behavior.
   - Add projection history and deep-linkable URL state.
   - Verify the whole loop without any network AI.

4. **Corpus compiler**
   - Produce embeddings, semantic edges, reviewed lenses, and validation reports.
   - Make all common combinations resolve locally and instantly.

5. **TypeSafe integration**
   - Add runtime confidence gating and candidate-lens selection.
   - Add timeout, cache, rate limit, and deterministic fallback.
   - Confirm that no model-authored prose reaches the renderer.

6. **Environmental behavior**
   - Connect semantic state to sun, shadow, branch, snow, and light-plane movement.
   - Add session-seeded recasting and reduced-motion behavior.

7. **Whole-site repaint**
   - Carry the palette, typography, and quiet chrome to notes, work, projects,
     writing, and reading pages without forcing the drag interaction everywhere.
   - Keep article pages straightforward and fast.

8. **Verification**
   - Unit-test parser IDs, graph references, AI response validation, abstention,
     deterministic fallback, and seeded projection stability.
   - Browser-test mouse, keyboard, touch, history, refresh, offline mode, missing
     API keys, reduced motion, and both themes.
   - Compare desktop renders at 1536×1024 and representative mobile views against
     the accepted visual concepts.

## Performance and quality gates

- Initial render makes no model call and remains crawlable.
- Initial text is visible before environmental JavaScript loads.
- Cached drag targets should appear in the same animation frame.
- A cold runtime decision has a strict timeout; timeout uses the local graph.
- Drag stays at 60 fps on a normal laptop and never stores pointer position in
  component state per frame.
- Every visible excerpt can be traced to an exact corpus span.
- Every repaint is shareable or recoverable through browser history.
- The experience works with keyboard, touch, reduced motion, and unavailable AI.
- A complete interaction never displays more than five objects after repaint.

## Recommended defaults still open to user revision

- Theme follows system preference; sun/berry toggles a persisted override.
- The first lens vocabulary is generated offline and reviewed before shipping.
- Only semantically strong pairs combine; weak pairs physically separate.
- The current chat/A2UI stack stays intact but is no longer the homepage once the
  replacement is accepted and verified.
