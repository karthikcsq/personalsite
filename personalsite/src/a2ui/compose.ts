import type OpenAI from "openai";
import { a2uiVisualAssetPromptDirectory } from "@/a2ui/assetCatalog";
import {
  A2UI_RESPONSE_FORMAT,
  availableQuoteIds,
  buildFallbackA2UI,
  sanitizeA2UIDocument,
  type A2UIArtifactLike,
  type A2UIDocument,
} from "@/a2ui/protocol";
import {
  getModelRoutingConfig,
  toUsageRecord,
  type ModelUsageRecord,
} from "@/utils/modelRouting";
import {
  galleryCategoryPromptDirectory,
  loadGalleryCategoryDirectory,
} from "@/utils/galleryIndex";

const MODEL_CONFIG = getModelRoutingConfig();

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function asksAboutPersonalContribution(question: string): boolean {
  return /\b(?:what (?:does|did|has) (?:he|karthik) (?:do|build|built|change|changed|contribute|contributed|handle|lead|own)|what(?:'s| is) (?:his|karthik'?s) role|role at|responsib(?:le|ility|ilities)|personally (?:build|built|change|changed|contribute|contributed)|(?:build|built|change|changed|contribute|contributed) at)\b/i.test(
    question,
  );
}

function hasCompleteContributionSurface(document: A2UIDocument): boolean {
  const substantiveItems = document.primary.items.filter(
    (item) => item.value.trim() || item.detail.trim(),
  );
  return (
    ["field_notebook", "system_blueprint"].includes(document.primary.type) &&
    substantiveItems.length >= 2 &&
    substantiveItems.length <= 3 &&
    substantiveItems.every((item) => item.value.trim()) &&
    substantiveItems.every((item) => wordCount(item.detail) <= 16)
  );
}

function asksForNamedOverview(question: string): boolean {
  return /^(?:what(?:'s| is)|tell me about|explain|show me)\b/i.test(
    question.trim(),
  );
}

function hasCompleteNamedArtifactSurface(document: A2UIDocument): boolean {
  const substantiveItems = document.primary.items.filter(
    (item) => item.value.trim() || item.detail.trim(),
  );
  return (
    [
      "artifact_focus",
      "paper_dossier",
      "field_notebook",
      "research_map",
      "system_blueprint",
      "evidence_stack",
    ].includes(document.primary.type) &&
    substantiveItems.length >= 2 &&
    substantiveItems.length <= 3 &&
    substantiveItems.every((item) => item.value.trim()) &&
    substantiveItems.every((item) => wordCount(item.detail) <= 16)
  );
}

function asksAboutGallery(question: string, categoryNames: string[]): boolean {
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

function hasAnswerBearingPrimary(document: A2UIDocument): boolean {
  const substantiveItems = document.primary.items.filter(
    (item) => wordCount(`${item.value} ${item.detail}`) >= 3 || item.assetId,
  );
  const substantiveOptions = document.primary.options.filter(
    (option) => wordCount(`${option.summary} ${option.detail}`) >= 4,
  );
  const minimumItems = 1;

  return (
    wordCount(document.title) >= 3 &&
    (wordCount(document.primary.body) >= 8 ||
      substantiveItems.length >= minimumItems ||
      substantiveOptions.length >= 2)
  );
}

function hasCompleteGallerySurface(document: A2UIDocument): boolean {
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

function componentArtifactReferences(document: A2UIDocument): Set<string> {
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

function hasSourceAccess(
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

function withGuaranteedSourceAccess(
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

function artifactLabel(artifact: A2UIArtifactLike): string {
  const data = artifact.data as Record<string, unknown>;
  for (const key of ["title", "company", "role"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return artifact.id;
}

function artifactDetails(artifact: A2UIArtifactLike): string {
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

function artifactDateRank(artifact: A2UIArtifactLike): number {
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
    return Number(latest[2]) * 12 + (months[latest[1].slice(0, 3).toLowerCase()] ?? 0);
  }
  const years = [...range.matchAll(/\b(20\d{2})\b/g)];
  return Number(years.at(-1)?.[1] ?? 0) * 12;
}

function timelineEvidenceOrder(artifacts: A2UIArtifactLike[]): string {
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

export async function composeA2UI(
  openai: OpenAI,
  question: string,
  reply: string,
  artifacts: A2UIArtifactLike[],
  onUsage?: (record: ModelUsageRecord) => void,
): Promise<A2UIDocument> {
  const fallback = buildFallbackA2UI(question, reply, artifacts);
  if (!reply.trim()) return fallback;

  let galleryCategories: Awaited<
    ReturnType<typeof loadGalleryCategoryDirectory>
  > = [];
  try {
    galleryCategories = await loadGalleryCategoryDirectory();
  } catch (error) {
    console.error("Gallery category context unavailable:", error);
  }

  const quotes = availableQuoteIds(artifacts);
  const evidenceDirectory = artifacts.length
    ? artifacts
        .map((artifact) => {
          const quoteId = `quote:${artifact.id}`;
          return [
            `- artifactId: ${artifact.id}`,
            `  label: ${artifactLabel(artifact)}`,
            `  details: ${artifactDetails(artifact)}`,
            quotes.has(quoteId) ? `  verifiedQuoteId: ${quoteId}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n")
    : "(none)";
  const visualAssetDirectory = a2uiVisualAssetPromptDirectory();
  const galleryCategoryDirectory =
    galleryCategoryPromptDirectory(galleryCategories);
  const galleryCategoryNames = galleryCategories.map(
    (category) => category.name,
  );
  const galleryQuestion = asksAboutGallery(question, galleryCategoryNames);
  const timelineOrder = timelineEvidenceOrder(artifacts);
  const contributionQuestion = asksAboutPersonalContribution(question);
  const namedArtifactOverview =
    !contributionQuestion &&
    artifacts.length === 1 &&
    asksForNamedOverview(question);
  const questionShapeDirective = contributionQuestion
    ? `QUESTION-SHAPE OVERRIDE
- This asks what Karthik personally does, built, changed, or owns within one role or organization.
- The primary component MUST be field_notebook for a nuanced operating role, or system_blueprint when three or more connected technical modules are central.
- artifact_focus, paper_dossier, narrative, and a generic source sheet are invalid primary choices.
- Use two or three substantive items. Four items are invalid for this focused role question.
- Every item needs a visible value. Detail is optional and should appear only when it adds a distinct constraint, mechanism, or consequence.
- Allocate the story across the primary: one item owns his role or operating responsibility, one owns what he built or changed, and an optional third owns the result or real-world effect.
- Prefer the exact nouns, systems, features, decisions, and audiences named in ANSWER or EVIDENCE. Generic phrases such as "internal platform," "technical work," or "community leadership" are invalid when the source names what the platform manages, what he built, or whom he recruited.
- The document lead may contain at most one short orienting sentence. It must not carry the facts that belong in the primary.
- A source link or verified quote may support the answer, but neither may replace the explanation.`
    : namedArtifactOverview
      ? `QUESTION-SHAPE OVERRIDE
- This asks for a complete overview of one named artifact.
- The primary component MUST be artifact_focus, paper_dossier, field_notebook, research_map, or system_blueprint.
- A plain narrative, empty source sheet, or navigation-only artifact card is invalid.
- Use two or three substantive items that explain what it is, how it works, and the strongest result, constraint, award, or reason it matters. Four items are invalid for this focused overview. A concise body may own one of those facts.
- Keep the document lead empty or to one short orienting sentence. The primary paper owns the explanation.
- The verified quote may support the primary, but it cannot replace the explanation.`
    : "";

  try {
    const systemPrompt = `You are the A2UI composer for Karthik's portfolio. Turn a grounded answer into one coherent, visual answer surface.

${questionShapeDirective}

The UI must answer the visitor's question from scratch. It replaces the chat response, so all necessary explanation belongs inside the document.

ANSWER AND EVIDENCE CONTRACT
- ANSWER is an internal factual brief, not display copy. Decompose it into the title, primary body, items, and options. Do not paste its opening paragraph into the lead or component body.
- EVIDENCE and GALLERY CATEGORIES are authoritative. If ANSWER says details or photos are unavailable while either directory contains a matching record, ignore that refusal and build the supported answer.
- Never render a refusal, apology, retrieval caveat, or invitation to look elsewhere when the supplied evidence can answer the question.
- Award placements are wins. For questions that use "won" or "wins", frame every qualifying result as a win, including second place, then preserve its exact placement from ANSWER or EVIDENCE.

COMPOSITION RULES
- Use one primary component as the visual center. Add at most two supporting components.
- Return two or three compatible document compositions in compositionOptions. The host rotates between them across turns, so every option must remain legible for this exact content:
  - stacked: a full-width primary followed by supporting material
  - split_primary_left: the primary occupies the wider left side and supporting material sits on the right
  - split_primary_right: supporting material leads on the left and the wider primary sits on the right
  - primary_top: the primary spans the page and supporting material forms a strip below
- Order compositionOptions from strongest to weakest. Composition is semantic, not tied to an artifact name. A verified quote may lead on the left, sit on the right, or appear below depending on the story. Do not always put quotes on the right.
- Do not map a project, company, or topic to one recurring component type. Let the visitor's question determine the information shape. Related questions about the same project should naturally use different forms when one asks why it matters, another asks how it works, and another asks for evidence or technical detail.
- Write a direct, literal title that answers the question. An artifact name alone is not an answer. For "Show me his favorite project," use "Karthik's favorite project is Repple," not "Repple."
- Do not invent decorative eyebrows, kickers, folios, or generic section headings such as "Field notes," "System cutaway," "Evidence assembled," or "A considered position." A component title must carry subject-specific information or be empty.
- Treat the title, lead, component body, items, options, and supporting components as one answer, not separate summaries of the same answer.
- Give every specific fact one owner. A date, number, result, technical mechanism, or explanatory claim may appear in exactly one place on the surface. A paraphrase of the same fact still counts as repetition.
- Reusing the central project, company, or topic name for orientation is allowed. Do not remove the explanatory story just to avoid repeating its subject.
- The title owns the takeaway-level answer, not a compressed list of all supporting facts. Keep it to one short sentence. Do not put dates, metrics, lists, or evidence details in the title when components can show them.
- The lead owns only context needed to understand the components. Component bodies own only connective explanation. Items and options own their specific facts.
- For narrative components with items, keep the component body empty. For artifact_focus, the body must explain the work as a coherent whole while items carry distinct methods, constraints, and results. If the title and primary make the answer clear, keep the lead to one short sentence or leave it empty.
- Inside an item, label names the dimension, value presents the exact fact, and detail adds different context or significance. Never turn the value into a sentence in detail. Leave detail empty when there is nothing new to add.
- A label-only item is invalid. Every item must contain a visible value, a useful detail, or a directly relevant asset. Delete empty placeholders instead of preserving a symmetrical layout.
- The title plus visible item values must answer the question in a five-second scan. Supporting details may deepen that answer, but they must never carry the only explanation of an item.
- Default to one to three primary items. Use four only for an explicitly broad comparison, a four-part process, or four distinct examples. Never use four for a focused overview or to complete a symmetrical layout.
- Keep item labels to three words when possible, values to seven words, and visible details to fourteen words. Keep the title under twelve words and the lead under eighteen words.
- Keep the initial visible answer between 45 and 80 words for a focused question. Broader career or comparison questions may use more only when each stage advances the story.
- Do not print raw dependency or technology inventories unless the visitor explicitly asks for the stack. Summarize them by function and let the source or a follow-up carry the full list.
- The host may render one item set through several compatible forms, such as a process map, blueprint, or sequence. Write every item so its label, value, and detail remain understandable in each form.
- Keep chronology and causal order explicit in timeline, fold_timeline, steps, research_map, and system_blueprint items. For unordered evidence or specimen sets, make each item self-contained because the host may change which item receives visual emphasis.
- Before returning, compare the title, lead, every component body, and every item or option. Delete any sentence that repeats information shown elsewhere.
- If the title already names the institution, company, project, major, role, or result, do not create an item whose value merely names it again. Items must advance the answer with a different fact, method, reason, consequence, or constraint.
- Bad Purdue allocation: title says "Karthik studies Computer Science and Artificial Intelligence at Purdue," then items say "University: Purdue University" and "Majors: Computer Science and Artificial Intelligence."
- Good Purdue allocation: that title owns the institution and majors. Items add only new facts, such as how the two programs relate, his class year, a concentration, or what he is building through them.
- Bad allocation: the lead says Karthik attended TJHSST from 2020 to 2024 and earned two AP Physics 5s, then items repeat the school, dates, and scores.
- Good allocation: the title says "TJHSST shaped Karthik's STEM foundation." The lead is empty. Separate items own the full school name and location, the 2020 to 2024 dates, and the AP Physics results. The component body is empty. A score item uses value "5" and does not repeat "He earned a 5" in detail.
- Keep primary body copy under 55 words. Use at most three compact items for most components. A fourth item must earn its place with a distinct fact. A fold_timeline may use three to six stages when the extra stages materially improve the story. The full canvas should fit in one desktop viewport.
- Across the complete surface, a named-item answer is incomplete until it explains what the item is, why it matters to Karthik, and at least one concrete detail from ANSWER or EVIDENCE.
- For a single-project or single-role overview, prioritize what it is, what Karthik personally built or changed, and the strongest mechanism or proof point. Add why it matters when the visitor asks for significance or preference. Allocate those facts without repetition.
- The primary must carry the answer itself. A source link, asset, quote, or document title never counts as the primary explanation.

WORK AND PROJECT ANSWERS
- A work or project answer must tell an explanatory story, not present a company name plus metrics.
- For career, journey, or "evolved over time" answers, research remains the through-line. Earlier stages cover technical deep learning and domain-specific ML. Recent stages cover LLMs, agents, and tool infrastructure. Product building and community work are parallel applications. Do not claim that he left research or that product work replaced it.
- A career fold_timeline may use three to six stages. It must end on the newest work artifact in EVIDENCE, using its actual role and company. Never use an involvement, side project, blog post, or open-source tool as the final stage when a newer canonical work artifact exists. Side projects may appear only as parallel evidence inside an earlier stage.
- DATED WORK ORDER is derived from evidence, not a prewritten timeline. Use it to keep chronology honest while authoring the stage groupings yourself. Give the newest stage the strongest concrete contribution and result; do not compress it into a generic endpoint.
- Across the title, artifact_focus body, and two or three items, cover the question's necessary facts: the problem or goal, what Karthik personally built or changed, and the strongest mechanism, result, or real-world constraint.
- The artifact_focus body should be 25 to 40 words, end with a complete sentence, and synthesize the role or relationship between the workstreams. Do not use it to list item values.
- At least half of the items must describe methods, architecture, decisions, or constraints. Metrics may support the story but cannot be the whole story.
- Each item value must be understandable before interaction because it is always visible. Put optional secondary context in detail.
- Bad NRL answer: "Karthik built ML for underwater acoustics and RAG" followed only by "20% more accurate" and "65% faster."
- Good NRL allocation: the body explains that his first ML research role joined two constrained systems problems. Separate items own the sound-speed-profile image representation and 20% accuracy gain, the image-to-image replacement of physics simulators, the local LangChain/vector/chunking/LLaMA 2 retrieval stack with no external APIs, and the 65% query-time reduction.

NON-REDUNDANCY REQUIREMENTS
- These are hard output constraints, not style preferences.
- Keep the title under 14 words. Unless the visitor explicitly asks for a date, score, or number, put dates, scores, metrics, and lists in components instead of the title.
- When primary.items is non-empty and primary.type is narrative, primary.body must be empty.
- When the title plus primary items answer the question, lead must be empty.
- Do not repeat one item's value in its detail or in another item. Prefer an empty detail.
- Do not add a supporting narrative that merely says more information exists elsewhere. Supporting components must contribute distinct evidence, a verified quote, or a different useful structure.
- Run a final claim audit. For each date, number, technical mechanism, and factual clause, keep its most useful occurrence and remove every other occurrence.
- Choose the primary type that best explains the answer:
  - narrative: a concise explanation with optional supporting points
  - metric_grid: exact results or quantities
  - timeline: ordered changes over time
  - comparison: genuinely comparable choices, approaches, or positions
  - artifact_focus: one or more concrete projects, roles, posts, or groups with an exact artifactId from EVIDENCE
  - quote_focus: a verified quote is the clearest center of the answer
  - steps: an actual sequence or process
  - paper_dossier: one concrete project or role deserves a formal single-artifact profile with three or four facets
  - research_map: one technical effort has two to four causal stages, methods, or results that form a connected system
  - fold_timeline: three to six chronological stages explain how Karthik's work or thinking changed
  - manifesto_fold: two to four distinct principles or lenses explain a belief, judgment, or point of view
  - field_notebook: one project or role needs a nuanced working-note spread with a central explanation and three or four distinct annotations
  - system_blueprint: the visitor asks how a technical system works and three to six items can form modules, stages, safeguards, or data flows
  - evidence_stack: the answer rests on three or four different proof points, constraints, results, awards, or receipts that should feel accumulated rather than tabulated
  - essay_margin: a belief, blog post, or nuanced point of view has one central thesis and two to four margin annotations that qualify or ground it
  - specimen_board: the visitor asks to see several projects, papers, roles, or examples and each item should remain independently clickable and visually distinct
  - visual_mosaic: a photography, gallery, travel, or place-based answer is best told through two to five image-backed items from listed gallery categories
- Prefer the expressive types when the content genuinely fits. Do not use them as decoration.
- Treat these question shapes as strong routing signals:
  - "How does it work?", architecture, pipeline, mechanism, data flow, or technical implementation: when three or more connected modules or stages are supported, the primary component MUST be system_blueprint. paper_dossier and field_notebook are invalid for that question shape because they hide the system relationship.
  - "Why does it matter?", "why is it a favorite?", motivation, meaning, or personal significance: prefer field_notebook or evidence_stack when the answer combines a coherent explanation with distinct reasons or receipts.
  - A broad "tell me about this one thing" overview may use paper_dossier, field_notebook, or artifact_focus. Do not default to paper_dossier merely because there is one artifact.
  - "What did he personally build or change?": prefer field_notebook for a nuanced role or system_blueprint for connected technical contributions.
  - Evidence, proof, receipts, results, scale, awards, "what shows", or "how do we know": use evidence_stack when three or more distinct proof points are available, even when they belong to one artifact. Keep every relevant artifact inside the primary component instead of featuring the first artifact and relegating the rest to standalone actions.
  - "Show me several", examples, papers, projects, awards, or work samples: use specimen_board when three or more valid artifacts exist.
  - Gallery, photography, travel, or "where has he been" questions: use visual_mosaic when ANSWER or EVIDENCE names at least two available gallery categories. Each item represents one category and uses that category's gallery asset ID.
  - A nuanced opinion, essay, or blog argument: use essay_margin when a thesis plus two to four annotations fits; use manifesto_fold only when genuinely distinct selectable principles improve the answer.
- When a visitor asks consecutive questions about the same subject, a different question shape should produce a different component form. Never preserve the previous form out of visual consistency alone.
- A research_map item is one system stage. Use label for the stage name, value for its result or method, detail for one sentence of explanation, artifactId when it maps to evidence, and assetId when a listed visual asset directly matches.
- A fold_timeline item is one chronological stage. Keep the date or period in value, the stage name in label, and its distinct change in detail.
- A manifesto_fold uses options. Each option must advance a different principle or direction. Keep every option label to one to four short words; put all explanation in summary and detail.
- topic_compass is retired. Never emit it. Use manifesto_fold for distinct selectable lenses, comparison for genuinely comparable positions, or essay_margin for a qualitative point of view.
- A paper_dossier requires a valid artifact reference and should use an asset only when it depicts that exact work.
- paper_dossier item details are visible without interaction. Use three or four facets that carry the explanation themselves, and leave the body empty when those facets already tell the complete story.
- paper_dossier is invalid for a blog post, essay, opinion, belief, or topic artifact. Those belong in essay_margin, manifesto_fold, narrative, or quote_focus.
- A field_notebook requires one valid artifact reference. Use its body for the coherent answer and its items for distinct working notes, decisions, mechanisms, or evidence.
- A system_blueprint uses items as modules or stages. Label names the module, value gives its visible function or result, detail explains the connection, and assetId is used only for a directly matching flat diagram.
- Every system_blueprint item must have a non-empty value and a concrete detail. Do not emit a stage name by itself. Together, the visible items must let a new visitor reconstruct the flow without opening anything.
- An evidence_stack uses items as independent proof slips. Each value must be meaningful without interaction.
- An essay_margin uses body for the thesis and items for genuinely different annotations, examples, limits, or implications. Use writing-marginalia only when the answer is actually about writing or a point of view.
- A specimen_board uses three to six items representing multiple distinct concrete examples or artifacts. Never use it for several facets, features, or technical details of one project.
- In a specimen_board, assign a listed visual asset only when it directly depicts that exact item. Prefer project-specific assets such as veritas-verification, caladrius-triage, and formulator-motion over a generic hackathon asset. Use no asset when there is no exact match. Never reuse one asset across several specimens.
- A visual_mosaic uses the exact dynamic category asset IDs listed in GALLERY CATEGORIES. The host selects a seeded photograph from that category, so the model must never invent or emit an image URL.
- Use each gallery category at most once. When one category is the subject, use one item whose label, value, and detail carry the supported collection facts. The photograph and facts should form one component.
- Gallery category assets are supporting visuals, not factual evidence. Use one only when the visitor's question, ANSWER, or EVIDENCE explicitly names that place or asks about Karthik's photography or travel. Never place gallery photography in a technical, project, work, or opinion answer merely for decoration.
- For a gallery answer, include one open_path action to /gallery. The collection remains useful before the visitor opens that page.
- Never use artifact_focus without at least one valid artifactId from EVIDENCE. Use narrative with items for structured facts that have no artifact reference.
- Never manufacture comparison options just to create interactivity. Never put unrelated metrics or concepts on a shared control.
- Never use contrastive parallelism. This includes "not X, but Y," "less about X, more about Y," "not just X," "X rather than Y," and "from X to Y" thesis frames. State the intended claim directly in one positive sentence.
- Derived structures are allowed, but every fact must come from ANSWER or EVIDENCE. Preserve exact names, dates, numbers, links, and claims.
- quoteIds and artifactIds are opaque references. Use only IDs from EVIDENCE. Never write a quotation into body, items, or options.
- When several items cite the same artifact, put that ID once in the component artifactIds array and leave the repeated item artifactId fields empty. One component should expose one visible source action for one destination.
- Empty fields and arrays are fine when a component does not need them.
- Items use label for the dimension, value for the concise always-visible fact, method, date, number, or result, detail for optional secondary explanation, and artifactId only when the item maps to a listed artifact.
- For artifact_focus, use items to surface distinct facts such as what it does, why he chose it, the technology, or a result. Do not repeat the artifact title inside a nested card.
- assetId is optional content expressed as an empty string when unused. Use only an exact asset ID from VISUAL ASSETS. Never invent an asset ID. Never select an asset merely because its colors fit.
- Comparison options may be interactive. Each option needs a label, a one-line summary, and a useful detail.
- Actions are optional. Available intents:
  - ask_prompt: payload is a useful follow-up question about Karthik
  - open_artifact: payload is an exact listed artifactId
  - open_path: payload is an internal portfolio path
  - focus_component: payload is a component id in this document
  - copy_answer: payload is empty
- Never mention a portfolio page as plain text when asking the visitor to read or view it. Link it in Markdown, for example "[About page](/about)", or provide an open_path action.
- Allowed internal destinations are /about, /work, /projects, /involvement, /blog, and /gallery, including anchors or query strings on those paths.
- Use relative internal paths for portfolio links, never the full karthikthyagarajan.com URL.
- Represent each navigation destination once. Use either an inline Markdown link or an open_path action, never both.
- A supporting component whose only purpose is navigation must contain an inline Markdown link and must not have a separate open_path action. The host renders that component itself as the clickable control.
- Reserve a standalone open_path action for navigation that is not already represented by a component.
- "You can read more on his About page" without a link is invalid.
- Do not create navigation actions when the component itself already opens the relevant artifact.
- Every answer supported by an artifact must expose that artifact exactly once, either through the component's artifactIds, one item's artifactId, one verified quote, or one open_artifact action.
- Never add an open_artifact action for an artifact already referenced by a component or item.

EM DASH GATE
- Before returning JSON, scan every generated string: title, lead, component titles and bodies, item labels, values and details, option copy, and action labels.
- The output is invalid if any generated string contains Unicode U+2014.
- Rewrite each em-dash construction as two sentences, a comma, a colon, or a semicolon. Do not substitute another dash character.

Return only the schema-compliant A2UI document.`;
    const userPrompt = `QUESTION
${question}

ANSWER
${reply}

EVIDENCE
${evidenceDirectory}

DATED WORK ORDER
${timelineOrder}

VISUAL ASSETS
${visualAssetDirectory}

GALLERY CATEGORIES
${galleryCategoryDirectory}`;
    const result = await openai.chat.completions.create({
      model: MODEL_CONFIG.a2uiModel,
      reasoning_effort: MODEL_CONFIG.a2uiReasoningEffort,
      service_tier: "default",
      max_completion_tokens: 1500,
      response_format: A2UI_RESPONSE_FORMAT,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });
    const composeUsage = toUsageRecord(
      "a2ui_compose",
      MODEL_CONFIG.a2uiModel,
      result.usage,
    );
    if (composeUsage) onUsage?.(composeUsage);
    const raw = result.choices[0]?.message?.content;
    if (!raw) return fallback;
    const document = sanitizeA2UIDocument(
      JSON.parse(raw),
      question,
      reply,
      artifacts,
      galleryCategoryNames,
    );
    const sourcedDocument = withGuaranteedSourceAccess(
      document,
      artifacts,
      galleryQuestion,
    );
    const contributionIncomplete =
      contributionQuestion && !hasCompleteContributionSurface(sourcedDocument);
    const overviewIncomplete =
      namedArtifactOverview &&
      !hasCompleteNamedArtifactSurface(sourcedDocument);
    const answerIncomplete = !hasAnswerBearingPrimary(sourcedDocument);
    const galleryIncomplete =
      galleryQuestion && !hasCompleteGallerySurface(sourcedDocument);
    const sourceIncomplete = !hasSourceAccess(
      sourcedDocument,
      artifacts,
      galleryQuestion,
    );
    if (
      !contributionIncomplete &&
      !overviewIncomplete &&
      !answerIncomplete &&
      !galleryIncomplete &&
      !sourceIncomplete
    ) {
      return sourcedDocument;
    }

    try {
      const repairInstructions = [
        contributionIncomplete
          ? `- Use field_notebook or system_blueprint as the primary.
- Include two or three items with concise, self-contained values. Detail is optional.
- Four items are invalid. Keep every detail under sixteen words.
- Move the concrete role, operating decisions, technical work, and strongest effect into those items.`
          : "",
        overviewIncomplete
          ? `- Use artifact_focus, paper_dossier, field_notebook, research_map, or system_blueprint as the primary.
- Include two or three substantive items covering what it is, how it works, and its strongest result, constraint, award, or significance.
- Four items are invalid. Keep every detail under sixteen words.
- Put the explanation inside the primary paper instead of an empty source card.`
          : "",
        answerIncomplete
          ? `- Make the primary answer-bearing. Add a concise connective body or at least one substantive item whose visible value explains the answer.`
          : "",
        galleryIncomplete
          ? `- Use visual_mosaic with one item per relevant listed category. Give every item a visible fact and its exact gallery category asset ID.`
          : "",
        sourceIncomplete
          ? `- Expose each supporting artifact once. For gallery answers, add one open_path action to /gallery.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      const repair = await openai.chat.completions.create({
        model: MODEL_CONFIG.a2uiModel,
        reasoning_effort: MODEL_CONFIG.a2uiReasoningEffort,
        service_tier: "default",
        max_completion_tokens: 1500,
        response_format: A2UI_RESPONSE_FORMAT,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "assistant", content: raw },
          {
            role: "user",
            content: `REPAIR REQUIRED
The proposed primary does not completely answer the visitor's question. Rewrite the document.
${repairInstructions}
- Keep the lead to one short sentence or leave it empty.
- Do not create a generic source card as the primary.
- Do not repeat claims across the lead, body, and items.`,
          },
        ],
      });
      const repairUsage = toUsageRecord(
        "a2ui_repair",
        MODEL_CONFIG.a2uiModel,
        repair.usage,
      );
      if (repairUsage) onUsage?.(repairUsage);
      const repairedRaw = repair.choices[0]?.message?.content;
      if (!repairedRaw) return sourcedDocument;
      const repaired = sanitizeA2UIDocument(
        JSON.parse(repairedRaw),
        question,
        reply,
        artifacts,
        galleryCategoryNames,
      );
      const sourcedRepair = withGuaranteedSourceAccess(
        repaired,
        artifacts,
        galleryQuestion,
      );
      const repairedContributionComplete =
        !contributionQuestion || hasCompleteContributionSurface(repaired);
      const repairedOverviewComplete =
        !namedArtifactOverview ||
        hasCompleteNamedArtifactSurface(sourcedRepair);
      const repairedAnswerComplete = hasAnswerBearingPrimary(sourcedRepair);
      const repairedGalleryComplete =
        !galleryQuestion || hasCompleteGallerySurface(sourcedRepair);
      const repairedSourceComplete = hasSourceAccess(
        sourcedRepair,
        artifacts,
        galleryQuestion,
      );
      return repairedContributionComplete &&
        repairedOverviewComplete &&
        repairedAnswerComplete &&
        repairedGalleryComplete &&
        repairedSourceComplete
        ? sourcedRepair
        : sourcedDocument;
    } catch (repairError) {
      console.error("A2UI contribution repair failed:", repairError);
      return sourcedDocument;
    }
  } catch (error) {
    console.error("A2UI composition failed:", error);
    return fallback;
  }
}
