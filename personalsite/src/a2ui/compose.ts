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
): Promise<A2UIDocument> {
  const fallback = buildFallbackA2UI(question, reply, artifacts);
  if (!reply.trim()) return fallback;

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
  const timelineOrder = timelineEvidenceOrder(artifacts);

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      temperature: 0.2,
      max_completion_tokens: 1500,
      response_format: A2UI_RESPONSE_FORMAT,
      messages: [
        {
          role: "system",
          content: `You are the A2UI composer for Karthik's portfolio. Turn a grounded answer into one coherent, visual answer surface.

The UI must answer the visitor's question from scratch. It replaces the chat response, so all necessary explanation belongs inside the document.

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
- Before returning, compare the title, lead, every component body, and every item or option. Delete any sentence that repeats information shown elsewhere.
- If the title already names the institution, company, project, major, role, or result, do not create an item whose value merely names it again. Items must advance the answer with a different fact, method, reason, consequence, or constraint.
- Bad Purdue allocation: title says "Karthik studies Computer Science and Artificial Intelligence at Purdue," then items say "University: Purdue University" and "Majors: Computer Science and Artificial Intelligence."
- Good Purdue allocation: that title owns the institution and majors. Items add only new facts, such as how the two programs relate, his class year, a concentration, or what he is building through them.
- Bad allocation: the lead says Karthik attended TJHSST from 2020 to 2024 and earned two AP Physics 5s, then items repeat the school, dates, and scores.
- Good allocation: the title says "TJHSST shaped Karthik's STEM foundation." The lead is empty. Separate items own the full school name and location, the 2020 to 2024 dates, and the AP Physics results. The component body is empty. A score item uses value "5" and does not repeat "He earned a 5" in detail.
- Keep primary body copy under 90 words. Use at most four compact items for most components. A fold_timeline may use three to six stages when the extra stages materially improve the story. The full canvas should fit in one desktop viewport.
- Across the complete surface, a named-item answer is incomplete until it explains what the item is, why it matters to Karthik, and at least one concrete detail from ANSWER or EVIDENCE.
- For any single-project or single-role answer, the complete surface must answer all five questions when evidence permits: what is it; what did Karthik personally build or change; how does the mechanism work; why does it matter; what concrete result, user constraint, award, scale, or proof point supports it. Allocate those facts across the surface without repeating them.

WORK AND PROJECT ANSWERS
- A work or project answer must tell an explanatory story, not present a company name plus metrics.
- For career, journey, or "evolved over time" answers, research remains the through-line. Describe the shift from technical deep learning and domain-specific ML toward LLMs, agents, and tool infrastructure. Never frame it as leaving research, progressing beyond research, or moving from research into product. Product building and community work are parallel applications, not the endpoint.
- A career fold_timeline may use three to six stages. It must end on the newest work artifact in EVIDENCE, using its actual role and company. Never use an involvement, side project, blog post, or open-source tool as the final stage when a newer canonical work artifact exists. Side projects may appear only as parallel evidence inside an earlier stage.
- DATED WORK ORDER is derived from evidence, not a prewritten timeline. Use it to keep chronology honest while authoring the stage groupings yourself. Give the newest stage the strongest concrete contribution and result; do not compress it into a generic endpoint.
- Across the title, artifact_focus body, and three or four items, cover: the problem or goal, what Karthik personally built or changed, how it worked technically, and the result or real-world constraint.
- The artifact_focus body should be 35 to 55 words, end with a complete sentence, and synthesize the role or relationship between the workstreams. Do not use it to list item values.
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
  - topic_compass: the visitor asks what to explore, compare, or choose next and each option can lead to a useful follow-up
  - field_notebook: one project or role needs a nuanced working-note spread with a central explanation and three or four distinct annotations
  - system_blueprint: the visitor asks how a technical system works and three to six items can form modules, stages, safeguards, or data flows
  - evidence_stack: the answer rests on three or four different proof points, constraints, results, awards, or receipts that should feel accumulated rather than tabulated
  - essay_margin: a belief, blog post, or nuanced point of view has one central thesis and two to four margin annotations that qualify or ground it
  - specimen_board: the visitor asks to see several projects, papers, roles, or examples and each item should remain independently clickable and visually distinct
- Prefer the expressive types when the content genuinely fits. Do not use them as decoration.
- Treat these question shapes as strong routing signals:
  - "How does it work?", architecture, pipeline, mechanism, data flow, or technical implementation: when three or more connected modules or stages are supported, the primary component MUST be system_blueprint. paper_dossier and field_notebook are invalid for that question shape because they hide the system relationship.
  - "Why does it matter?", "why is it a favorite?", motivation, meaning, or personal significance: prefer field_notebook or evidence_stack when the answer combines a coherent explanation with distinct reasons or receipts.
  - A broad "tell me about this one thing" overview may use paper_dossier, field_notebook, or artifact_focus. Do not default to paper_dossier merely because there is one artifact.
  - "What did he personally build or change?": prefer field_notebook for a nuanced role or system_blueprint for connected technical contributions.
  - Evidence, proof, receipts, results, scale, awards, "what shows", or "how do we know": use evidence_stack when three or more distinct proof points are available, even when they belong to one artifact. Keep every relevant artifact inside the primary component instead of featuring the first artifact and relegating the rest to standalone actions.
  - "Show me several", examples, papers, projects, awards, or work samples: use specimen_board when three or more valid artifacts exist.
  - A nuanced opinion, essay, or blog argument: use essay_margin when a thesis plus two to four annotations fits; use manifesto_fold only when genuinely distinct selectable principles improve the answer.
- When a visitor asks consecutive questions about the same subject, a different question shape should produce a different component form. Never preserve the previous form out of visual consistency alone.
- A research_map item is one system stage. Use label for the stage name, value for its result or method, detail for one sentence of explanation, artifactId when it maps to evidence, and assetId when a listed visual asset directly matches.
- A fold_timeline item is one chronological stage. Keep the date or period in value, the stage name in label, and its distinct change in detail.
- A manifesto_fold or topic_compass uses options. Each option must advance a different principle or direction. Keep every option label to one to four short words; put all explanation in summary and detail.
- A paper_dossier requires a valid artifact reference and should use an asset only when it depicts that exact work.
- paper_dossier item details are visible without interaction. Use three or four facets that carry the explanation themselves, and leave the body empty when those facets already tell the complete story.
- paper_dossier is invalid for a blog post, essay, opinion, belief, or topic artifact. Those belong in essay_margin, manifesto_fold, narrative, or quote_focus.
- A field_notebook requires one valid artifact reference. Use its body for the coherent answer and its items for distinct working notes, decisions, mechanisms, or evidence.
- A system_blueprint uses items as modules or stages. Label names the module, value gives its visible function or result, detail explains the connection, and assetId is used only for a directly matching flat diagram.
- Every system_blueprint item must have a non-empty value and a concrete detail. Do not emit a stage name by itself. Together, the visible items must let a new visitor reconstruct the flow without opening anything.
- An evidence_stack uses items as independent proof slips. Each value must be meaningful without interaction.
- An essay_margin uses body for the thesis and items for genuinely different annotations, examples, limits, or implications. Use writing-marginalia only when the answer is actually about writing or a point of view.
- A specimen_board uses three to six items with valid artifactIds when the visitor asked for multiple concrete examples. It is not a generic list.
- Never use artifact_focus without at least one valid artifactId from EVIDENCE. Use narrative with items for structured facts that have no artifact reference.
- Never manufacture comparison options just to create interactivity. Never put unrelated metrics or concepts on a shared control.
- Avoid contrastive "not X, but Y" phrasing.
- Derived structures are allowed, but every fact must come from ANSWER or EVIDENCE. Preserve exact names, dates, numbers, links, and claims.
- quoteIds and artifactIds are opaque references. Use only IDs from EVIDENCE. Never write a quotation into body, items, or options.
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

EM DASH GATE
- Before returning JSON, scan every generated string: title, lead, component titles and bodies, item labels, values and details, option copy, and action labels.
- The output is invalid if any generated string contains Unicode U+2014.
- Rewrite each em-dash construction as two sentences, a comma, a colon, or a semicolon. Do not substitute another dash character.

Return only the schema-compliant A2UI document.`,
        },
        {
          role: "user",
          content: `QUESTION
${question}

ANSWER
${reply}

EVIDENCE
${evidenceDirectory}

DATED WORK ORDER
${timelineOrder}

VISUAL ASSETS
${visualAssetDirectory}`,
        },
      ],
    });
    const raw = result.choices[0]?.message?.content;
    if (!raw) return fallback;
    return sanitizeA2UIDocument(JSON.parse(raw), question, reply, artifacts);
  } catch (error) {
    console.error("A2UI composition failed:", error);
    return fallback;
  }
}
