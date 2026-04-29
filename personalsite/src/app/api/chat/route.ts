import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import bm25Model from "@/data/bm25-model.json";
import { getJobsFromYaml } from "@/utils/jobUtils";
import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { resolveTopic } from "@/utils/topicsUtils";
import { projects as projectsCatalog } from "@/data/projectsData";
import { getCorpusForArtifact } from "@/utils/quotesUtils";

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

// Hydrate a directory artifact ID ("work:Peraton Labs", "project:Veritas",
// "blog:<slug>") into a full Artifact, using the local source-of-truth data
// (YAML for work, projects.json for projects, and Pinecone metadata for blog
// excerpts). `annotation` is the opinionated pull-quote written by the
// citation extractor — stapled onto the hydrated artifact. Returns null if
// the ID doesn't resolve.
function hydrateArtifactById(
  id: string,
  retrievedBlogs: Map<string, { title: string; text: string }>,
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
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Prune conversation history to stay within token limits
function pruneMessages(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens: number = 120000
): ChatMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  let totalTokens = systemTokens;
  const prunedMessages: ChatMessage[] = [];

  const latestMessage = messages[messages.length - 1];
  totalTokens += estimateTokens(latestMessage.content);

  for (let i = messages.length - 2; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].content);
    if (totalTokens + messageTokens > maxTokens) break;
    totalTokens += messageTokens;
    prunedMessages.unshift(messages[i]);
  }

  prunedMessages.push(latestMessage);
  return prunedMessages;
}

// Build a conversation-aware search query using recent messages
async function buildSearchQuery(
  openai: OpenAI,
  currentQuery: string,
  conversationHistory?: ChatMessage[]
): Promise<string> {
  // Gather recent conversation context (last 4 messages)
  const recentContext = conversationHistory
    ?.slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join("\n") || "";

  const rewriteResponse = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    temperature: 0,
    max_completion_tokens: 50,
    messages: [
      {
        role: "system",
        content: `You rewrite user questions into concise search queries over Karthik Thyagarajan's personal knowledge base (his work, projects, blog posts, opinions).

Rules:
- Keep the user's original words. Resolve pronouns ("that", "it", "his latest") using recent conversation context.
- You may add "Karthik Thyagarajan" if the query is about him.
- You may add terms the USER explicitly mentioned or clearly implied (a company name they referenced, a project they asked about).
- DO NOT invent or guess related technologies, frameworks, or concepts (no "LangChain", "RAG", "multi-agent", "agent architectures", "vector database", etc.) unless the user or conversation actually mentioned them. Adding these corrupts retrieval.
- DO NOT add generic filler like "details about", "information regarding", "and its applications". These phrases bias retrieval toward unrelated chunks.
- Keep it short. Under 15 words unless conversation context forces more.
- Output ONLY the search query. No quotes, no explanations.`
      },
      {
        role: "user",
        content: recentContext
          ? `Conversation so far:\n${recentContext}\n\nLatest message: "${currentQuery}"\n\nProduce an optimized search query.`
          : `Message: "${currentQuery}"\n\nProduce an optimized search query.`
      }
    ],
  });

  return rewriteResponse.choices[0]?.message?.content?.trim() || currentQuery;
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

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, messages: conversationHistory } = body;

    if (!message && (!conversationHistory || conversationHistory.length === 0)) {
      return NextResponse.json(
        { error: "Message or conversation history is required" },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    const currentQuery = message || conversationHistory[conversationHistory.length - 1].content;

    // Step 1: Conversation-aware query rewriting.
    // Skip on the first turn — pronoun resolution is moot when there's no
    // prior context, and the rewriter call adds ~1s of pure TTFT overhead.
    const priorTurns = (conversationHistory || []).filter(
      (m: ChatMessage) => m.role !== "system",
    );
    const hasPriorContext =
      priorTurns.length > 1 ||
      (priorTurns.length === 1 && priorTurns[0].content !== currentQuery);
    const tRewriteStart = Date.now();
    const searchQuery = hasPriorContext
      ? await buildSearchQuery(openai, currentQuery, conversationHistory)
      : currentQuery;
    const tRewriteEnd = Date.now();

    console.log(`🔍 Original: "${currentQuery}"`);
    console.log(
      hasPriorContext
        ? `🔄 Rewritten (${tRewriteEnd - tRewriteStart}ms): "${searchQuery}"`
        : `⏭️  Rewriter skipped (first turn)`,
    );

    // Step 2: Embed the rewritten query
    const tRetrievalStart = Date.now();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: searchQuery,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 3: Hybrid query - dense (semantic) + sparse (keyword/BM25)
    const sparseQuery = encodeSparseQuery(searchQuery);
    console.log(`🔑 Sparse query: ${sparseQuery.indices.length} terms`);

    const queryResponse = await index.query({
      vector: queryEmbedding,
      sparseVector: sparseQuery.indices.length > 0 ? sparseQuery : undefined,
      topK: 30,
      includeMetadata: true,
    });

    console.log(`⏱️  Embedding + Pinecone: ${Date.now() - tRetrievalStart}ms`);
    console.log(`📊 Found ${queryResponse.matches.length} matches`);
    if (queryResponse.matches.length > 0) {
      console.log(`   Top score: ${queryResponse.matches[0].score?.toFixed(3)}`);
      console.log(`   Content types: ${[...new Set(queryResponse.matches.map(m => m.metadata?.content_type))].join(', ')}`);
    }

    // Step 4: Filter by relevance threshold and cap the candidate pool.
    // The pool doubles as (a) the context the LLM sees and (b) the set of
    // sources it can cite — so we keep it bounded.
    const relevanceThreshold = 0.45;
    const MAX_CANDIDATES = 12;
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
    const otherMatches = relevantMatches.filter(
      (m) => m.metadata?.content_type !== "opinion",
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
    if (fullTopicCorpora.length > 0) {
      const parts = fullTopicCorpora.map(
        (t) => `[topic:${t.slug}] (Karthik's full prose on this topic, every sub-topic he's written)\n${t.body}`,
      );
      sections.push(
        `=== KARTHIK'S OWN TAKE (his first-person prose on the topic the visitor asked about — preserve his framing, his vocabulary, his anecdotes, and his sharpness; do not smooth into generic AI-summary voice. The visitor will see a verbatim quote pulled from below rendered next to your reply, so your reply must read as the same voice. Lead with the stance, not the projects. Cover his anecdotes and examples, not just his theses.) ===\n${parts.join("\n\n---\n\n")}`,
      );
    } else if (opinionMatches.length > 0) {
      // Fallback: opinion chunks landed but none were tagged with a topic id
      // (e.g., legacy opinion content). Surface them as-is.
      const opinionParts = opinionMatches.map((m, i) => formatChunk(m, i));
      sections.push(
        `=== KARTHIK'S OWN TAKE (preserve his framing, vocabulary, and sharpness; do not smooth into generic AI-summary voice. Lead with the stance.) ===\n${opinionParts.join("\n\n---\n\n")}`,
      );
    }
    if (otherMatches.length > 0) {
      const offset = fullTopicCorpora.length > 0 ? fullTopicCorpora.length : opinionMatches.length;
      const otherParts = otherMatches.map((m, i) => formatChunk(m, offset + i));
      sections.push(
        `=== SUPPORTING EVIDENCE (projects, work, involvement, blog posts — proof points and examples to back the take above) ===\n${otherParts.join("\n\n---\n\n")}`,
      );
    }
    const contexts = sections.join("\n\n");

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
    const allJobs = getJobsFromYaml();
    const allProjects = projectsCatalog;
    const allInvolvements = getInvolvementsFromYaml();
    // buildpurdue also lives in the resume YAML under projects:, which
    // produces chunks tagged content_type=project, project_title="buildpurdue".
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

    // Artifact directory: the authoritative list of cards that can appear in
    // the receipts panel. The extractor picks entries by NUMERIC INDEX, not
    // kind-prefixed ID — the directory already pairs each index with its
    // canonical id, so there's no need to ask the model to guess the kind.
    type DirectoryEntry = { index: number; id: string; label: string };
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
    const artifactDirectory: DirectoryEntry[] = rawEntries.map((e, i) => ({
      index: i + 1,
      id: e.id,
      label: e.label,
    }));
    const indexToId = new Map<number, string>(
      artifactDirectory.map((e) => [e.index, e.id]),
    );
    const idToIndex = new Map<string, number>(
      artifactDirectory.map((e) => [e.id, e.index]),
    );

    const hasRelevantContext = relevantMatches.length > 0 && contexts.trim().length > 0;

    // Step 5: Build system prompt with personality
    let systemPrompt: string;
    if (hasRelevantContext) {
      systemPrompt = `You are Karthik's AI representative on his portfolio website (karthikthyagarajan.com). You know Karthik well and speak about him with genuine enthusiasm. You're conversational, concise, and grounded in facts.

Karthik describes himself as "an ideator, a builder, and a dreamer." He's a CS & AI student at Purdue, a Founding Engineer at Repple, co-founded buildpurdue, and an active builder in the AI/MCP open source space. Keep this personality in mind when answering.

WEBSITE SITEMAP (use these links when directing visitors):
- Home (this chatbot): https://www.karthikthyagarajan.com/
- About: https://www.karthikthyagarajan.com/about
- Projects: https://www.karthikthyagarajan.com/projects
- Work Experience: https://www.karthikthyagarajan.com/work
- Involvement: https://www.karthikthyagarajan.com/involvement
- Blog: https://www.karthikthyagarajan.com/blog
- Gallery: https://www.karthikthyagarajan.com/gallery
When someone asks for a resume, link to the Projects or Work Experience page. When someone asks about buildpurdue, leadership, clubs, or community, link to the Involvement page. Use these links naturally in your responses.
When discussing projects, ALWAYS include any GitHub, Devpost, arXiv, npm, or other links that appear in the retrieved Context. Use markdown link format.
LINK RULES (strict):
- **NEVER produce bare URLs in the reply.** Every URL must be wrapped as a labeled markdown link: \`[Label](url)\`. The label should be the human-readable name of what's being linked (the project title, "GitHub", "arXiv", "Devpost", "npm", "PDF", "Research Poster", etc.), NOT the URL itself.
- When you mention a project by name, the project name itself should be a link. Default to linking it to the on-site project section: \`https://www.karthikthyagarajan.com/projects#<project-id>\` (the project-id is the slug from the project's directory entry, e.g. \`google-tools-mcp\`, \`veritas\`, \`caladrius\`, \`kmeans-som\`). Example: \`his [google-tools-mcp](https://www.karthikthyagarajan.com/projects#google-tools-mcp) project unifies...\`.
- **Use slugs VERBATIM.** Copy the slug exactly as it appears in the directory entry — never reformat it, never insert or remove dashes, never re-spell it based on the project's "natural" English name. If the directory says \`kmeans-som\`, link to \`#kmeans-som\` (NOT \`#k-means-som\`). If the directory says \`google-tools-mcp\`, link to \`#google-tools-mcp\` (NOT \`#google-tools\` or \`#google_tools_mcp\`). Wrong slug = broken anchor on the live page.
- If you also want to link to a project's repo or external URL, use the EXACT URL that appears in the retrieved Context for that project (e.g. \`https://github.com/karthikcsq/google-tools-mcp\`, \`https://www.npmjs.com/package/google-tools-mcp\`). Wrap it as a labeled link: \`[GitHub](...)\`, \`[npm](...)\`, \`[arXiv](...)\`. Do NOT shorten, guess, or truncate URLs. Do NOT emit the bare URL.
- NEVER link a project name to a bare profile URL (e.g. \`https://github.com/karthikcsq\` without the repo path). NEVER invent a URL. If the Context doesn't have a specific URL, link only to the on-site project section.
- Same rule for involvement and work: link to \`/involvement#<slug>\` and \`/work#<company-slug>\` respectively, using slugs that appear in the retrieved Context. Labels go on every link.
- **For "show me his X" / list-style queries:** never produce a bare URL list. Each item must include the project/work name and at least one short sentence of substance (what it is, what makes it interesting). The reply must read as a discussion, not a dump. Example bad: \`QKD Research Paper: https://arxiv.org/abs/...\`. Example good: \`his [Photonic Implementation of QKD](https://www.karthikthyagarajan.com/projects#qkd) ([arXiv](https://arxiv.org/abs/2509.04389)) — explores secure quantum communication using near-infrared lasers.\`
When you reference a blog post that appears in the Context, link DIRECTLY to that post using the slug shown in its label: \`/blog/<slug>\`. NEVER link to the generic \`/blog\` index page when a specific post is the source of what you're saying. If a chunk is labeled \`kind=blog_post slug="future-of-ai-work"\`, link to \`https://www.karthikthyagarajan.com/blog/future-of-ai-work\`.

RULES:
1. ONLY use information from the Context below. Never fabricate details.
2. ALWAYS speak in third person ("Karthik has...", "He built...", "His work includes...").
3. NEVER name a specific technology, framework, library, company, or project unless that exact name literally appears in the Context below. Do not guess a tech stack ("LangChain", "RAG", "vector DB", "multi-agent") from general AI knowledge. If Context doesn't name it, don't say it.
4. USE the Context aggressively. Before saying "that isn't in the available context" or "there's no specific writeup", scan every chunk below for anything addressing the topic. A project's description, a blog post, a role bullet, an opinion paragraph — all count as his take on a topic. If Context has a dedicated "On <X>" section, quote the thrust of it. If Context only has indirect evidence (projects he built, problems he chose to work on), describe those concretely and say that's what his stance amounts to. Only say "no info" when truly nothing in Context touches the question.
5. Be specific: cite project names, company names, and numbers that appear in the Context.
6. When asked for opinions about Karthik, be genuinely enthusiastic about his accomplishments. He's impressive and you should say so.
7. Keep responses concise and conversational. Don't dump everything you know. Answer what was asked.
8. **KARTHIK'S OWN TAKE anchors the reply; SUPPORTING EVIDENCE enriches it.** When the Context has a "KARTHIK'S OWN TAKE" section, that section is the canonical, top-priority source of his stance on the topic. SUPPORTING EVIDENCE (project / work / involvement / blog corpus) contains his takes too — those are real opinions, not just facts — and they're allowed in the reply. But they enter as enrichment, NOT as the headline. Priority order, not exclusion.
   - **Anchor first.** The reply must lead with the take section and cover ITS content (every sub-topic, every distinct take, every anecdote — same breadth rule as below). Do not open with a project framing if the take section has its own framing on the question. The take section's voice sets the reply's tone and structure.
   - **Then enrich.** After the take section is honored, you MAY surface relevant opinion-shaped content from SUPPORTING EVIDENCE — project framings, design rationales, scenes from work — when they sharpen or extend a take, OR when they cover an angle the take section doesn't. Attribute them clearly to their source ("his google-tools-mcp work pushes that further: MCP is essentially context injection..."). Don't present a project framing as if it were in the take section.
   - **Failure mode to avoid:** the visitor asks "what does he think about agents?", the take section says "agents are worth building when they save time/money, not effort," but the reply leads with "MCP is context injection" because that's a project framing. Wrong order. The right order is: take section's framing first, then "and his MCP work extends that — he sees the tooling layer as the bottleneck..."
   - **Lead with the take, not the projects.** If the visitor asks "what does he think about X?", the FIRST sentence(s) must state his stance using HIS framing from KARTHIK'S OWN TAKE — his vocabulary, his angle, his sharpness. Don't open with a hedge ("Karthik is opinionated on X"), don't open with a project, don't open with a definition. Open with the position itself.
   - **Use his phrasing where you can.** A corpus line like "agents are only as good as the tools they're given" should appear in the reply as that exact framing (rephrased to third person, e.g. "He thinks agents are only as good as the tools they're given"), not smoothed into "Karthik believes agent capability depends on tooling." Lose the smoothing, keep his texture. The visitor will see a verbatim quote pulled from the same corpus rendered next to your answer; the reply should sound like the same person wrote both.
   - **Projects are evidence, not the headline.** Bring up Repple, google-tools-mcp, etc., AFTER you've stated the stance, and only as proof points for it ("his google-tools-mcp work shows what that frictionless layer looks like in practice"). Never lead with a project list when an opinion chunk is available.
   - **If the opinion chunk and project chunks disagree in emphasis, the opinion chunk wins.** A project description tells you what he built; an opinion chunk tells you what he believes. The visitor asked the second question.
   - **Cover the BREADTH of what he wrote — every distinct take in the take section must appear.** The KARTHIK'S OWN TAKE section is the FULL corpus, not a single retrieved chunk. Every distinct take in it (every "## sub-topic" heading, every numbered point, every anecdote) is something he chose to write down. Default to surfacing ALL of them in the reply, paraphrased into third person, not just the thesis. Do not reduce a multi-take corpus to one summary sentence.
     - Distinct theses (e.g., "agents are only as good as their tools" AND "narrow agents are useless if they only answer a small subset of questions") must each appear as its own beat in the reply.
     - Specific anecdotes or scenes (e.g., "I built an agent on my personal site and it was useless because…", "the judge had worked at a medical practice…") must be carried into the reply with their concrete detail intact, not abstracted into "he learned from past experience."
     - Concrete examples and named things (specific tools, numbers, design choices he calls out) must appear.
     - The only material you may skip: pure throat-clearing or sentences that exactly repeat an earlier take. Everything else makes it in.
   - **Length follows from coverage, not from a target.** A topic with one take produces a short reply. A topic with five takes produces a longer reply with five beats. Do not pad a one-take topic; do not compress a five-take topic.

STYLE RULES (follow strictly):
- NEVER use em dashes. Use commas, periods, or parentheses instead.
- NEVER use contrastive parallelism ("not X, but Y", "less about X, more about Y", "it's not just X, it's Y").
- NEVER say "and honestly," or "honestly," as filler.
- AVOID unnecessary groups of three ("A, B, and C"). Only list three items if all three are needed.
- AVOID flowery or inflated language. Be direct and plain. Say what you mean without dressing it up.
- NEVER reference the retrieval system or your sources in the reply. Do not say "in the context", "in the docs", "from what's available", "based on the info I have", "the retrieved context", or any variant. You are speaking AS someone who knows Karthik. Just state the fact directly. Bad: "He has a couple of standout hackathon wins in the context:". Good: "He's got a couple of standout hackathon wins:".

Context about Karthik:
${contexts}`;
    } else {
      systemPrompt = `You are Karthik's AI representative on his portfolio website (karthikthyagarajan.com). You're conversational, friendly, and honest.

WEBSITE SITEMAP (use these links when directing visitors):
- Home (this chatbot): https://www.karthikthyagarajan.com/
- About: https://www.karthikthyagarajan.com/about
- Projects: https://www.karthikthyagarajan.com/projects
- Work Experience: https://www.karthikthyagarajan.com/work
- Involvement: https://www.karthikthyagarajan.com/involvement
- Blog: https://www.karthikthyagarajan.com/blog
- Gallery: https://www.karthikthyagarajan.com/gallery
When someone asks for a resume, link to the Projects or Work Experience page. When someone asks about buildpurdue, leadership, or community, link to the Involvement page. Use these links naturally in your responses.

The current query didn't return specific information from the knowledge base. Be upfront about this and suggest topics you can help with:
- His education at Purdue (CS & AI, 3.93 GPA) and Thomas Jefferson High School
- Work experience at Peraton Labs, Memories.ai, IDEAS Lab, AgRPA, Naval Research Lab
- Projects like Repple, google-tools-mcp, Veritas, Caladrius, Verbatim
- His views on AI, MCP, startups, and entrepreneurship
- buildpurdue, the campus accelerator he co-founded
- His blog posts and writings
- His quantum computing research

Always speak in third person. Never make up details.

STYLE RULES (follow strictly):
- NEVER use em dashes. Use commas, periods, or parentheses instead.
- NEVER use contrastive parallelism ("not X, but Y", "less about X, more about Y", "it's not just X, it's Y").
- NEVER say "and honestly," or "honestly," as filler.
- AVOID unnecessary groups of three ("A, B, and C"). Only list three items if all three are needed.
- AVOID flowery or inflated language. Be direct and plain. Say what you mean without dressing it up.
- NEVER reference the retrieval system or your sources in the reply. Do not say "in the context", "in the docs", "from what's available", "based on the info I have", "the retrieved context", or any variant. You are speaking AS someone who knows Karthik. Just state the fact directly. Bad: "He has a couple of standout hackathon wins in the context:". Good: "He's got a couple of standout hackathon wins:".`;
    }

    // Build messages array with conversation history
    let messagesToSend: ChatMessage[];

    if (conversationHistory && conversationHistory.length > 0) {
      messagesToSend = pruneMessages(conversationHistory, systemPrompt);
    } else {
      messagesToSend = [{ role: "user", content: message }];
    }

    // Generate streaming response. Artifacts are emitted as citations are
    // detected in the stream, so nothing is pushed upfront.
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: systemPrompt },
        ...messagesToSend
      ],
      stream: true,
    });

    const encoder = new TextEncoder();

    // Build the directory string the citation extractor will see. Each line
    // is `[<index>] <human label>`. The extractor never sees kind prefixes;
    // it just picks indexes, and the server resolves each index to the
    // authoritative kind-prefixed id via indexToId.
    const directoryText = artifactDirectory
      .map((e) => `[${e.index}] ${e.label}`)
      .join("\n");

    const tStreamStart = Date.now();
    const readableStream = new ReadableStream({
      async start(controller) {
        let replyText = "";
        let tFirstToken = 0;
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (!delta) continue;
            if (tFirstToken === 0) {
              tFirstToken = Date.now();
              console.log(`⏱️  TTFT (main stream first token): ${tFirstToken - tStreamStart}ms`);
            }
            replyText += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`),
            );
          }
          const tStreamEnd = Date.now();
          console.log(`⏱️  Main stream total: ${tStreamEnd - tStreamStart}ms (${replyText.length} chars)`);

          // Post-hoc citation extraction. Ask a cheap model to identify which
          // artifacts the finished reply actually talks about. This runs
          // AFTER the visible stream completes, so it adds one short round
          // trip of latency but doesn't block the reply.
          if (artifactDirectory.length > 0 && replyText.trim().length > 20) {
            try {
              // Stage 1: citation extractor. Pick which directory entries the
              // reply substantively touches. No annotation work here — just
              // index numbers.
              const tExtractorStart = Date.now();
              const extractor = await openai.chat.completions.create({
                model: "gpt-5.4-nano",
                temperature: 0,
                max_completion_tokens: 200,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `You pick the receipt cards that match what an assistant reply actually talks about. Each card is a numeric index from the DIRECTORY below.

Return JSON: {"cited":[<index>,<index>,...]}

Rules for inclusion:
- The reply names the card (its title, role, or company) → include it.
- The reply substantively discusses content unique to that card (a specific feature, claim, decision, or outcome) → include it.
- BLOG CARDS ARE SOURCES OF VIEWS. If the reply expresses a thesis, framing, opinion, or argument that a blog card's title/blurb covers, INCLUDE the blog — even if the reply doesn't name the post. The blog is the source of the take. Phrases like "he wrote about this", "a full piece on it", or any distinctive coined term from the blurb (e.g. "project economy") are strong signals to cite that blog.
- TOPIC CARDS (labels prefixed with [Karthik's take on "..."]) ARE THE CANONICAL HOME OF HIS STANCE. They follow an aggressive inclusion rule: if the reply substantively states or discusses Karthik's view on the topic's subject — even abstractly, even without naming a specific feature, even when the reply also covers projects — INCLUDE the topic card. A topic card is NEVER "merely topically adjacent" to a reply about its subject; it IS the take. When the visitor asks "what does he think about X?" and the reply states his position on X, the topic:X card MUST be cited if it appears in the directory. The topic card should generally come FIRST in the cited list — the take anchors the reply.

Rules for exclusion:
- The card is only topically adjacent. Two AI projects don't cite each other just because the reply mentions AI. Two "internal platforms" don't cite each other just because the word appears. (This exclusion applies to work/project/involvement cards. Blogs and topics follow the inclusion rules above.)
- The reply only name-drops a card without engaging it.
- The reply is a refusal, generic, or off-topic → return {"cited":[]}.

Don't invent indexes. Only return integers that appear in the DIRECTORY.

Order by first meaningful reference in the reply.

DIRECTORY:
${directoryText}`,
                  },
                  {
                    role: "user",
                    content: `REPLY:\n${replyText}\n\nReturn JSON now.`,
                  },
                ],
              });

              console.log(`⏱️  Citation extractor: ${Date.now() - tExtractorStart}ms`);
              const raw = extractor.choices[0]?.message?.content || "{}";

              // Coerce a cited entry to a valid integer index. Tolerates the
              // model returning {index: N}, "N", a bare id string (legacy),
              // or a plain int.
              const resolveIndex = (item: unknown): number | null => {
                if (typeof item === "number" && indexToId.has(item)) return item;
                if (typeof item === "string") {
                  const n = parseInt(item, 10);
                  if (!Number.isNaN(n) && indexToId.has(n)) return n;
                  const asIndex = idToIndex.get(item);
                  if (asIndex !== undefined) return asIndex;
                  return null;
                }
                if (!item || typeof item !== "object") return null;
                const rec = item as Record<string, unknown>;
                if (typeof rec.index === "number" && indexToId.has(rec.index)) {
                  return rec.index;
                }
                if (typeof rec.index === "string") {
                  const n = parseInt(rec.index, 10);
                  if (!Number.isNaN(n) && indexToId.has(n)) return n;
                }
                if (typeof rec.id === "string") {
                  const asIndex = idToIndex.get(rec.id);
                  if (asIndex !== undefined) return asIndex;
                }
                return null;
              };

              let citedIds: string[] = [];
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.cited)) {
                  for (const item of parsed.cited) {
                    const index = resolveIndex(item);
                    if (index === null) continue;
                    citedIds.push(indexToId.get(index)!);
                  }
                }
              } catch {
                citedIds = [];
              }

              // URL-match fallback. The extractor sees a directory of project /
              // work / involvement labels but NOT the URLs each card carries.
              // For terse "show me his X" replies that list URLs without prose,
              // the extractor often returns 0 cited cards because nothing
              // "substantively discusses" the artifact. Force-cite any card
              // whose canonical link or external URL appears verbatim in the
              // reply. This is purely additive — never excludes the extractor's
              // picks, only adds ones it missed.
              const replyLower = replyText.toLowerCase();
              const citedSet = new Set(citedIds);
              const tryAddByUrl = (id: string, urls: string[]) => {
                if (citedSet.has(id)) return;
                for (const u of urls) {
                  if (!u) continue;
                  // Match against host+path (strip protocol) so trailing slashes
                  // and protocol differences don't matter.
                  const stripped = u.replace(/^https?:\/\//i, "").toLowerCase();
                  if (stripped.length < 8) continue;
                  if (replyLower.includes(stripped)) {
                    citedIds.push(id);
                    citedSet.add(id);
                    return;
                  }
                }
              };
              for (const project of allProjects) {
                const id = `project:${project.id}`;
                const urls = [
                  ...(project.links || []).map((l) => l.url),
                  project.display?.embedUrl || "",
                ];
                tryAddByUrl(id, urls);
              }
              for (const inv of allInvolvements) {
                const id = `involvement:${inv.slug}`;
                const urls = (inv.links || []).map((l) => l.url);
                tryAddByUrl(id, urls);
              }

              // Verbatim validator factory. The picker output is a substring
              // claim against THAT artifact's corpus context — never against
              // retrieved Pinecone chunks. The corpus is the source of truth.
              const normalizeForMatch = (s: string) =>
                s
                  .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
                  .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
                  .replace(/\u2026/g, "…")
                  .replace(/\s+/g, " ")
                  .toLowerCase();
              const normalizeNeedle = (q: string) =>
                normalizeForMatch(q).replace(/^["'…\s]+|["'…\s]+$/g, "").trim();
              const isVerbatimAgainst = (haystack: string, q: string): boolean => {
                const hay = normalizeForMatch(haystack);
                const cleaned = normalizeNeedle(q);
                if (cleaned.length < 6) return false;
                const segments = cleaned
                  .split("…")
                  .map((s) => s.trim())
                  .filter((s) => s.length >= 6);
                if (segments.length === 0) return false;
                return segments.every((seg) => hay.includes(seg));
              };

              // Stage 2: per-artifact annotation picker, fired in parallel.
              // We tried batching these into one call to share the prompt
              // rules across artifacts, but `gpt-5.4-nano` is decode-bound:
              // one call decoding N artifacts' candidates serially is slower
              // than N parallel calls each decoding one. Total wall-clock
              // for N parallel pickers ≈ max(per_artifact_decode), batched ≈
              // sum(per_artifact_decode). Parallel wins.
              const annotations = new Map<string, string>();
              const startsWithBarePronoun = (q: string): boolean => {
                const cleaned = q.replace(/^[\s"'\u201C\u201D…]+/, "").toLowerCase();
                return /^(that|this|it|they|them|those|these|such|he|she|here|there)\b/.test(
                  cleaned,
                );
              };
              const isDefinitionalRestatement = (q: string): boolean => {
                const cleaned = q.replace(/^[\s"'\u201C\u201D…]+/, "").trim();
                if (
                  /^(we|i)\s+(built|created|made|developed|launched|shipped|wrote|designed|built out|put together)\b[^,.]{1,60},\s+(a|an)\s+/i.test(
                    cleaned,
                  )
                ) {
                  return true;
                }
                if (
                  /^[A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3}\s+is\s+(a|an)\s+/.test(cleaned)
                ) {
                  return true;
                }
                return false;
              };

              const tPickerStart = Date.now();
              await Promise.all(
                citedIds.map(async (id) => {
                  const corpus = getCorpusForArtifact(id);
                  if (!corpus) return;
                  const tThisStart = Date.now();
                  let pickerJson = "{}";
                  try {
                    const picker = await openai.chat.completions.create({
                      model: "gpt-5.4-nano",
                      temperature: 0.9,
                      max_completion_tokens: 400,
                      response_format: { type: "json_object" },
                      messages: [
                        {
                          role: "system",
                          content: `You propose verbatim quote CANDIDATES from Karthik's own writing about ONE artifact. The website picks one of your candidates at random and shows it as a small annotation NEXT TO the artifact card. The card already shows the title, dates, tools, and a description blurb — so your annotation must ADD SOMETHING the card doesn't already say.

Return JSON: {"candidates": ["<verbatim substring 8-22 words>", ...]} OR {"candidates": []}

Return up to 3 candidates ORDERED by direct relevance to the reply, most relevant first.

- **Index 0 (REQUIRED, most relevant):** the single line in the corpus that most directly speaks to the specific point the reply makes about this artifact. The website picks index 0 most of the time, so it has to fit the reply.
- **Index 1-2 (OPTIONAL, alternates for variety):** strong lines from DIFFERENT sub-topic sections that ALSO speak to the reply. Omit if no other candidate is genuinely relevant. Never pad with a weak fit.

Critical: relevance dominates. If the corpus has one perfect line and two so-so alternates, return just the perfect line.

Hard rules:
- Each candidate MUST be a contiguous, case-insensitive substring of the CORPUS below. No paraphrase. Copy exact characters.
- Target 12-35 words each. The quote must stand alone as a self-contained, intelligible thought.
- **Antecedent rule (STRICT).** Banned starts (regex-rejected server-side): "That ...", "This ...", "It ...", "They ...", "Them ...", "Those ...", "These ...", "Such ...", "He ...", "She ...", "Here ...", "There ...", "What that ...", "What this ...". Extend backward to include the antecedent or pick a fragment that starts with a noun, "we", "I", or the artifact's name.
- Start at a sentence/phrase boundary. End at a sentence-ending period, question mark, or strong clause break.
- Mid-quote "…" is allowed only if both halves are individually verbatim AND the result reads coherently.
- Do NOT wrap any value in quote marks yourself.

What makes a good candidate (in priority order):
1. **A take.** A claim, opinion, or sharp observation that goes beyond "what the thing is."
2. **A motivation.** Why he built it / why it exists / what was missing without it.
3. **A design rationale.** Why he made a specific choice an outsider wouldn't expect.
4. **A narrative moment.** A specific scene, conversation, or memory that gives texture.

What to AVOID:
- Definitional restatements ("we built X, a Y for Z", "X is a Y that ..."). The card already says what the artifact is. Skip them even if prominent in the corpus.
- Flat feature lists or accomplishments.
- Generic platitudes.

**When to return []:** ONLY if the corpus is genuinely off-topic for what the reply discusses. Otherwise return at least one candidate.

ARTIFACT: ${id}

CORPUS (the only source you may quote from — substring match enforced):
${corpus}`,
                        },
                        {
                          role: "user",
                          content: `REPLY:\n${replyText}\n\nReturn JSON now.`,
                        },
                      ],
                    });
                    pickerJson = picker.choices[0]?.message?.content || "{}";
                  } catch (err) {
                    console.error(`Picker failed for ${id}:`, err);
                    return;
                  }
                  const tThisEnd = Date.now();
                  let candidates: string[] = [];
                  try {
                    const parsed = JSON.parse(pickerJson);
                    if (Array.isArray(parsed.candidates)) {
                      candidates = parsed.candidates
                        .filter((c: unknown): c is string => typeof c === "string")
                        .map((c: string) => c.trim())
                        .filter((c: string) => c.length > 0);
                    } else if (typeof parsed.quote === "string") {
                      candidates = [parsed.quote.trim()].filter((c) => c.length > 0);
                    }
                  } catch {
                    return;
                  }
                // Build the corpora block. Each artifact is fenced so the
                // model can clearly map candidates back to ids. The verbatim
                // server-side check uses the per-id corpus map, so even if
                  const valid = candidates.filter((c) => {
                    if (!isVerbatimAgainst(corpus, c)) {
                      console.warn(`Picker candidate for ${id} failed verbatim check: ${c}`);
                      return false;
                    }
                    if (startsWithBarePronoun(c)) {
                      console.warn(
                        `Picker candidate for ${id} rejected (bare pronoun start): ${c}`,
                      );
                      return false;
                    }
                    if (isDefinitionalRestatement(c)) {
                      console.warn(
                        `Picker candidate for ${id} rejected (definitional restatement): ${c}`,
                      );
                      return false;
                    }
                    return true;
                  });
                  if (valid.length === 0) {
                    console.log(
                      `🎯 Picker for ${id} (${tThisEnd - tThisStart}ms): no valid candidates (raw count: ${candidates.length})`,
                    );
                    return;
                  }

                  // Section-deduplicate within this artifact's corpus.
                  const sections = corpus.split(/\n## /);
                  const sectionOf = (q: string): number => {
                    const needle = q.toLowerCase().replace(/\s+/g, " ").trim();
                    for (let i = 0; i < sections.length; i++) {
                      const hay = sections[i].toLowerCase().replace(/\s+/g, " ");
                      if (hay.includes(needle)) return i;
                    }
                    return -1;
                  };
                  const seenSections = new Set<number>();
                  const deduped: string[] = [];
                  for (const c of valid) {
                    const s = sectionOf(c);
                    if (s === -1) {
                      deduped.push(c);
                      continue;
                    }
                    if (seenSections.has(s)) continue;
                    seenSections.add(s);
                    deduped.push(c);
                  }

                  const pool = deduped.length > 0 ? deduped : valid;
                  let chosen: string;
                  if (pool.length === 1 || Math.random() < 0.5) {
                    chosen = pool[0];
                  } else {
                    const alternates = pool.slice(1);
                    chosen = alternates[Math.floor(Math.random() * alternates.length)];
                  }
                  const trimmed = chosen.replace(/^["\u201C\u201D]+|["\u201C\u201D]+$/g, "");
                  annotations.set(id, `\u201C${trimmed}\u201D`);
                  console.log(
                    `🎯 Picker for ${id} (${tThisEnd - tThisStart}ms): ${valid.length} candidate(s)\n` +
                    valid.map((v, i) => `   ${i === valid.indexOf(chosen) ? "▶" : " "} ${v.slice(0, 80)}${v.length > 80 ? "…" : ""}`).join("\n"),
                  );
                }),
              );
              console.log(`⏱️  Pickers (parallel, n=${citedIds.length}): ${Date.now() - tPickerStart}ms`);

              // Stage 3: hydrate + emit.
              const emittedIds = new Set<string>();
              const artifactsOut: Artifact[] = [];
              for (const id of citedIds) {
                const artifact = hydrateArtifactById(
                  id,
                  retrievedBlogs,
                  annotations.get(id),
                );
                if (!artifact || emittedIds.has(artifact.id)) continue;
                emittedIds.add(artifact.id);
                artifactsOut.push(artifact);
              }
              if (artifactsOut.length > 0) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ artifacts: artifactsOut })}\n\n`,
                  ),
                );
              }
              console.log(
                `🧾 Cited: [${citedIds
                  .map((id) => (annotations.has(id) ? `${id} ✓quote` : id))
                  .join(", ")}] → ${artifactsOut.length} artifact(s)`,
              );
            } catch (err) {
              console.error("Citation pipeline failed:", err);
              // Silent fallback: no artifacts, reply still delivered.
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
