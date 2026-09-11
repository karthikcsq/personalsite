import type { A2UIArtifactLike, A2UIDocument } from "./protocol";

// Surface-quality predicates shared by the one-call generator
// (`generate.ts`, the live path) and the cached-reply composer
// (`compose.ts`). Both need the same definition of "this document actually
// answers the question" and the same guarantee that every supplied source is
// reachable, so the rules live here instead of being duplicated.

export function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function artifactLabel(artifact: A2UIArtifactLike): string {
  const data = artifact.data as Record<string, unknown>;
  for (const key of ["title", "company", "role"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return artifact.id;
}

export function artifactDetails(artifact: A2UIArtifactLike): string {
  const data = artifact.data as Record<string, unknown>;
  const allowed = [
    "title",
    "role",
    "company",
    "year",
    "date",
    "tools",
    "description",
    "excerpt",
    "tagline",
    "bullets",
  ];
  const details: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = data[key];
    if (
      typeof value === "string" ||
      (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    ) {
      details[key] = value;
    }
  }
  return JSON.stringify(details).slice(0, 2200);
}

export function asksAboutGallery(
  question: string,
  categoryNames: string[],
): boolean {
  const normalizedQuestion = question.toLocaleLowerCase();
  return (
    /\b(?:gallery|galleries|photo|photograph|photography|travel|trip|visited|visit|place|places)\b/i.test(
      question,
    ) ||
    categoryNames.some((name) =>
      normalizedQuestion.includes(name.toLocaleLowerCase()),
    )
  );
}

export function hasAnswerBearingPrimary(document: A2UIDocument): boolean {
  const substantiveItems = document.primary.items.filter(
    (item) => wordCount(`${item.value} ${item.detail}`) >= 3 || item.assetId,
  );
  const substantiveOptions = document.primary.options.filter(
    (option) => wordCount(`${option.summary} ${option.detail}`) >= 4,
  );

  return (
    wordCount(document.title) >= 3 &&
    (wordCount(document.primary.body) >= 8 ||
      substantiveItems.length >= 1 ||
      substantiveOptions.length >= 2)
  );
}

export function hasCompleteGallerySurface(document: A2UIDocument): boolean {
  return (
    document.primary.type === "visual_mosaic" &&
    document.primary.items.length >= 1 &&
    document.primary.items.every(
      (item) =>
        item.assetId.startsWith("gallery:") &&
        Boolean(item.value.trim() || item.detail.trim()),
    )
  );
}

export function componentArtifactReferences(
  document: A2UIDocument,
): Set<string> {
  const references = new Set<string>();
  for (const component of [document.primary, ...document.supporting]) {
    for (const artifactId of component.artifactIds) references.add(artifactId);
    for (const item of component.items) {
      if (item.artifactId) references.add(item.artifactId);
    }
    for (const quoteId of component.quoteIds) {
      if (quoteId.startsWith("quote:")) references.add(quoteId.slice(6));
    }
  }
  return references;
}

export function hasSourceAccess(
  document: A2UIDocument,
  artifacts: A2UIArtifactLike[],
  galleryQuestion: boolean,
): boolean {
  const referencedArtifacts = componentArtifactReferences(document);
  const hasArtifactAction = document.actions.some(
    (action) =>
      action.intent === "open_artifact" &&
      artifacts.some((artifact) => artifact.id === action.payload),
  );
  const artifactAccess =
    artifacts.length === 0 ||
    hasArtifactAction ||
    artifacts.some((artifact) => referencedArtifacts.has(artifact.id));
  const galleryAccess =
    !galleryQuestion ||
    document.actions.some(
      (action) =>
        action.intent === "open_path" && action.payload.startsWith("/gallery"),
    ) ||
    JSON.stringify(document).includes("](/gallery");
  return artifactAccess && galleryAccess;
}

export function withGuaranteedSourceAccess(
  document: A2UIDocument,
  artifacts: A2UIArtifactLike[],
  galleryQuestion: boolean,
): A2UIDocument {
  const referencedArtifacts = componentArtifactReferences(document);
  const seenActions = new Set<string>();
  const actions = document.actions.filter((action) => {
    const key = `${action.intent}:${action.payload}`;
    if (seenActions.has(key)) return false;
    seenActions.add(key);
    return !(
      action.intent === "open_artifact" &&
      referencedArtifacts.has(action.payload)
    );
  });

  const hasArtifactSource =
    artifacts.length === 0 ||
    artifacts.some((artifact) => referencedArtifacts.has(artifact.id)) ||
    actions.some(
      (action) =>
        action.intent === "open_artifact" &&
        artifacts.some((artifact) => artifact.id === action.payload),
    );
  if (!hasArtifactSource) {
    const artifact = artifacts[0];
    if (artifact) {
      if (actions.length >= 3) actions.pop();
      actions.push({
        label: `See ${artifactLabel(artifact)}`,
        intent: "open_artifact",
        payload: artifact.id,
      });
    }
  }

  const hasGallerySource =
    !galleryQuestion ||
    actions.some(
      (action) =>
        action.intent === "open_path" && action.payload.startsWith("/gallery"),
    ) ||
    JSON.stringify(document).includes("](/gallery");
  if (!hasGallerySource) {
    if (actions.length >= 3) actions.pop();
    actions.push({
      label: "See gallery",
      intent: "open_path",
      payload: "/gallery",
    });
  }

  return { ...document, actions };
}

export function artifactDateRank(artifact: A2UIArtifactLike): number {
  const data = artifact.data as Record<string, unknown>;
  const range = String(data.year ?? data.date ?? "");
  if (/\bpresent\b/i.test(range)) return Number.MAX_SAFE_INTEGER;
  const months: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const dates = [
    ...range.matchAll(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/gi,
    ),
  ];
  const latest = dates.at(-1);
  if (latest) {
    return (
      Number(latest[2]) * 12 + (months[latest[1].slice(0, 3).toLowerCase()] ?? 0)
    );
  }
  const years = [...range.matchAll(/\b(20\d{2})\b/g)];
  return Number(years.at(-1)?.[1] ?? 0) * 12;
}

export function timelineEvidenceOrder(artifacts: A2UIArtifactLike[]): string {
  const work = artifacts
    .filter((artifact) => artifact.id.startsWith("work:"))
    .sort((left, right) => artifactDateRank(left) - artifactDateRank(right));
  if (work.length === 0) return "(no dated work artifacts)";
  return [
    ...work.map((artifact) => {
      const data = artifact.data as Record<string, unknown>;
      return `- ${artifact.id}: ${String(data.year ?? data.date ?? "date unknown")}`;
    }),
    `- newest work artifact (feature as the final and most prominent stage): ${work.at(-1)?.id}`,
  ].join("\n");
}
