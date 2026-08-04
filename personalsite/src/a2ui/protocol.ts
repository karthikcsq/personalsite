import {
  galleryAssetId,
  galleryCategoryFromAssetId,
  type A2UIAssetId,
  type A2UIVisualAssetId,
} from "./assetCatalog.ts";

const SAFE_A2UI_VISUAL_ASSET_IDS = new Set<string>([
  "nrl-bathymetry",
  "nrl-image-model",
  "nrl-local-retrieval",
  "repple-matchup",
  "repple-consistency",
  "buildpurdue-community",
  "product-engineering",
  "qkd-optical-path",
  "workspace-orchestration",
  "agent-control-plane",
  "writing-marginalia",
  "caladrius-triage",
  "hackathon-sprint",
  "veritas-verification",
  "formulator-motion",
]);

function isA2UIVisualAssetId(value: string): value is A2UIVisualAssetId {
  return SAFE_A2UI_VISUAL_ASSET_IDS.has(value);
}

function normalizeGalleryCategoryName(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/fransisco/g, "francisco")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const A2UI_COMPONENT_TYPES = [
  "narrative",
  "metric_grid",
  "timeline",
  "comparison",
  "artifact_focus",
  "quote_focus",
  "steps",
  "paper_dossier",
  "research_map",
  "fold_timeline",
  "manifesto_fold",
  "topic_compass",
  "field_notebook",
  "system_blueprint",
  "evidence_stack",
  "essay_margin",
  "specimen_board",
  "visual_mosaic",
] as const;

export type A2UIComponentType = (typeof A2UI_COMPONENT_TYPES)[number];

export const A2UI_COMPOSITIONS = [
  "stacked",
  "split_primary_left",
  "split_primary_right",
  "primary_top",
] as const;

export type A2UIComposition = (typeof A2UI_COMPOSITIONS)[number];

export const A2UI_INTENTS = [
  "ask_prompt",
  "open_artifact",
  "open_path",
  "focus_component",
  "copy_answer",
] as const;

export type A2UIIntent = (typeof A2UI_INTENTS)[number];

export type A2UIItem = {
  label: string;
  value: string;
  detail: string;
  artifactId: string;
  assetId: A2UIAssetId | "";
};

export type A2UIOption = {
  label: string;
  summary: string;
  detail: string;
  assetId: A2UIAssetId | "";
};

export type A2UIComponent = {
  id: string;
  type: A2UIComponentType;
  title: string;
  body: string;
  items: A2UIItem[];
  options: A2UIOption[];
  artifactIds: string[];
  quoteIds: string[];
};

export type A2UIAction = {
  label: string;
  intent: A2UIIntent;
  payload: string;
};

export type A2UIDocument = {
  version: "1.0";
  question: string;
  title: string;
  lead: string;
  compositionOptions: A2UIComposition[];
  primary: A2UIComponent;
  supporting: A2UIComponent[];
  actions: A2UIAction[];
  /**
   * Host-owned entropy for presentation choices. The model schema never emits
   * this field; the client adds it when a fresh A2UI response arrives.
   */
  presentationSeed?: number;
};

export type A2UIArtifactLike = {
  id: string;
  annotation?: string;
  data: object;
};

export const A2UI_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "portfolio_a2ui_document",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "version",
        "question",
        "title",
        "lead",
        "compositionOptions",
        "primary",
        "supporting",
        "actions",
      ],
      properties: {
        version: { type: "string", enum: ["1.0"] },
        question: { type: "string" },
        title: { type: "string" },
        lead: { type: "string" },
        compositionOptions: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "string",
            enum: [...A2UI_COMPOSITIONS],
          },
        },
        primary: { $ref: "#/$defs/component" },
        supporting: {
          type: "array",
          maxItems: 2,
          items: { $ref: "#/$defs/component" },
        },
        actions: {
          type: "array",
          maxItems: 3,
          items: { $ref: "#/$defs/action" },
        },
      },
      $defs: {
        item: {
          type: "object",
          additionalProperties: false,
          required: ["label", "value", "detail", "artifactId", "assetId"],
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            detail: { type: "string" },
            artifactId: { type: "string" },
            assetId: { type: "string" },
          },
        },
        option: {
          type: "object",
          additionalProperties: false,
          required: ["label", "summary", "detail", "assetId"],
          properties: {
            label: { type: "string" },
            summary: { type: "string" },
            detail: { type: "string" },
            assetId: { type: "string" },
          },
        },
        component: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "type",
            "title",
            "body",
            "items",
            "options",
            "artifactIds",
            "quoteIds",
          ],
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: [...A2UI_COMPONENT_TYPES] },
            title: { type: "string" },
            body: { type: "string" },
            items: {
              type: "array",
              maxItems: 6,
              items: { $ref: "#/$defs/item" },
            },
            options: {
              type: "array",
              maxItems: 4,
              items: { $ref: "#/$defs/option" },
            },
            artifactIds: {
              type: "array",
              maxItems: 5,
              items: { type: "string" },
            },
            quoteIds: {
              type: "array",
              maxItems: 3,
              items: { type: "string" },
            },
          },
        },
        action: {
          type: "object",
          additionalProperties: false,
          required: ["label", "intent", "payload"],
          properties: {
            label: { type: "string" },
            intent: { type: "string", enum: [...A2UI_INTENTS] },
            payload: { type: "string" },
          },
        },
      },
    },
  },
};

const clean = (value: unknown, max: number): string => {
  if (typeof value !== "string") return "";
  const normalized = value
    .replace(/\s*(?:\u2014|&mdash;)\s*/gi, "; ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, max);
  const sentence = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
  );
  if (sentence >= max * 0.58) return slice.slice(0, sentence + 1);
  const word = slice.lastIndexOf(" ");
  return `${slice.slice(0, word >= max * 0.7 ? word : max).trim()}…`;
};

function sanitizeCompositionOptions(value: unknown): A2UIComposition[] {
  const valid = Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (option): option is A2UIComposition =>
              A2UI_COMPOSITIONS.includes(option as A2UIComposition),
          ),
        ),
      ].slice(0, 3)
    : [];
  return valid.length > 0 ? valid : ["stacked", "primary_top"];
}

function quoteIdForArtifact(id: string): string {
  return `quote:${id}`;
}

export function availableQuoteIds(artifacts: A2UIArtifactLike[]): Set<string> {
  return new Set(
    artifacts
      .filter((artifact) => Boolean(artifact.annotation?.trim()))
      .map((artifact) => quoteIdForArtifact(artifact.id)),
  );
}

function sanitizeComponent(
  value: unknown,
  allowedArtifacts: Set<string>,
  allowedQuotes: Set<string>,
  allowedGalleryCategories: Set<string>,
  fallbackId: string,
): A2UIComponent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const type = A2UI_COMPONENT_TYPES.includes(raw.type as A2UIComponentType)
    ? (raw.type as A2UIComponentType)
    : null;
  if (!type) return null;

  const maxItems = ["fold_timeline", "timeline", "system_blueprint", "specimen_board"]
    .includes(type)
    ? 6
    : 4;
  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, maxItems).flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Record<string, unknown>;
        const artifactId = clean(item.artifactId, 160);
        const assetId = clean(item.assetId, 160);
        const requestedGalleryCategory =
          galleryCategoryFromAssetId(assetId);
        const galleryCategory = requestedGalleryCategory
          ? [...allowedGalleryCategories].find(
              (category) =>
                normalizeGalleryCategoryName(category) ===
                normalizeGalleryCategoryName(requestedGalleryCategory),
            )
          : undefined;
        const safeAssetId: A2UIAssetId | "" = isA2UIVisualAssetId(assetId)
          ? assetId
          : galleryCategory
            ? galleryAssetId(galleryCategory)
            : "";
        return [{
          label: clean(item.label, 90),
          value: clean(item.value, 80),
          detail: clean(item.detail, 220),
          artifactId: allowedArtifacts.has(artifactId) ? artifactId : "",
          assetId: safeAssetId,
        }];
      })
    : [];
  const options = Array.isArray(raw.options)
    ? raw.options.slice(0, 4).flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const option = entry as Record<string, unknown>;
        const assetId = clean(option.assetId, 80);
        const safeAssetId: A2UIVisualAssetId | "" =
          isA2UIVisualAssetId(assetId) ? assetId : "";
        return [{
          label: clean(option.label, 80),
          summary: clean(option.summary, 140),
          detail: clean(option.detail, 360),
          assetId: safeAssetId,
        }];
      })
    : [];
  const artifactIds = Array.isArray(raw.artifactIds)
    ? raw.artifactIds
        .map((id) => clean(id, 160))
        .filter((id) => allowedArtifacts.has(id))
        .slice(0, maxItems)
    : [];
  const quoteIds = Array.isArray(raw.quoteIds)
    ? raw.quoteIds
        .map((id) => clean(id, 180))
        .filter((id) => allowedQuotes.has(id))
        .slice(0, 3)
    : [];
  const safeType =
    (type === "artifact_focus" || type === "paper_dossier") &&
    artifactIds.length === 0 &&
    !items.some((item) => item.artifactId)
      ? "narrative"
      : type;

  return {
    id: clean(raw.id, 80) || fallbackId,
    type: safeType,
    title: clean(raw.title, 140),
    body: clean(raw.body, type === "narrative" ? 480 : 360),
    items,
    options,
    artifactIds: [...new Set(artifactIds)],
    quoteIds: [...new Set(quoteIds)],
  };
}

const CLAIM_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "he",
  "his",
  "in",
  "is",
  "it",
  "karthik",
  "of",
  "on",
  "the",
  "to",
  "with",
]);

const CLAIM_CLASSIFIERS = new Set([
  "app",
  "application",
  "college",
  "company",
  "organization",
  "project",
  "school",
  "university",
]);

function claimTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9]+/)
    .filter(
      (token) =>
        token &&
        !CLAIM_STOPWORDS.has(token) &&
        !CLAIM_CLASSIFIERS.has(token),
    );
}

function claimIsOwnedBy(fact: string, owner: string): boolean {
  if (!fact.trim()) return false;
  const factTokens = [...new Set(claimTokens(fact))];
  const ownerTokens = new Set(claimTokens(owner));
  if (factTokens.length === 0) return false;
  if (
    factTokens.length === 1 &&
    !/^\d/.test(factTokens[0]) &&
    factTokens[0].length < 5
  ) {
    return false;
  }
  return factTokens.every((token) => ownerTokens.has(token));
}

function itemClaimsOwnedBy(
  component: A2UIComponent,
  owner: string,
): number {
  return component.items.filter(
    (item) =>
      claimIsOwnedBy(item.value, owner) ||
      claimIsOwnedBy(item.detail, owner),
  ).length;
}

function normalizeStructuredClaimOwnership(
  component: A2UIComponent,
  documentCopy: string,
): A2UIComponent {
  const titleOwned = claimIsOwnedBy(component.title, documentCopy);
  const substantiveItems = component.items.filter(
    (item) => item.value || item.detail,
  );
  const bodyOwnedItems = component.body
    ? itemClaimsOwnedBy(component, component.body)
    : 0;
  const bodyRepeatsStructuredFacts =
    substantiveItems.length >= 2 &&
    bodyOwnedItems >= 2 &&
    bodyOwnedItems >= Math.ceil(substantiveItems.length / 2);

  return {
    ...component,
    title: titleOwned ? "" : component.title,
    body: bodyRepeatsStructuredFacts ? "" : component.body,
  };
}

function removeLeadRepeatedByPrimary(
  lead: string,
  primary: A2UIComponent,
): string {
  if (!lead) return lead;
  const substantiveItems = primary.items.filter(
    (item) => item.value || item.detail,
  );
  if (substantiveItems.length < 2) return lead;
  const repeatedItems = itemClaimsOwnedBy(primary, lead);
  return repeatedItems >= 2 &&
    repeatedItems >= Math.ceil(substantiveItems.length / 2)
    ? ""
    : lead;
}

function removeDocumentOwnedItemClaims(
  component: A2UIComponent,
  documentCopy: string,
): A2UIComponent {
  const items = component.items
    .flatMap((item) => {
      const valueOwned = claimIsOwnedBy(item.value, documentCopy);
      const detailOwned = claimIsOwnedBy(item.detail, documentCopy);

      if (valueOwned && (!item.detail || detailOwned)) return [];
      if (valueOwned) return [{ ...item, value: "" }];
      if (detailOwned) return [{ ...item, detail: "" }];
      return [item];
    })
    .filter((item) => item.value || item.detail || item.assetId);

  return { ...component, items };
}

function normalizeExpressiveComposition(
  component: A2UIComponent,
): A2UIComponent {
  const usedAssets = new Set<string>();
  const composedItems = component.items.map((item) => {
    let assetId = item.assetId;
    if (
      assetId &&
      component.type !== "visual_mosaic" &&
      usedAssets.has(assetId)
    ) {
      assetId = "";
    }
    if (assetId) usedAssets.add(assetId);
    return {
      ...item,
      assetId,
    };
  });

  return {
    ...component,
    items: composedItems,
  };
}

const GALLERY_QUESTION =
  /\b(gallery|photo(?:graph|graphs|graphy)?|travel(?:ed|s|ing)?|places? (?:he|karthik) (?:has )?(?:been|visited|photographed))\b/i;

function normalizeGalleryComposition(
  component: A2UIComponent,
  question: string,
  galleryCategories: string[],
): A2UIComponent {
  const normalizedQuestion = normalizeGalleryCategoryName(question);
  const questionTokens = new Set(normalizedQuestion.split(" "));
  const questionGalleryCategory = galleryCategories.find((category) => {
    const normalizedCategory = normalizeGalleryCategoryName(category);
    if (normalizedQuestion.includes(normalizedCategory)) return true;
    return normalizedCategory
      .split(" ")
      .filter((token) => token.length >= 4)
      .some((token) => questionTokens.has(token));
  });
  const hasGalleryItem = component.items.some(
    (item) => Boolean(galleryCategoryFromAssetId(item.assetId)),
  );
  const asksForGallery = GALLERY_QUESTION.test(question);

  if (!hasGalleryItem && !questionGalleryCategory && !asksForGallery) {
    return component;
  }

  let items = component.items;
  if (!hasGalleryItem && questionGalleryCategory) {
    items =
      items.length > 0
        ? [
            {
              ...items[0],
              assetId: galleryAssetId(questionGalleryCategory),
            },
            ...items.slice(1),
          ]
        : [
            {
              label: questionGalleryCategory,
              value: "Photography collection",
              detail: "",
              artifactId: "",
              assetId: galleryAssetId(questionGalleryCategory),
            },
          ];
  } else if (!hasGalleryItem && asksForGallery) {
    items = galleryCategories.map((category) => ({
        label: category,
        value: "Photography collection",
        detail: "",
        artifactId: "",
        assetId: galleryAssetId(category),
      }));
  }

  const usedGalleryCategories = new Set<string>();
  items = items.filter((item) => {
    const category = galleryCategoryFromAssetId(item.assetId);
    if (!category) return true;
    if (usedGalleryCategories.has(category)) return false;
    usedGalleryCategories.add(category);
    return true;
  });

  return {
    ...component,
    type: "visual_mosaic",
    items,
  };
}

export function isSafeA2UIPath(path: string): boolean {
  return /^\/(work|projects|involvement|blog|gallery|about)(?:[/?#].*)?$/.test(path);
}

export function normalizeA2UIPath(href: string): string | null {
  const value = href.trim();
  if (isSafeA2UIPath(value)) return value;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["karthikthyagarajan.com", "www.karthikthyagarajan.com"].includes(
        url.hostname,
      )
    ) {
      return null;
    }
    const path = `${url.pathname}${url.search}${url.hash}`;
    return isSafeA2UIPath(path) ? path : null;
  } catch {
    return null;
  }
}

export function componentNavigationPath(
  component: A2UIComponent,
  actions: A2UIAction[],
): string | null {
  if (
    component.type !== "narrative" ||
    component.items.length > 0 ||
    component.options.length > 0 ||
    component.artifactIds.length > 0 ||
    component.quoteIds.length > 0
  ) {
    return null;
  }

  for (const match of component.body.matchAll(/\]\(([^)]+)\)/g)) {
    const path = normalizeA2UIPath(match[1]);
    if (path) return path;
  }

  const copy = `${component.title} ${component.body}`.toLowerCase();
  const validOpenPaths: string[] = [];
  for (const action of actions) {
    if (action.intent !== "open_path") continue;
    const path = normalizeA2UIPath(action.payload);
    if (!path) continue;
    validOpenPaths.push(path);
    const section = path.split(/[/?#]/).filter(Boolean)[0]?.toLowerCase();
    if (section && new RegExp(`\\b${section}\\b`, "i").test(copy)) return path;
  }
  return validOpenPaths.length === 1 ? validOpenPaths[0] : null;
}

export function sanitizeA2UIDocument(
  value: unknown,
  question: string,
  reply: string,
  artifacts: A2UIArtifactLike[],
  galleryCategories: string[] = [],
): A2UIDocument {
  const fallback = buildFallbackA2UI(question, reply, artifacts);
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;
  const allowedArtifacts = new Set(artifacts.map((artifact) => artifact.id));
  const allowedQuotes = availableQuoteIds(artifacts);
  const allowedGalleryCategories = new Set(galleryCategories);
  let primary = sanitizeComponent(
    raw.primary,
    allowedArtifacts,
    allowedQuotes,
    allowedGalleryCategories,
    "answer",
  );
  if (!primary) return fallback;
  if (primary.type === "narrative" && primary.items.length > 0) {
    primary.body = "";
  }
  primary = normalizeGalleryComposition(
    primary,
    question,
    galleryCategories,
  );
  if (["timeline", "fold_timeline"].includes(primary.type)) {
    const canonicalWorkArtifactIds = artifacts
      .map((artifact) => artifact.id)
      .filter((artifactId) => artifactId.startsWith("work:"))
      .slice(0, 6);
    if (canonicalWorkArtifactIds.length >= 3) {
      const stagedArtifactIds = primary.items
        .map((item) => item.artifactId)
        .filter(Boolean);
      primary.artifactIds = [
        ...new Set([
          ...stagedArtifactIds,
          ...canonicalWorkArtifactIds,
          ...primary.artifactIds,
        ]),
      ].slice(0, 6);
    }
  }

  let supporting = Array.isArray(raw.supporting)
    ? raw.supporting
        .slice(0, 2)
        .map((component, index) =>
          sanitizeComponent(
            component,
            allowedArtifacts,
            allowedQuotes,
            allowedGalleryCategories,
            `support-${index + 1}`,
          ),
        )
        .filter((component): component is A2UIComponent => component !== null)
    : [];

  const firstQuoteId = allowedQuotes.values().next().value as string | undefined;
  if (firstQuoteId) {
    const existingQuote = [primary, ...supporting].find(
      (component) =>
        component.type === "quote_focus" &&
        component.quoteIds.includes(firstQuoteId),
    );
    supporting = existingQuote && existingQuote !== primary
      ? [existingQuote]
      : primary.type === "quote_focus"
        ? []
        : [{
            id: "verified-quote",
            type: "quote_focus",
            title: "In his words",
            body: "",
            items: [],
            options: [],
            artifactIds: [firstQuoteId.replace(/^quote:/, "")],
            quoteIds: [firstQuoteId],
          }];
  }

  const componentIds = new Set([primary.id, ...supporting.map((item) => item.id)]);
  const actions = Array.isArray(raw.actions)
    ? raw.actions.slice(0, 3).flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const action = entry as Record<string, unknown>;
        const intent = A2UI_INTENTS.includes(action.intent as A2UIIntent)
          ? (action.intent as A2UIIntent)
          : null;
        const label = clean(action.label, 70);
        const payload = clean(action.payload, 400);
        if (!intent || !label) return [];
        if (
          intent === "open_artifact" &&
          (!allowedArtifacts.has(payload) || !artifactPath(payload))
        ) return [];
        if (intent === "open_path" && !isSafeA2UIPath(payload)) return [];
        if (intent === "focus_component" && !componentIds.has(payload)) return [];
        return [{ label, intent, payload }];
      })
    : [];

  let title = clean(raw.title, 180) || fallback.title;
  let lead = clean(raw.lead, 560) || fallback.lead;
  if (/\bfavou?rite project\b/i.test(question)) {
    const primaryArtifactId =
      primary.artifactIds[0] ||
      primary.items.find((item) => item.artifactId)?.artifactId;
    const primaryArtifact = artifacts.find(
      (artifact) => artifact.id === primaryArtifactId,
    );
    if (primaryArtifact) {
      const label = artifactLabel(primaryArtifact);
      title = `Karthik's favorite project is ${label}`;
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const repeatedAnswer = new RegExp(
        `^Karthik['\u2019]s favorite project is ${escapedLabel}[,.]?\\s*`,
        "i",
      );
      const removeRepeatedAnswer = (value: string): string => {
        const stripped = value.replace(repeatedAnswer, "").trim();
        return stripped
          ? stripped.charAt(0).toUpperCase() + stripped.slice(1)
          : value;
      };
      lead = removeRepeatedAnswer(lead);
      primary.body = removeRepeatedAnswer(primary.body);
    }
  }

  primary = normalizeExpressiveComposition(primary);
  if (["timeline", "fold_timeline"].includes(primary.type)) primary.title = "";
  const initialDocumentCopy = `${title} ${lead}`;
  if (
    ["fold_timeline", "manifesto_fold", "topic_compass"].includes(primary.type)
  ) {
    supporting = supporting.filter(
      (component) => component.type !== "quote_focus",
    );
  }
  primary = normalizeStructuredClaimOwnership(primary, initialDocumentCopy);
  supporting = supporting.map((component) =>
    normalizeStructuredClaimOwnership(component, initialDocumentCopy),
  );
  lead = removeLeadRepeatedByPrimary(lead, primary);
  const documentCopy = `${title} ${lead}`;
  primary = removeDocumentOwnedItemClaims(primary, documentCopy);
  supporting = supporting.map((component) =>
    removeDocumentOwnedItemClaims(component, documentCopy),
  );

  return {
    version: "1.0",
    question: clean(raw.question, 500) || question,
    title,
    lead,
    compositionOptions: sanitizeCompositionOptions(raw.compositionOptions),
    primary,
    supporting,
    actions,
  };
}

function artifactLabel(artifact: A2UIArtifactLike): string {
  const data = artifact.data as Record<string, unknown>;
  for (const key of ["title", "company", "role"]) {
    if (typeof data[key] === "string" && data[key]) return data[key] as string;
  }
  return artifact.id.split(":").slice(1).join(":");
}

export function buildFallbackA2UI(
  question: string,
  reply: string,
  artifacts: A2UIArtifactLike[],
): A2UIDocument {
  const quoted = artifacts.filter((artifact) => artifact.annotation?.trim());
  const singleArtifact = artifacts.length === 1 ? artifacts[0] : null;
  const supporting: A2UIComponent[] = [];
  if (artifacts.length > 1) {
    supporting.push({
      id: "evidence",
      type: "artifact_focus",
      title: "Related work",
      body: "Select an item to see its original page.",
      items: artifacts.slice(0, 4).map((artifact) => ({
        label: artifactLabel(artifact),
        value: "",
        detail: "",
        artifactId: artifact.id,
        assetId: "",
      })),
      options: [],
      artifactIds: artifacts.slice(0, 4).map((artifact) => artifact.id),
      quoteIds: [],
    });
  }
  if (quoted.length > 0) {
    supporting.push({
      id: "quote",
      type: "quote_focus",
      title: "In his words",
      body: "",
      items: [],
      options: [],
      artifactIds: [quoted[0].id],
      quoteIds: [quoteIdForArtifact(quoted[0].id)],
    });
  }

  return {
    version: "1.0",
    question,
    title: question,
    lead: "",
    compositionOptions: ["stacked", "primary_top"],
    primary: singleArtifact
      ? {
          id: "answer",
          type: "artifact_focus",
          title: "",
          body: reply,
          items: [],
          options: [],
          artifactIds: [singleArtifact.id],
          quoteIds: [],
        }
      : {
          id: "answer",
          type: "narrative",
          title: "",
          body: reply,
          items: [],
          options: [],
          artifactIds: artifacts.slice(0, 3).map((artifact) => artifact.id),
          quoteIds: [],
        },
    supporting: supporting.slice(0, 2),
    actions: [],
  };
}

export function artifactPath(id: string): string | null {
  const [kind, ...rest] = id.split(":");
  const value = rest.join(":");
  if (!value) return null;
  if (kind === "project") return `/projects#${value}`;
  if (kind === "involvement") return `/involvement#${value}`;
  if (kind === "blog") return `/blog/${value}`;
  if (kind === "work") {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `/work#${slug}`;
  }
  return null;
}
