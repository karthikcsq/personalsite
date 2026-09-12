import { galleryCategoryFromAssetId } from "./assetCatalog.ts";
import { mixPresentationSeed } from "./presentation.ts";
import {
  artifactPath,
  componentNavigationPath,
  type A2UIComponent,
  type A2UIDocument,
} from "./protocol.ts";

// The answer is one board, not a stack of finished panels.
//
// `buildBoard` flattens a document into the individual pieces a visitor reads:
// the opening note, one piece per fact, stage, option, quote, photograph or
// diagram module, plus the source tags nothing else claimed. The renderer only
// places these; it never decides what they say.
//
// Two properties matter more than anything else here, because the document
// arrives incrementally while the model is still writing it:
//
// 1. Identity is positional, never content- or count-derived. A piece's key is
//    `<slot>:<componentId>:<role>:<index>`, so the piece that exists after two
//    items is the same React node after six.
// 2. Order is document order. Nothing is rotated, shuffled, or re-typed based
//    on how many siblings happen to have arrived, which is what made the
//    seeded presentation layer unusable mid-stream.
//
// Size, tilt and pin come from a hash of the piece's own key and its own text,
// so a piece looks the same on the tenth streamed update as on the first.

export type BoardPieceKind =
  | "lead"
  | "note"
  | "link"
  | "fact"
  | "stage"
  | "option"
  | "quote"
  | "photo"
  | "diagram";

/** Card shapes, widest first: 8, 6, 4 and 3 of the board's 12 columns. */
export type BoardPieceSpan = "hero" | "wide" | "standard" | "narrow";

export type BoardPin = "pin" | "tape" | "clip";

/** The client's artifact card, reduced to what the board needs. */
export type BoardArtifact = {
  id: string;
  label: string;
  annotation?: string;
};

export type BoardPiece = {
  /** Stable across streamed updates. Used as the React key. */
  key: string;
  kind: BoardPieceKind;
  componentId: string;
  slot: string;
  /** Reading order across the whole board, starting at 0. */
  order: number;
  eyebrow: string;
  heading: string;
  value: string;
  detail: string;
  /** Markdown prose (lead copy and component bodies only). */
  body: string;
  assetId: string;
  galleryCategory: string;
  /** The one source this piece links, if it owns one. */
  artifactId: string;
  quote: string;
  attribution: string;
  navigationPath: string;
  span: BoardPieceSpan;
  tilt: number;
  /** Pixels of vertical offset, so rows never line up like a table. */
  drop: number;
  pin: BoardPin;
};

export type Board = {
  pieces: BoardPiece[];
  /** Referenced sources no piece owns; the board pins them as a source row. */
  sourceArtifactIds: string[];
  /** Every source the board links, for host action de-duplication. */
  referencedArtifactIds: string[];
};

type BoardPieceDraft = Omit<
  BoardPiece,
  "order" | "span" | "tilt" | "drop" | "pin"
>;

const ORDERED_COMPONENT_TYPES = new Set<A2UIComponent["type"]>([
  "timeline",
  "steps",
  "fold_timeline",
  "research_map",
  "system_blueprint",
]);

const SOURCEABLE_ITEM_KINDS = new Set<BoardPieceKind>([
  "fact",
  "stage",
  "option",
  "photo",
  "diagram",
]);

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function stripMarkdownLinks(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^[“"]+|[”"]+$/g, "").trim();
}

function normalizedMatchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function emptyDraft(
  key: string,
  kind: BoardPieceKind,
  componentId: string,
  slot: string,
): BoardPieceDraft {
  return {
    key,
    kind,
    componentId,
    slot,
    eyebrow: "",
    heading: "",
    value: "",
    detail: "",
    body: "",
    assetId: "",
    galleryCategory: "",
    artifactId: "",
    quote: "",
    attribution: "",
    navigationPath: "",
  };
}

function spanForDraft(draft: BoardPieceDraft, hash: number): BoardPieceSpan {
  const weight = wordCount(
    `${draft.heading} ${draft.value} ${draft.detail} ${draft.body} ${draft.quote}`,
  );
  if (draft.kind === "lead") return "hero";
  if (draft.kind === "link") return hash % 2 ? "narrow" : "standard";
  if (draft.kind === "quote") return weight >= 22 ? (hash % 2 ? "hero" : "wide") : "standard";
  if (draft.kind === "photo") return (["hero", "wide", "standard"] as const)[hash % 3];
  if (draft.kind === "note") return weight >= 26 ? "hero" : "wide";
  if (draft.kind === "diagram") return hash % 2 ? "wide" : "standard";
  // Short facts are small notes. Long ones become a landscape strip or a tall
  // column, so neighbouring cards differ in shape instead of tiling as squares.
  if (weight <= 6) return "narrow";
  if (weight >= 22) return hash % 2 ? "wide" : "narrow";
  return "standard";
}

function pinForDraft(draft: BoardPieceDraft, hash: number): BoardPin {
  if (draft.kind === "photo" || draft.kind === "lead") return "tape";
  if (draft.kind === "quote") return "clip";
  return hash % 3 === 0 ? "tape" : "pin";
}

function tiltForDraft(draft: BoardPieceDraft, hash: number): number {
  const step = [-3, -2, -1, 1, 2, 3][hash % 6];
  const amplitude = draft.kind === "photo" ? 0.7 : 0.55;
  return Math.round(step * amplitude * 100) / 100;
}

/**
 * Assign the sources a component declared but no item claimed. Prefer an exact
 * label match, then the component's own explanatory note when there is only one
 * source, then positional alignment when the model produced one source per
 * piece. Anything left over becomes a board-level source tag, so every
 * referenced artifact stays reachable exactly once.
 */
function assignPendingSources(
  pending: string[],
  candidates: BoardPieceDraft[],
  notePiece: BoardPieceDraft | undefined,
  artifacts: Map<string, BoardArtifact>,
  claim: (artifactId: string) => string,
): string[] {
  const unassigned = [...pending];
  const open = candidates.filter((draft) => !draft.artifactId);

  for (const artifactId of [...unassigned]) {
    const label = normalizedMatchText(artifacts.get(artifactId)?.label ?? "");
    if (label.length < 4) continue;
    const matches = open.filter((draft) =>
      normalizedMatchText(
        `${draft.heading} ${draft.value} ${draft.detail}`,
      ).includes(label),
    );
    if (matches.length !== 1) continue;
    const claimed = claim(artifactId);
    if (!claimed) continue;
    matches[0].artifactId = claimed;
    open.splice(open.indexOf(matches[0]), 1);
    unassigned.splice(unassigned.indexOf(artifactId), 1);
  }

  if (unassigned.length === 1 && notePiece && !notePiece.artifactId) {
    const claimed = claim(unassigned[0]);
    if (claimed) {
      notePiece.artifactId = claimed;
      unassigned.length = 0;
    }
  }

  if (unassigned.length > 0 && unassigned.length === open.length) {
    unassigned.forEach((artifactId, index) => {
      const claimed = claim(artifactId);
      if (claimed) open[index].artifactId = claimed;
    });
    unassigned.length = 0;
  }

  const leftovers: string[] = [];
  for (const artifactId of unassigned) {
    const claimed = claim(artifactId);
    if (claimed) leftovers.push(claimed);
  }
  return leftovers;
}

function componentDrafts(
  component: A2UIComponent,
  slot: string,
  actions: A2UIDocument["actions"],
  artifacts: Map<string, BoardArtifact>,
  claim: (artifactId: string) => string,
  claimable: (artifactId: string) => boolean,
): { drafts: BoardPieceDraft[]; leftovers: string[] } {
  const key = (role: string) => `${slot}:${component.id}:${role}`;
  const navigationPath = componentNavigationPath(component, actions) ?? "";
  const ordered = ORDERED_COMPONENT_TYPES.has(component.type);

  // Built before the note piece so a resolved quote can absorb its heading,
  // but their sources are claimed after items so an explicit item reference
  // always wins the backlink.
  const quotes = component.quoteIds.flatMap((quoteId) => {
    const artifactId = quoteId.replace(/^quote:/, "");
    const artifact = artifacts.get(artifactId);
    const text = artifact?.annotation?.trim();
    if (!artifact || !text) return [];
    const draft = emptyDraft(key(`quote:${artifactId}`), "quote", component.id, slot);
    draft.quote = stripWrappingQuotes(text);
    draft.attribution = artifact.label;
    return [{ draft, artifactId }];
  });
  const quoteDrafts = quotes.map((entry) => entry.draft);

  // A quote component whose quote resolved does not also need a heading card;
  // its title becomes the quote's quiet label instead.
  const quoteOwnsHeading =
    component.type === "quote_focus" && quoteDrafts.length > 0;
  if (quoteOwnsHeading && component.title) {
    quoteDrafts[0].eyebrow = component.title;
  }

  // A link needs something to say where it goes. When point ownership has
  // cleared both the title and body, the action row still carries the path.
  let notePiece: BoardPieceDraft | undefined;
  if (
    !quoteOwnsHeading &&
    (component.body.trim() || (navigationPath && component.title.trim()))
  ) {
    notePiece = emptyDraft(
      key("note"),
      navigationPath ? "link" : "note",
      component.id,
      slot,
    );
    notePiece.heading = component.title;
    notePiece.body = navigationPath
      ? stripMarkdownLinks(component.body)
      : component.body;
    notePiece.navigationPath = navigationPath;
  }

  const itemDrafts = component.items.map((item, index) => {
    const galleryCategory = galleryCategoryFromAssetId(item.assetId) ?? "";
    const visualAssetId = galleryCategory ? "" : item.assetId;
    const kind: BoardPieceKind = galleryCategory
      ? "photo"
      : ordered
        ? "stage"
        : visualAssetId
          ? "diagram"
          : "fact";
    const draft = emptyDraft(key(`item:${index}`), kind, component.id, slot);
    draft.eyebrow = ordered ? String(index + 1).padStart(2, "0") : "";
    draft.heading = item.label;
    draft.value = item.value;
    draft.detail = item.detail;
    draft.assetId = visualAssetId;
    draft.galleryCategory = galleryCategory;
    draft.artifactId = item.artifactId ? claim(item.artifactId) : "";
    return draft;
  });

  for (const { draft, artifactId } of quotes) {
    draft.artifactId = claim(artifactId);
  }

  const optionDrafts = component.options.map((option, index) => {
    const draft = emptyDraft(key(`option:${index}`), "option", component.id, slot);
    draft.heading = option.label;
    draft.value = option.summary;
    draft.detail = option.detail;
    draft.assetId = galleryCategoryFromAssetId(option.assetId)
      ? ""
      : option.assetId;
    return draft;
  });

  const drafts = [
    ...(notePiece ? [notePiece] : []),
    ...itemDrafts,
    ...optionDrafts,
    ...quoteDrafts,
  ];

  const leftovers = assignPendingSources(
    component.artifactIds.filter(claimable),
    drafts.filter((draft) => SOURCEABLE_ITEM_KINDS.has(draft.kind)),
    notePiece,
    artifacts,
    claim,
  );

  return { drafts, leftovers };
}

/**
 * Flatten one A2UI document into the ordered pieces that make up the board.
 * Pure and incremental-safe: calling it on a growing document returns a growing
 * prefix of the same pieces, with the same keys and the same look.
 */
export function buildBoard(
  uiDocument: A2UIDocument,
  artifacts: BoardArtifact[],
  seed: number,
): Board {
  const known = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const claimedPaths = new Set<string>();
  const referencedArtifactIds: string[] = [];

  const claimable = (artifactId: string): boolean => {
    if (!known.has(artifactId)) return false;
    const path = artifactPath(artifactId);
    return Boolean(path) && !claimedPaths.has(path!);
  };
  const claim = (artifactId: string): string => {
    if (!claimable(artifactId)) return "";
    claimedPaths.add(artifactPath(artifactId)!);
    referencedArtifactIds.push(artifactId);
    return artifactId;
  };

  const drafts: BoardPieceDraft[] = [];
  const sourceArtifactIds: string[] = [];

  if (uiDocument.lead.trim()) {
    const lead = emptyDraft("document:lead", "lead", "document", "document");
    lead.body = uiDocument.lead;
    drafts.push(lead);
  }

  const slots: Array<{ component: A2UIComponent; slot: string }> = [
    { component: uiDocument.primary, slot: "primary" },
    ...uiDocument.supporting.map((component, index) => ({
      component,
      slot: `supporting-${index}`,
    })),
  ];

  for (const { component, slot } of slots) {
    const result = componentDrafts(
      component,
      slot,
      uiDocument.actions,
      known,
      claim,
      claimable,
    );
    drafts.push(...result.drafts);
    sourceArtifactIds.push(...result.leftovers);
  }

  const pieces = drafts.map((draft, order) => {
    const hash = mixPresentationSeed(seed, draft.key);
    return {
      ...draft,
      order,
      span: spanForDraft(draft, hash),
      tilt: tiltForDraft(draft, hash),
      drop: draft.kind === "lead" ? 0 : [0, 0, 10, 18][hash % 4],
      pin: pinForDraft(draft, hash),
    };
  });

  return { pieces, sourceArtifactIds, referencedArtifactIds };
}
