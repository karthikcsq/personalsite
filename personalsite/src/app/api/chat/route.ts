import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import bm25Model from "@/data/bm25-model.json";
import { getJobsFromYaml } from "@/utils/jobUtils";
import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { resolveTopic } from "@/utils/topicsUtils";
import { projects as projectsCatalog } from "@/data/projectsData";
import { getCorpusForArtifact } from "@/utils/quotesUtils";
import {
  formatImpactRanking,
  getImpactFocus,
  getImpactRanking,
} from "@/utils/impactUtils";
import { checkChatRateLimit, getClientIdentifier } from "@/utils/rateLimit";
import { generateA2UI, type A2UIGenerationSource } from "@/a2ui/generate";
import { artifactDateRank } from "@/a2ui/surface";
import {
  formatCanonicalWorkContext,
  selectCanonicalJobsForQuery,
} from "@/utils/workContext";
import {
  GEMINI_OPENAI_BASE_URL,
  getModelRoutingConfig,
  shouldRunHydeAfterBaseline,
  shouldStartHydeBeforeBaseline,
  summarizeUsage,
  toUsageRecord,
  type ModelUsageRecord,
} from "@/utils/modelRouting";
import {
  getRewriteCache,
  getSuggestedReplyCache,
  setRewriteCache,
  setSuggestedReplyCache,
} from "@/utils/chatCache";
// Cache keys are contract-versioned in chatCache so prompt and retrieval
// changes cannot replay an answer authored under an older evidence policy.
import { isHostSuggestedQuestion } from "@/data/chatSuggestions";
import {
  galleryCategoryPromptDirectory,
  loadGalleryCategoryDirectory,
} from "@/utils/galleryIndex";
import {
  findLocalEvidence,
  formatLocalEvidenceContext,
} from "@/utils/localEvidence";

const MODEL_CONFIG = getModelRoutingConfig();

type RetrievalMatchLike = {
  metadata?: Record<string, unknown>;
};

const RETRIEVAL_QUERY_STOP_WORDS = new Set([
  "about",
  "build",
  "built",
  "does",
  "from",
  "have",
  "karthik",
  "project",
  "projects",
  "research",
  "show",
  "tell",
  "that",
  "their",
  "there",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "work",
]);

function meaningfulQueryTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLocaleLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter(
          (term) =>
            term.length >= 3 && !RETRIEVAL_QUERY_STOP_WORDS.has(term),
        ) ?? [],
    ),
  ];
}

function searchableMatchText(match: RetrievalMatchLike): string {
  const metadata = match.metadata ?? {};
  return [
    metadata.text,
    metadata.title,
    metadata.company,
    metadata.project_title,
    metadata.file_path,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function sparseResultsLookMisaligned(
  query: string,
  matches: RetrievalMatchLike[],
): boolean {
  const terms = meaningfulQueryTerms(query);
  if (terms.length === 0 || matches.length === 0) return false;

  const inspected = matches.slice(0, 8);
  const aligned = inspected.filter((match) => {
    const text = searchableMatchText(match);
    return terms.some((term) => text.includes(term));
  }).length;

  return aligned === 0;
}

function relevanceThresholdForMode(
  retrievalMode: "hybrid" | "dense",
): number {
  return retrievalMode === "dense" ? 0.35 : 0.45;
}

function canonicalEntryRelevance(
  query: string,
  entry: { id: string; label: string },
): number {
  const terms = meaningfulQueryTerms(query);
  if (terms.length === 0) return 0;
  const haystack = `${entry.id} ${entry.label}`.toLocaleLowerCase();
  return terms.reduce(
    (score, term) => score + (haystack.includes(term) ? 1 : 0),
    0,
  );
}

// Type for chat messages
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Artifact payload sent to client for dynamic component rendering.
// `annotation` is the short opinionated pull-quote the extractor writes
// explaining the artifact's role in THIS reply. Optional — cards render fine
// without one.
type Artifact = { annotation?: string } & (
  | {
      kind: "work";
      id: string;
      data: {
        role: string;
        company: string;
        year: string;
        description: string[];
        icon: string;
      };
    }
  | {
      kind: "project";
      id: string;
      data: {
        title: string;
        tools: string;
        date: string;
        link?: string;
        description: string;
        links?: Array<{
          label: string;
          url: string;
          type:
            | "github"
            | "devpost"
            | "website"
            | "npm"
            | "appstore"
            | "linkedin"
            | "arxiv"
            | "pdf"
            | "youtube"
            | "instagram";
        }>;
      };
    }
  | {
      kind: "blog";
      id: string;
      data: {
        title: string;
        slug: string;
        excerpt: string;
      };
    }
  | {
      kind: "involvement";
      id: string;
      data: {
        title: string;
        role: string;
        date: string;
        slug: string;
        tagline: string;
        bullets: string[];
        links?: Array<{
          label: string;
          url: string;
          type:
            | "github"
            | "devpost"
            | "website"
            | "npm"
            | "appstore"
            | "linkedin"
            | "arxiv"
            | "pdf"
            | "youtube"
            | "instagram";
        }>;
      };
    }
  | {
      kind: "note";
      id: string;
      data: {
        slug: string;
        title: string;
        tagline: string;
      };
    }
);

interface PineconeMatch {
  id?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

// Hydrate a directory artifact ID ("work:<company>", "project:<slug>",
// "blog:<slug>") into a full Artifact, using the local source-of-truth data
// (YAML for work, projects.json for projects, and Pinecone metadata for blog
// excerpts). `annotation` is the opinionated pull-quote written by the
// citation extractor — stapled onto the hydrated artifact. Returns null if
// the ID doesn't resolve.
function hydrateArtifactById(
  id: string,
  retrievedBlogs: Map<string, { title: string; text: string; summary: string }>,
  annotation?: string,
): Artifact | null {
  const note = annotation && annotation.trim().length > 0 ? annotation.trim() : undefined;
  if (id.startsWith("work:")) {
    const company = id.slice(5);
    const job = getJobsFromYaml().find(
      (j) => j.company.toLowerCase() === company.toLowerCase(),
    );
    if (!job) return null;
    return {
      kind: "work",
      id,
      annotation: note,
      data: {
        role: job.title,
        company: job.company,
        year: job.year,
        description: job.description,
        icon: job.icon,
      },
    };
  }
  if (id.startsWith("project:")) {
    const slug = id.slice(8);
    const project = projectsCatalog.find(
      (p) => p.id.toLowerCase() === slug.toLowerCase()
        || p.title.toLowerCase() === slug.toLowerCase(),
    );
    if (!project) return null;
    // Derive an extra link from display.embedUrl (YouTube/Instagram embeds)
    // so the artifact surfaces video/post links the projects page only renders
    // as inline embeds. Convert /embed/ URLs to the canonical watch/post URL.
    const derivedLinks: typeof project.links = [...project.links];
    const embedUrl = project.display.embedUrl;
    if (embedUrl) {
      let url = embedUrl;
      let type: (typeof project.links)[number]["type"] = "website";
      const ytMatch = embedUrl.match(/youtube\.com\/embed\/([^/?]+)/i)
        || embedUrl.match(/youtu\.be\/embed\/([^/?]+)/i);
      const igMatch = embedUrl.match(/instagram\.com\/(p|reel)\/([^/?]+)/i);
      if (ytMatch) {
        url = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
        type = "youtube";
      } else if (igMatch) {
        url = `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/`;
        type = "instagram";
      }
      if (!derivedLinks.some((l) => l.url === url)) {
        derivedLinks.push({ label: type, url, type });
      }
    }
    // The card's primary link points at the project's dedicated section on
    // the /projects page (where description + all external links are surfaced),
    // not the external URL directly. Lets visitors see the richer context.
    return {
      kind: "project",
      id: `project:${project.id}`,
      annotation: note,
      data: {
        title: project.title,
        tools: project.tools,
        date: project.date,
        link: `/projects#${project.id}`,
        description: project.description || "",
        links: derivedLinks,
      },
    };
  }
  if (id.startsWith("blog:")) {
    const slug = id.slice(5);
    const entry = retrievedBlogs.get(slug);
    if (!entry) return null;
    // Prefer the post's frontmatter summary — it's a deliberate human-written
    // pitch. Fall back to chunk text with the "Blog Post: ... Summary: <text>"
    // preamble (added by the indexer in create-pinecone.py) stripped, so the
    // card never shows raw metadata.
    let excerpt = (entry.summary || "").trim();
    if (!excerpt) {
      const stripped = (entry.text || "")
        .replace(/^\s*Blog Post:[^\n]*\n(?:Date:[^\n]*\n)?(?:Summary:[^\n]*\n)?/i, "")
        .trim();
      excerpt = stripped.slice(0, 220).replace(/\s+/g, " ").trim();
    }
    return {
      kind: "blog",
      id,
      annotation: note,
      data: { title: entry.title, slug, excerpt },
    };
  }
  if (id.startsWith("topic:")) {
    const slug = id.slice("topic:".length);
    if (!slug) return null;
    const topic = resolveTopic(slug);
    return {
      kind: "note",
      id,
      annotation: note,
      data: { slug: topic.slug, title: topic.title, tagline: topic.tagline },
    };
  }
  if (id.startsWith("involvement:")) {
    const slug = id.slice("involvement:".length);
    const inv = getInvolvementsFromYaml().find((i) => i.slug === slug);
    if (!inv) return null;
    return {
      kind: "involvement",
      id,
      annotation: note,
      data: {
        title: inv.title,
        role: inv.role,
        date: inv.date,
        slug: inv.slug,
        tagline: inv.tagline,
        bullets: inv.bullets,
        links: inv.links,
      },
    };
  }
  return null;
}

// Estimate token count (rough approximation: 1 token ≈ 4 characters)
// Multi-query HyDE: generate three complementary hypothetical retrieval
// passages in one nano-model call. On a weak baseline, each expansion is
// embedded and queried in parallel, then merged by document id.
async function buildHydeQueries(
  llm: OpenAI,
  currentQuery: string,
  conversationHistory?: ChatMessage[],
  onUsage?: (record: ModelUsageRecord) => void,
  onCacheHit?: () => void,
): Promise<string[]> {
  const cacheable = !conversationHistory || conversationHistory.length <= 1;
  if (cacheable) {
    const cached = await getRewriteCache(currentQuery);
    if (cached) {
      onCacheHit?.();
      return cached;
    }
  }
  const recentContext = conversationHistory
    ?.slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join("\n") || "";

  const response = await llm.chat.completions.create({
    model: MODEL_CONFIG.rewriteModel,
    // Gemini accepts "minimal"; the OpenAI SDK's types predate it.
    reasoning_effort: MODEL_CONFIG.rewriteReasoningEffort as OpenAI.ReasoningEffort,
    service_tier: "default",
    temperature: 0,
    max_completion_tokens: 220,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "retrieval_rewrites",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["queries"],
          properties: {
            queries: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: { type: "string" },
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `You generate three complementary hypothetical answers to a question about Karthik Thyagarajan. They are used only as retrieval queries against a portfolio vector store and are never shown to the user.

Rules:
- Return exactly three queries as schema-compliant JSON.
- Query 1 emphasizes likely roles, organizations, named work, and chronological evidence.
- Query 2 emphasizes technical mechanisms, architectures, methods, and implementation vocabulary.
- Query 3 emphasizes outcomes, themes, beliefs, constraints, and adjacent evidence that may answer the broader intent.
- Each query is one or two confident plain-prose declarative sentences. No question marks, hedging, or "I think".
- Make the three queries meaningfully different. Do not produce paraphrases.
- Resolve pronouns ("that", "his latest") using recent conversation context.
- When the question uses general or category-level wording, name specific entities, places, projects, or activities you can plausibly infer about Karthik. Bridging vocabulary from general to specific is the entire point.
- Do NOT invent specific facts you'd be embarrassed to be wrong about — exact dates, company names you've never heard of, named partners. If unsure, stay topical but vague ("Karthik has worked on several research projects").
- Output only the JSON object required by the schema.`
      },
      {
        role: "user",
        content: recentContext
          ? `Conversation so far:\n${recentContext}\n\nLatest question: "${currentQuery}"\n\nWrite three complementary retrieval queries.`
          : `Question: "${currentQuery}"\n\nWrite three complementary retrieval queries.`
      }
    ],
  });
  const usage = toUsageRecord(
    "retrieval_rewrite",
    MODEL_CONFIG.rewriteModel,
    response.usage,
  );
  if (usage) onUsage?.(usage);

  const raw = response.choices[0]?.message?.content;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { queries?: unknown };
    const queries = Array.isArray(parsed.queries)
      ? parsed.queries
          .filter((query): query is string => typeof query === "string")
          .map((query) => query.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];
    if (cacheable && queries.length === 3) {
      await setRewriteCache(currentQuery, queries);
    }
    return queries;
  } catch {
    return [];
  }
}

// === BM25 SPARSE ENCODER (mirrors python-rag/bm25.py tokenization) ===
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in",
  "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the",
  "their", "then", "there", "these", "they", "this", "to", "was", "will", "with",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her",
  "its", "them", "what", "which", "who", "whom", "how", "when", "where", "why",
  "do", "does", "did", "has", "have", "had", "am", "been", "being", "would",
  "could", "should", "can", "may", "might", "shall", "about", "from", "up",
  "out", "so", "than", "too", "very", "just", "also", "more", "some", "any",
  "all", "each", "every", "both", "few", "own", "other", "over", "under",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

interface BM25Model {
  vocab: Record<string, number>;
  idf: Record<string, number>;
}

function encodeSparseQuery(text: string): { indices: number[]; values: number[] } {
  const model = bm25Model as BM25Model;
  const tokens = tokenize(text);
  const seen = new Set<string>();
  const indices: number[] = [];
  const values: number[] = [];

  for (const token of tokens) {
    if (seen.has(token) || !(token in model.vocab)) continue;
    seen.add(token);
    const idx = model.vocab[token];
    const idf = model.idf[String(idx)];
    if (idf && idf > 0) {
      indices.push(idx);
      values.push(idf);
    }
  }

  return { indices, values };
}

export const maxDuration = 60;

type ChatRateLimitResult = Awaited<ReturnType<typeof checkChatRateLimit>>;

function chatStreamHeaders(rl: ChatRateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };
  if (rl.scope !== "disabled") {
    headers["X-RateLimit-Limit"] = String(rl.limit);
    headers["X-RateLimit-Remaining"] = String(rl.remaining);
    headers["X-RateLimit-Reset"] = String(rl.reset);
  }
  return headers;
}

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  try {
    const clientId = getClientIdentifier(req);
    const benchmarkKey = process.env.CHAT_BENCHMARK_KEY?.trim();
    const benchmarkAuthorized =
      Boolean(benchmarkKey) &&
      req.headers.get("x-chat-benchmark-key") === benchmarkKey;
    const rl: ChatRateLimitResult = benchmarkAuthorized
      ? {
          success: true,
          limit: 0,
          remaining: 0,
          reset: 0,
          scope: "disabled",
        }
      : await checkChatRateLimit(clientId);
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      const window = rl.scope === "minute" ? "a minute" : "an hour";
      return NextResponse.json(
        {
          error: `You're sending messages too quickly. Please try again in ${window}.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.reset),
          },
        },
      );
    }

    const body = await req.json();
    const { message, messages: conversationHistory } = body;

    if (!message && (!conversationHistory || conversationHistory.length === 0)) {
      return NextResponse.json(
        { error: "Message or conversation history is required" },
        { status: 400 }
      );
    }

    // Embeddings stay on OpenAI because the Pinecone index was built with
    // them. Every generation call goes to Gemini.
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    // The SDK falls back to OPENAI_API_KEY when apiKey is undefined, which
    // would send the OpenAI key to Google. Fail loudly instead.
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not set");
    const gemini = new OpenAI({
      apiKey: geminiApiKey,
      baseURL: GEMINI_OPENAI_BASE_URL,
    });

    const currentQuery = message || conversationHistory[conversationHistory.length - 1].content;
    const hostSuggestedQuestion = isHostSuggestedQuestion(currentQuery);
    const routingConversationHistory = hostSuggestedQuestion
      ? undefined
      : conversationHistory;
    const usageRecords: ModelUsageRecord[] = [];
    const recordUsage = (record: ModelUsageRecord) => {
      usageRecords.push(record);
    };
    const cachedSuggestedReply = hostSuggestedQuestion
      ? await getSuggestedReplyCache(currentQuery)
      : null;
    if (cachedSuggestedReply) {
      const cachedArtifacts = cachedSuggestedReply.artifacts as Artifact[];
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const emit = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            const tA2UIStart = Date.now();
            const result = await generateA2UI({
              llm: gemini,
              question: currentQuery,
              context: cachedSuggestedReply.reply,
              sources: cachedArtifacts.map(artifact => ({
                id: artifact.id,
                label: artifact.id,
                corpus: getCorpusForArtifact(artifact.id).slice(0, 3500),
              })),
              galleryCategories: await loadGalleryCategoryDirectory().catch(() => []),
              datedWorkOrder: "Use the dates in the cached context.",
              impactRanking: formatImpactRanking(
                getImpactRanking(),
                new Set(cachedArtifacts.map((artifact) => artifact.id)),
                getImpactFocus(),
              ),
              hydrate: (id, annotation) => {
                const artifact = cachedArtifacts.find(candidate => candidate.id === id);
                return artifact ? { ...artifact, annotation } : null;
              },
              onUsage: recordUsage,
              onPartial: (a2ui, artifacts) => {
                if (artifacts.length) emit({ artifacts });
                emit({ a2ui, a2uiStreaming: true });
              },
            });
            if (result.artifacts.length) emit({ artifacts: result.artifacts });
            emit({ content: result.historyText });
            const a2ui = result.document;
            const a2uiMs = Date.now() - tA2UIStart;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ a2ui })}\n\n`),
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  telemetry: {
                    cache: {
                      suggestedReply: "hit",
                      rewrites: "skipped",
                    },
                    routing: {
                      answerRoute: "cached",
                      answerModel: "cache",
                      a2uiModel: MODEL_CONFIG.a2uiModel,
                    },
                    usage: usageRecords,
                    usageSummary: summarizeUsage(usageRecords),
                  },
                  timings: {
                    rewriter: 0,
                    retrieval: 0,
                    ttft: 0,
                    stream: 0,
                    postStream: 0,
                    a2ui: a2uiMs,
                    total: Date.now() - requestStart,
                  },
                })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
      return new Response(readableStream, {
        headers: chatStreamHeaders(rl),
      });
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    const allJobs = getJobsFromYaml();
    const canonicalJobs = selectCanonicalJobsForQuery(currentQuery, allJobs);
    const canonicalWorkContext = formatCanonicalWorkContext(canonicalJobs);

    // Step 1: adaptive multi-query HyDE. Strong baseline queries skip the
    // rewrite call. Weak queries still get all three complementary rewrites.
    // OPENAI_HYDE_MODE=speculative restores the lower-latency, higher-cost
    // parallel path, while OPENAI_HYDE_MODE=off disables rewrites.
    let tHydeStart = 0;
    let hydePromise: Promise<string[]> | null = null;
    let rewriteCacheHit = false;
    if (shouldStartHydeBeforeBaseline({ config: MODEL_CONFIG })) {
      tHydeStart = Date.now();
      hydePromise = buildHydeQueries(
        gemini,
        currentQuery,
        routingConversationHistory,
        recordUsage,
        () => {
          rewriteCacheHit = true;
        },
      );
    }

    console.log(`🔍 Original: "${currentQuery}"`);

    const tRetrievalStart = Date.now();
    const baselineEmbResp = await openai.embeddings.create({
      model: MODEL_CONFIG.embeddingModel,
      input: currentQuery,
    });
    const baselineEmbeddingUsage = toUsageRecord(
      "baseline_embedding",
      MODEL_CONFIG.embeddingModel,
      baselineEmbResp.usage,
    );
    if (baselineEmbeddingUsage) recordUsage(baselineEmbeddingUsage);
    const baselineEmbedding = baselineEmbResp.data[0].embedding;
    const baselineSparse = encodeSparseQuery(currentQuery);
    let retrievalMode: "hybrid" | "dense" = "hybrid";
    let baselineResponse = await index.query({
      vector: baselineEmbedding,
      sparseVector: baselineSparse.indices.length > 0 ? baselineSparse : undefined,
      topK: 30,
      includeMetadata: true,
    });
    if (
      baselineSparse.indices.length > 0 &&
      sparseResultsLookMisaligned(currentQuery, baselineResponse.matches)
    ) {
      console.warn(
        "Sparse retrieval results look misaligned with their metadata; retrying with dense retrieval",
      );
      retrievalMode = "dense";
      baselineResponse = await index.query({
        vector: baselineEmbedding,
        topK: 30,
        includeMetadata: true,
      });
    }
    const baselineMs = Date.now() - tRetrievalStart;
    console.log(`⏱️  Baseline retrieval: ${baselineMs}ms (${baselineResponse.matches.length} matches)`);
    if (baselineResponse.matches.length > 0) {
      console.log(`   Top score: ${baselineResponse.matches[0].score?.toFixed(3)}`);
    }

    // Decide whether the baseline result is "strong enough" to skip HyDE.
    // Trigger is count-based, not top-score-based: hybrid scores aren't bounded
    // to [0,1] (sparse contributions can push them into the tens), so an
    // absolute score cutoff is hard to calibrate. A weak query like
    // "does he play an instrument?" typically returns very few matches above
    // the 0.45 threshold; a specific query returns many.
    const HYDE_BYPASS_MIN_MATCHES = 3;
    const relevanceThreshold = relevanceThresholdForMode(retrievalMode);
    const baselineRelevantCount = baselineResponse.matches.filter(
      (m) => m.score && m.score > relevanceThreshold,
    ).length;
    const baselineStrong = baselineRelevantCount >= HYDE_BYPASS_MIN_MATCHES;

    let queryResponse = baselineResponse;
    let hydeWaitMs = 0;
    let retrievalMs = baselineMs;

    if (baselineStrong) {
      console.log(`⚡ Baseline strong (${baselineRelevantCount} ≥ ${HYDE_BYPASS_MIN_MATCHES}), HyDE discarded`);
      // Avoid unhandled rejection on the speculative call.
      hydePromise?.catch(() => {});
    } else if (
      shouldRunHydeAfterBaseline({
        config: MODEL_CONFIG,
        baselineStrong,
      })
    ) {
      console.log(`⚠️  Baseline weak (${baselineRelevantCount} < ${HYDE_BYPASS_MIN_MATCHES}), awaiting HyDE`);
      let hypotheticalQueries: string[] = [];
      try {
        if (!hydePromise) {
          tHydeStart = Date.now();
          hydePromise = buildHydeQueries(
            gemini,
            currentQuery,
            routingConversationHistory,
            recordUsage,
            () => {
              rewriteCacheHit = true;
            },
          );
        }
        hypotheticalQueries = await hydePromise;
      } catch (err) {
        console.log(`⚠️  HyDE call failed: ${err}`);
      }
      hydeWaitMs = Date.now() - tHydeStart;
      console.log(
        `💭 HyDE (${hydeWaitMs}ms, ${hypotheticalQueries.length} rewrites): ${JSON.stringify(hypotheticalQueries)}`,
      );

      if (hypotheticalQueries.length > 0) {
        const expandedQueries = hypotheticalQueries.map(
          (hypothetical) => `${currentQuery}\n${hypothetical}`,
        );
        const tExpStart = Date.now();
        const expEmbResp = await openai.embeddings.create({
          model: MODEL_CONFIG.embeddingModel,
          input: expandedQueries,
        });
        const expandedEmbeddingUsage = toUsageRecord(
          "expanded_embedding",
          MODEL_CONFIG.embeddingModel,
          expEmbResp.usage,
        );
        if (expandedEmbeddingUsage) recordUsage(expandedEmbeddingUsage);
        const expResponses = await Promise.all(
          expandedQueries.map((expandedQuery, indexInBatch) => {
            const expSparse = encodeSparseQuery(expandedQuery);
            return index.query({
              vector: expEmbResp.data[indexInBatch].embedding,
              sparseVector:
                retrievalMode === "hybrid" && expSparse.indices.length > 0
                  ? expSparse
                  : undefined,
              topK: 30,
              includeMetadata: true,
            });
          }),
        );
        const expMs = Date.now() - tExpStart;
        retrievalMs += expMs;
        console.log(
          `⏱️  HyDE retrievals: ${expMs}ms (${expResponses
            .map((response) => response.matches.length)
            .join(", ")} matches)`,
        );

        // Merge: dedupe by id, keep max score, sort descending.
        type Match = (typeof baselineResponse.matches)[number];
        const byId = new Map<string, Match>();
        const expandedMatches = expResponses.flatMap(
          (response) => response.matches,
        );
        for (const m of [...baselineResponse.matches, ...expandedMatches]) {
          const existing = byId.get(m.id);
          if (!existing || (m.score || 0) > (existing.score || 0)) {
            byId.set(m.id, m);
          }
        }
        queryResponse = {
          ...baselineResponse,
          matches: Array.from(byId.values()).sort(
            (a, b) => (b.score || 0) - (a.score || 0),
          ),
        };
        console.log(`🔀 Merged: ${queryResponse.matches.length} unique matches`);
      }
    }

    console.log(`📊 Final pool: ${queryResponse.matches.length} matches`);
    if (queryResponse.matches.length > 0) {
      console.log(`   Top score: ${queryResponse.matches[0].score?.toFixed(3)}`);
      console.log(`   Content types: ${[...new Set(queryResponse.matches.map(m => m.metadata?.content_type))].join(', ')}`);
    }

    // Step 4: Filter by relevance threshold and cap the candidate pool.
    // The pool doubles as (a) the context the LLM sees and (b) the set of
    // sources it can cite — so we keep it bounded.
    const MAX_CANDIDATES = baselineStrong ? 12 : 18;
    const relevantMatches = queryResponse.matches
      .filter((match) => match.score && match.score > relevanceThreshold)
      .slice(0, MAX_CANDIDATES);

    console.log(`✅ ${relevantMatches.length} matches passed threshold (${relevanceThreshold})`);

    // Build the LLM context: each surviving match formatted with a short
    // label so the reader (and the main model) can see where facts come from.
    // Citations are resolved post-hoc against an artifact directory, not from
    // these tags, so the labels here are just for the main model's benefit.
    // Opinion (topic-keyed corpus) chunks are split out and PROMOTED to the
    // top of the context with a prominent header. The model treats every
    // chunk equally otherwise, which causes it to average a sharp first-
    // person take with five project descriptions and produce a smoothed
    // summary. Surfacing the take separately tells the model: this is what
    // the visitor actually asked about, the rest is supporting evidence.
    const formatChunk = (
      match: (typeof relevantMatches)[number],
      idx: number,
    ): string => {
      const meta = match.metadata || {};
      const kind = (meta.content_type as string) || (meta.source_type as string) || "unknown";
      const labelBits: string[] = [`[#${idx + 1}] kind=${kind}`];
      if (meta.title) labelBits.push(`title="${meta.title}"`);
      else if (meta.company) labelBits.push(`company="${meta.company}"`);
      else if (meta.project_title) labelBits.push(`title="${meta.project_title}"`);
      if (kind === "blog_post" && meta.slug) labelBits.push(`slug="${meta.slug}"`);
      const text = (meta.text as string) || "";
      return `${labelBits.join(" ")}\n${text}`;
    };
    const opinionMatches = relevantMatches.filter(
      (m) => m.metadata?.content_type === "opinion",
    );
    const staleAggregateSources = new Set([
      "faq.txt",
      "summary.txt",
      "personal_narrative.txt",
    ]);
    const otherMatches = relevantMatches.filter(
      (m) => {
        if (m.metadata?.content_type === "opinion") return false;
        if (!canonicalWorkContext) return true;
        const filePath = String(m.metadata?.file_path || "")
          .replaceAll("\\", "/")
          .toLowerCase();
        const fileName = filePath.split("/").at(-1) || "";
        return !staleAggregateSources.has(fileName);
      },
    );

    // For each topic that landed in retrieval (any chunk, any sub-topic),
    // load the FULL corpus file via getCorpusForArtifact. Retrieval-level
    // chunking causes lower-scoring sub-topics (anecdotes, asides) to fall
    // below threshold even when the topic itself is clearly relevant —
    // meaning the reply only sees the thesis chunks while the picker sees
    // everything. Loading the whole file closes that asymmetry: any take
    // Karthik puts in the corpus is guaranteed to be visible to the reply.
    //
    // CRITICAL: scan `queryResponse.matches` (all 30 raw matches), NOT
    // `relevantMatches` (filtered to score > 0.45 and top-12). Topic chunks
    // often score in the 0.35-0.45 band — high enough to be a clear signal
    // that the topic is relevant, but below the threshold that gates the
    // LLM context. The artifact directory uses all 30 matches (which is
    // why the Note card surfaces), so the take must follow the same source
    // — otherwise the card emits but the reply has no take to lead with.
    const topicSlugsInRetrieval = new Set<string>();
    for (const m of queryResponse.matches) {
      if (m.metadata?.content_type !== "opinion") continue;
      const ids = m.metadata?.applies_to_ids;
      const primary = Array.isArray(ids) && typeof ids[0] === "string" ? (ids[0] as string) : "";
      if (primary.startsWith("topic:")) {
        topicSlugsInRetrieval.add(primary.slice("topic:".length));
      }
    }
    const fullTopicCorpora: Array<{ slug: string; body: string }> = [];
    for (const slug of topicSlugsInRetrieval) {
      const body = getCorpusForArtifact(`topic:${slug}`);
      if (body && body.trim().length > 0) {
        fullTopicCorpora.push({ slug, body: body.trim() });
      }
    }

    const sections: string[] = [];
    if (canonicalWorkContext) {
      sections.push(canonicalWorkContext);
    }
    if (fullTopicCorpora.length > 0) {
      const parts = fullTopicCorpora.map(
        (t) => `[topic:${t.slug}] (Karthik's full prose on this topic, every sub-topic he's written)\n${t.body}`,
      );
      sections.push(
        `=== KARTHIK'S OWN TAKE (his first-person prose on the topic the visitor asked about. Preserve his framing, his vocabulary, his anecdotes, his sharpness. Do not smooth into generic AI-summary voice. The visitor sees a verbatim quote pulled from below rendered next to your reply, so your reply must read as the same voice. Lead with the stance, not the projects. Cover his anecdotes and examples, not just his theses.) ===\n${parts.join("\n\n---\n\n")}`,
      );
    } else if (opinionMatches.length > 0) {
      // Fallback: opinion chunks landed but none were tagged with a topic id
      // (e.g., legacy opinion content). Surface them as-is.
      const opinionParts = opinionMatches.map((m, i) => formatChunk(m, i));
      sections.push(
        `=== KARTHIK'S OWN TAKE (preserve his framing, his vocabulary, his sharpness. Do not smooth into generic AI-summary voice. Lead with the stance.) ===\n${opinionParts.join("\n\n---\n\n")}`,
      );
    }
    if (otherMatches.length > 0) {
      const offset = fullTopicCorpora.length > 0 ? fullTopicCorpora.length : opinionMatches.length;
      const otherParts = otherMatches.map((m, i) => formatChunk(m, offset + i));
      sections.push(
        `=== SUPPORTING EVIDENCE (projects, work, involvement, blog posts. Proof points and examples to back the take above.) ===\n${otherParts.join("\n\n---\n\n")}`,
      );
    }
    let contexts = sections.join("\n\n");
    const localEvidenceContext = formatLocalEvidenceContext(
      findLocalEvidence(currentQuery),
    );
    if (localEvidenceContext) {
      contexts = [localEvidenceContext, contexts].filter(Boolean).join("\n\n");
    }

    console.log(`🎨 Candidate pool: ${relevantMatches.length} chunks`);

    // Build the artifact directory — this is what the citation extractor sees
    // after the reply finishes. Every entry maps 1:1 to a hydratable card.
    //
    //   work:<Company>
    //   project:<Title>
    //   blog:<slug>
    //
    // Work and project lists come from the source-of-truth YAML. Blog entries
    // are filtered to just the posts that showed up in retrieval (otherwise
    // the extractor sees all blogs and over-matches).
    const allProjects = projectsCatalog;
    const allInvolvements = getInvolvementsFromYaml();
    // An involvement can also appear in the resume YAML under projects:.
    // Those chunks should still feed retrieval, but any resulting artifact
    // should be the richer involvement card, not a bare project card.
    const involvementTitleToSlug = new Map<string, string>();
    for (const inv of allInvolvements) {
      involvementTitleToSlug.set(inv.title.toLowerCase(), inv.slug);
    }
    const retrievedBlogs = new Map<string, { title: string; text: string; summary: string }>();
    for (const m of queryResponse.matches) {
      if (m.metadata?.content_type !== "blog_post") continue;
      const slug = m.metadata?.slug as string | undefined;
      const title = m.metadata?.title as string | undefined;
      const text = (m.metadata?.text as string | undefined) || "";
      const summary = (m.metadata?.summary as string | undefined) || "";
      if (!slug || !title) continue;
      if (!retrievedBlogs.has(slug)) retrievedBlogs.set(slug, { title, text, summary });
    }

    // Topic-keyed corpus chunks (content_type=opinion) feed a separate
    // directory bucket. Each retrieved topic becomes a "note" artifact —
    // a quote-only tile in the receipts panel. Slug comes from the first
    // applies_to_ids entry (e.g. "topic:agents" → "agents"). Topics not in
    // the registry still surface; resolveTopic() falls back to "On <slug>".
    const retrievedTopics = new Map<string, { title: string; tagline: string; text: string }>();
    for (const m of queryResponse.matches) {
      if (m.metadata?.content_type !== "opinion") continue;
      const ids = m.metadata?.applies_to_ids;
      const primary = Array.isArray(ids) && typeof ids[0] === "string" ? (ids[0] as string) : "";
      if (!primary.startsWith("topic:")) continue;
      const slug = primary.slice("topic:".length);
      if (!slug || retrievedTopics.has(slug)) continue;
      const text = (m.metadata?.text as string | undefined) || "";
      const topic = resolveTopic(slug);
      retrievedTopics.set(slug, { title: topic.title, tagline: topic.tagline, text });
    }

    // Compress a long string to a single-line blurb of ~`max` chars so the
    // extractor gets a short semantic fingerprint of each artifact without
    // paying for the full prose. Cuts at a word boundary where possible.
    const blurb = (raw: string | undefined, max = 180): string => {
      if (!raw) return "";
      const flat = raw.replace(/\s+/g, " ").trim();
      if (flat.length <= max) return flat;
      const sliced = flat.slice(0, max);
      const lastSpace = sliced.lastIndexOf(" ");
      return (lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced) + "…";
    };

    // Authoritative card IDs and source summaries for the unified generator.
    const rawEntries: Array<{ id: string; label: string }> = [
      ...allJobs.map((j) => ({
        id: `work:${j.company}`,
        label: `${j.title} at ${j.company} (${j.year}) — ${blurb(
          (j.description || []).join(" "),
          160,
        )}`,
      })),
      ...allProjects.map((p) => ({
        id: `project:${p.id}`,
        label: `${p.title}${p.tools ? ` [${p.tools}]` : ""}${p.date ? ` (${p.date})` : ""} — ${blurb(p.description, 200)}`,
      })),
      ...allInvolvements.map((inv) => ({
        id: `involvement:${inv.slug}`,
        label: `${inv.title} (${inv.role}, ${inv.date}) — ${blurb(
          `${inv.tagline} ${inv.whatItIs} ${inv.myRole}`,
          220,
        )}`,
      })),
      ...[...retrievedBlogs.entries()].map(([slug, { title, text, summary }]) => {
        const stripped = text
          .replace(/^\s*Blog Post:[^\n]*\n(?:Date:[^\n]*\n)?(?:Summary:[^\n]*\n)?/i, "")
          .trim();
        const body = summary ? `${summary} — ${stripped}` : stripped;
        return {
          id: `blog:${slug}`,
          label: `"${title}" — ${blurb(body, 500)}`,
        };
      }),
      ...[...retrievedTopics.entries()].map(([slug, { title, tagline, text }]) => ({
        id: `topic:${slug}`,
        label: `[Karthik's take on "${slug}"] ${title}${tagline ? ` (${tagline})` : ""} — ${blurb(text, 200)}`,
      })),
    ];
    const canonicalMatches = rawEntries
      .map((entry) => ({
        entry,
        relevance: canonicalEntryRelevance(currentQuery, entry),
      }))
      .filter(({ relevance }) => relevance > 0)
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, 4)
      .map(({ entry }) => `- ${entry.id}: ${entry.label}`);
    if (canonicalMatches.length > 0) {
      contexts = [
        contexts,
        `=== MATCHING CANONICAL PORTFOLIO RECORDS ===
These records are authoritative and may supply details missed by vector retrieval.
${canonicalMatches.join("\n")}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    let galleryCategories: Awaited<
      ReturnType<typeof loadGalleryCategoryDirectory>
    > = [];
    try {
      galleryCategories = await loadGalleryCategoryDirectory();
      const normalizedQuery = currentQuery.toLocaleLowerCase();
      const namesRelevant = galleryCategories.some((category) =>
        normalizedQuery.includes(category.name.toLocaleLowerCase()),
      );
      const galleryQuestion =
        namesRelevant ||
        /\b(?:gallery|galleries|photo|photograph|photography|travel|trip|visited|visit|place|places)\b/i.test(
          currentQuery,
        );
      if (galleryQuestion && galleryCategories.length > 0) {
        contexts = [
          contexts,
          `=== LIVE GALLERY DIRECTORY ===
This is authoritative for collection names and photo counts. It does not describe the contents of individual photographs.
${galleryCategoryPromptDirectory(galleryCategories)}`,
        ]
          .filter(Boolean)
          .join("\n\n");
      }
    } catch (error) {
      console.error("Gallery category context unavailable to answer model:", error);
    }

    // Step 5: one structured streaming completion writes the whole answer.
    //
    // There is no separate answer call any more, and no post-answer quote
    // picker, topic extractor, or compose/repair pass. The generator reads the
    // retrieved context and emits the A2UI document directly, so each component
    // reaches the visitor the moment its JSON closes.
    //
    // Everything the model references is validated against local source data
    // before it renders: artifact ids must appear in the directory built above,
    // and quotes must be verbatim substrings of that artifact's corpus file.

    // Karthik's own prose for the artifacts retrieval actually surfaced. This
    // is both the material the model may quote and the text each quote is
    // checked against, so the two can never drift apart.
    const QUOTE_SOURCE_LIMIT = 5;
    const QUOTE_SOURCE_CHARS = 3500;
    const directoryIds = new Set(rawEntries.map((entry) => entry.id));
    // Retrieval decides what the answer can draw on; the ranking decides what
    // a broad answer leads with.
    const impactRanking = formatImpactRanking(
      getImpactRanking(),
      directoryIds,
      getImpactFocus(),
    );
    const quoteCandidateIds: string[] = [];
    const considerQuoteCandidate = (id: string) => {
      if (!directoryIds.has(id) || quoteCandidateIds.includes(id)) return;
      quoteCandidateIds.push(id);
    };
    // Walk matches in score order so the strongest retrieval hits get quoted.
    for (const match of queryResponse.matches) {
      const meta = match.metadata ?? {};
      if (Array.isArray(meta.applies_to_ids)) {
        for (const id of meta.applies_to_ids) {
          if (typeof id === "string") considerQuoteCandidate(id);
        }
      }
      const company =
        typeof meta.company === "string" ? meta.company.toLowerCase() : "";
      const job = company
        ? allJobs.find((entry) => entry.company.toLowerCase() === company)
        : undefined;
      if (job) considerQuoteCandidate(`work:${job.company}`);
      for (const named of [meta.project_title, meta.title]) {
        if (typeof named !== "string") continue;
        const name = named.toLowerCase();
        const project = allProjects.find(
          (entry) =>
            entry.title.toLowerCase() === name || entry.id.toLowerCase() === name,
        );
        if (project) considerQuoteCandidate(`project:${project.id}`);
        const involvement = allInvolvements.find(
          (entry) =>
            entry.title.toLowerCase() === name ||
            entry.slug.toLowerCase() === name,
        );
        if (involvement) considerQuoteCandidate(`involvement:${involvement.slug}`);
      }
      if (meta.content_type === "blog_post" && typeof meta.slug === "string") {
        considerQuoteCandidate(`blog:${meta.slug}`);
      }
    }
    // Artifacts the visitor named outright still deserve a quote even when
    // vector retrieval ranked them low.
    for (const entry of rawEntries) {
      if (canonicalEntryRelevance(currentQuery, entry) > 0) {
        considerQuoteCandidate(entry.id);
      }
    }

    const quoteCorpora = new Map<string, string>();
    for (const id of quoteCandidateIds) {
      if (quoteCorpora.size >= QUOTE_SOURCE_LIMIT) break;
      const corpus = getCorpusForArtifact(id).trim();
      if (!corpus) continue;
      // The model and the validator both read this exact truncated text, so a
      // quote can never pass a check against prose the model never saw.
      quoteCorpora.set(id, corpus.slice(0, QUOTE_SOURCE_CHARS));
    }
    console.log(`💬 Quote sources: [${[...quoteCorpora.keys()].join(", ")}]`);

    const generationSources: A2UIGenerationSource[] = rawEntries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      corpus: quoteCorpora.get(entry.id),
    }));

    // Chronology comes from the canonical resume, not from whichever work
    // artifacts happen to be cited, so a career answer cannot end on the wrong
    // stage.
    const datedWorkOrder = (() => {
      const dated = allJobs
        .map((job) => ({ id: `work:${job.company}`, year: job.year }))
        .sort(
          (left, right) =>
            artifactDateRank({ id: left.id, data: { year: left.year } }) -
            artifactDateRank({ id: right.id, data: { year: right.year } }),
        );
      if (dated.length === 0) return "(no dated work records)";
      return [
        ...dated.map((entry) => `- ${entry.id}: ${entry.year}`),
        `- newest work record (feature as the final and most prominent stage): ${dated.at(-1)!.id}`,
      ].join("\n");
    })();

    const encoder = new TextEncoder();
    const tGenerationStart = Date.now();
    const readableStream = new ReadableStream({
      async start(controller) {
        const emit = (event: unknown) => controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
        let firstComponentMs = 0;
        try {
          const result = await generateA2UI({
            llm: gemini,
            question: currentQuery,
            context: contexts,
            sources: generationSources,
            galleryCategories,
            datedWorkOrder,
            impactRanking,
            conversation: routingConversationHistory,
            hydrate: (id, annotation) => hydrateArtifactById(id, retrievedBlogs, annotation),
            onUsage: recordUsage,
            onPartial: (a2ui, artifacts) => {
              if (!firstComponentMs) firstComponentMs = Date.now() - tGenerationStart;
              if (artifacts.length) emit({ artifacts });
              emit({ a2ui, a2uiStreaming: true });
            },
          });
          if (result.artifacts.length) emit({ artifacts: result.artifacts });
          emit({ content: result.historyText });
          emit({ a2ui: result.document });
          if (hostSuggestedQuestion && result.grounded) {
            await setSuggestedReplyCache(currentQuery, {
              reply: result.historyText,
              artifacts: result.artifacts as Artifact[],
            });
          }
          emit({
            telemetry: {
              cache: {
                suggestedReply: hostSuggestedQuestion ? "miss" : "ineligible",
                rewrites: rewriteCacheHit ? "hit" : usageRecords.some(record => record.stage === "retrieval_rewrite") ? "miss" : "skipped",
              },
              routing: {
                mode: "unified",
                answerModel: MODEL_CONFIG.a2uiModel,
                a2uiModel: MODEL_CONFIG.a2uiModel,
                rewriteModel: MODEL_CONFIG.rewriteModel,
                hydeMode: MODEL_CONFIG.hydeMode,
              },
              usage: usageRecords,
              usageSummary: summarizeUsage(usageRecords),
            },
            timings: {
              rewriter: hydeWaitMs,
              retrieval: retrievalMs,
              firstComponent: firstComponentMs,
              stream: Date.now() - tGenerationStart,
              total: Date.now() - requestStart,
            },
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: chatStreamHeaders(rl),
    });

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
