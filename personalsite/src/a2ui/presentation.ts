import type {
  A2UIComponent,
  A2UIComponentType,
  A2UIComposition,
} from "./protocol";

export type A2UIItemArrangement = "balanced" | "lead" | "rail";

export type A2UISurfaceFamily =
  | "default"
  | "field_map"
  | "archive_index"
  | "photo_letter"
  | "essay_constellation"
  | "project_workbench";

const ITEM_COLLECTION_TYPES = new Set<A2UIComponentType>([
  "narrative",
  "metric_grid",
  "evidence_stack",
  "specimen_board",
  "visual_mosaic",
]);

const ORDERED_TYPES = new Set<A2UIComponentType>([
  "timeline",
  "steps",
  "research_map",
  "fold_timeline",
  "system_blueprint",
]);

const ALWAYS_FULL_WIDTH_TYPES = new Set<A2UIComponentType>([
  "paper_dossier",
  "research_map",
  "fold_timeline",
  "field_notebook",
  "system_blueprint",
  "evidence_stack",
  "essay_margin",
  "specimen_board",
  "visual_mosaic",
  "manifesto_fold",
  "topic_compass",
]);

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mixPresentationSeed(seed: number, salt: string): number {
  let mixed = ((seed >>> 0) ^ hashText(salt)) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function uniqueTypes(types: A2UIComponentType[]): A2UIComponentType[] {
  return types.filter((type, index) => types.indexOf(type) === index);
}

function distinctArtifactCount(component: A2UIComponent): number {
  return new Set(
    [
      ...component.artifactIds,
      ...component.items.map((item) => item.artifactId),
    ].filter(Boolean),
  ).size;
}

export function surfaceCandidatesForComponent(
  component: A2UIComponent,
): A2UISurfaceFamily[] {
  const itemCount = component.items.length;
  const isCompactCollection = itemCount >= 2 && itemCount <= 4;
  const isSequence = itemCount >= 3 && itemCount <= 6;
  const hasGalleryImage = component.items.some((item) =>
    item.assetId.startsWith("gallery:"),
  );
  const ownsOneArtifact = distinctArtifactCount(component) === 1;

  if (component.type === "visual_mosaic" && hasGalleryImage) {
    return ["photo_letter", "default"];
  }

  if (
    isSequence &&
    (component.type === "timeline" || component.type === "fold_timeline")
  ) {
    return ["archive_index", "default"];
  }

  if (
    isSequence &&
    ["research_map", "system_blueprint", "steps"].includes(component.type)
  ) {
    return ["field_map", "default"];
  }

  if (
    ownsOneArtifact &&
    itemCount >= 2 &&
    itemCount <= 5 &&
    [
      "artifact_focus",
      "paper_dossier",
      "field_notebook",
      "evidence_stack",
      "essay_margin",
    ].includes(component.type)
  ) {
    return isCompactCollection
      ? ["project_workbench", "essay_constellation", "default"]
      : ["project_workbench", "default"];
  }

  if (
    isCompactCollection &&
    ["essay_margin", "narrative", "evidence_stack"].includes(component.type)
  ) {
    return ["essay_constellation", "default"];
  }

  return ["default"];
}

export function surfaceFamilyForComponent(
  component: A2UIComponent,
  seed: number,
  slot: string,
  avoided: readonly A2UISurfaceFamily[] = [],
): A2UISurfaceFamily {
  const candidates = surfaceCandidatesForComponent(component);
  const available = candidates.filter((candidate) => !avoided.includes(candidate));
  const pool = available.length > 0 ? available : candidates;
  const surfaceSeed = mixPresentationSeed(
    seed,
    `${slot}:${component.id}:surface`,
  );
  return pool[surfaceSeed % pool.length] ?? "default";
}

export function presentationTypeCandidates(
  component: A2UIComponent,
): A2UIComponentType[] {
  const hasItems = component.items.length > 0;
  const hasOptions = component.options.length > 0;
  const hasArtifact =
    component.artifactIds.some(Boolean) ||
    component.items.some((item) => item.artifactId);
  const distinctArtifactIds = new Set(
    [
      ...component.artifactIds,
      ...component.items.map((item) => item.artifactId),
    ].filter(Boolean),
  );
  const canUseSpecimenBoard =
    component.items.length >= 3 && distinctArtifactIds.size >= 2;
  const hasGalleryImages =
    component.items.filter((item) => item.assetId.startsWith("gallery:"))
      .length >= 2;

  if (!hasItems && !hasOptions) return [component.type];

  switch (component.type) {
    case "steps":
    case "research_map":
    case "system_blueprint":
      return uniqueTypes([
        component.type,
        "research_map",
        "system_blueprint",
        "steps",
      ]);
    case "timeline":
    case "fold_timeline":
      return uniqueTypes([component.type, "fold_timeline", "timeline"]);
    case "comparison":
    case "manifesto_fold":
      return hasOptions
        ? uniqueTypes([
            component.type,
            "comparison",
            "manifesto_fold",
          ])
        : [component.type];
    case "topic_compass":
      return hasOptions
        ? ["manifesto_fold", "comparison"]
        : ["narrative"];
    case "artifact_focus":
    case "paper_dossier":
    case "field_notebook":
      return hasItems
        ? uniqueTypes([
            component.type,
            ...(hasArtifact ? (["field_notebook"] as const) : []),
            "evidence_stack",
            "essay_margin",
            ...(canUseSpecimenBoard ? (["specimen_board"] as const) : []),
          ])
        : [component.type];
    case "essay_margin":
      return hasItems
        ? uniqueTypes([
            component.type,
            "narrative",
            "evidence_stack",
          ])
        : [component.type];
    case "narrative":
    case "metric_grid":
    case "evidence_stack":
    case "specimen_board":
      return hasItems
        ? uniqueTypes([
            ...(component.type !== "specimen_board" || canUseSpecimenBoard
              ? [component.type]
              : []),
            ...(hasGalleryImages ? (["visual_mosaic"] as const) : []),
            "narrative",
            "evidence_stack",
            ...(canUseSpecimenBoard ? (["specimen_board"] as const) : []),
          ])
        : [component.type];
    case "visual_mosaic":
      // Gallery categories need the gallery-aware renderer so every visual
      // family still resolves a seeded photo instead of the catalog fallback.
      return [component.type];
    default:
      return [component.type];
  }
}

function rotateItems<T>(items: T[], offset: number): T[] {
  if (items.length < 2) return items;
  const normalized = offset % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
}

export function presentA2UIComponent(
  component: A2UIComponent,
  seed: number,
  slot: string,
): A2UIComponent {
  const candidates = presentationTypeCandidates(component);
  const typeSeed = mixPresentationSeed(seed, `${slot}:${component.id}:type`);
  const type = candidates[typeSeed % candidates.length] ?? component.type;
  const itemSeed = mixPresentationSeed(seed, `${slot}:${component.id}:items`);
  const canReorder =
    ITEM_COLLECTION_TYPES.has(type) &&
    !ORDERED_TYPES.has(component.type) &&
    component.items.length > 2;

  return {
    ...component,
    type,
    items: canReorder
      ? rotateItems(component.items, itemSeed % component.items.length)
      : component.items,
  };
}

export function arrangementForComponent(
  component: A2UIComponent,
  seed: number,
  slot: string,
): A2UIItemArrangement {
  const arrangements: A2UIItemArrangement[] =
    component.items.length >= 3
      ? ["balanced", "lead", "rail"]
      : ["balanced", "lead"];
  const arrangementSeed = mixPresentationSeed(
    seed,
    `${slot}:${component.id}:arrangement`,
  );
  return arrangements[arrangementSeed % arrangements.length] ?? "balanced";
}

export function compositionCandidates(
  component: A2UIComponent,
  modelOptions: A2UIComposition[],
  supportingComponents: A2UIComponent[],
): A2UIComposition[] {
  const supportingCount = supportingComponents.length;
  if (supportingCount === 0) return ["stacked"];

  const componentNeedsFullWidth = (candidate: A2UIComponent) =>
    ALWAYS_FULL_WIDTH_TYPES.has(candidate.type) ||
    (ORDERED_TYPES.has(candidate.type) && candidate.items.length >= 4) ||
    (ITEM_COLLECTION_TYPES.has(candidate.type) &&
      candidate.items.length >= 4) ||
    (candidate.type === "narrative" && candidate.items.length >= 3) ||
    (candidate.type === "metric_grid" && candidate.items.length >= 3) ||
    candidate.items.length > 4 ||
    candidate.options.length > 3;

  const needsFullWidth =
    componentNeedsFullWidth(component) ||
    supportingComponents.some(componentNeedsFullWidth) ||
    supportingCount > 2;

  const hostOptions: A2UIComposition[] = needsFullWidth
    ? ["primary_top", "stacked"]
    : [
        "split_primary_left",
        "split_primary_right",
        "primary_top",
        "stacked",
      ];
  const requested: A2UIComposition[] =
    modelOptions.length > 0 ? modelOptions : ["stacked"];
  const compatibleRequested = requested.filter((option) =>
    hostOptions.includes(option),
  );

  return [...compatibleRequested, ...hostOptions].filter(
    (option, index, options) => options.indexOf(option) === index,
  );
}
