import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import bm25Model from "@/data/bm25-model.json";
import { getJobsFromYaml } from "@/utils/jobUtils";
import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { projects as projectsCatalog } from "@/data/projectsData";

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
    const title = id.slice(8);
    const project = projectsCatalog.find(
      (p) => p.title.toLowerCase() === title.toLowerCase(),
    );
    if (!project) return null;
    // The card's primary link points at the project's dedicated section on
    // the /projects page (where description + all external links are surfaced),
    // not the external URL directly. Lets visitors see the richer context.
    return {
      kind: "project",
      id: `project:${project.title}`,
      annotation: note,
      data: {
        title: project.title,
        tools: project.tools,
        date: project.date,
        link: `/projects#${project.id}`,
        description: project.description || "",
      },
    };
  }
  if (id.startsWith("blog:")) {
    const slug = id.slice(5);
    const entry = retrievedBlogs.get(slug);
    if (!entry) return null;
    const excerpt = (entry.text || "").slice(0, 220).replace(/\s+/g, " ").trim();
    return {
      kind: "blog",
      id,
      annotation: note,
      data: { title: entry.title, slug, excerpt },
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
    model: "gpt-4o-mini",
    temperature: 0,
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

    // Step 1: Conversation-aware query rewriting
    const searchQuery = await buildSearchQuery(openai, currentQuery, conversationHistory);

    console.log(`🔍 Original: "${currentQuery}"`);
    console.log(`🔄 Rewritten: "${searchQuery}"`);

    // Step 2: Embed the rewritten query
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
    const contextParts = relevantMatches.map((match, idx) => {
      const meta = match.metadata || {};
      const kind = (meta.content_type as string) || (meta.source_type as string) || "unknown";
      const labelBits: string[] = [`[#${idx + 1}] kind=${kind}`];
      if (meta.title) labelBits.push(`title="${meta.title}"`);
      else if (meta.company) labelBits.push(`company="${meta.company}"`);
      else if (meta.project_title) labelBits.push(`title="${meta.project_title}"`);
      const text = (meta.text as string) || "";
      return `${labelBits.join(" ")}\n${text}`;
    });

    const contexts = contextParts.join("\n\n---\n\n");

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
    const retrievedBlogs = new Map<string, { title: string; text: string }>();
    for (const m of queryResponse.matches) {
      if (m.metadata?.content_type !== "blog_post") continue;
      const slug = m.metadata?.slug as string | undefined;
      const title = m.metadata?.title as string | undefined;
      const text = (m.metadata?.text as string | undefined) || "";
      if (!slug || !title) continue;
      if (!retrievedBlogs.has(slug)) retrievedBlogs.set(slug, { title, text });
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
        id: `project:${p.title}`,
        label: `${p.title}${p.tools ? ` [${p.tools}]` : ""}${p.date ? ` (${p.date})` : ""} — ${blurb(p.description, 200)}`,
      })),
      ...allInvolvements.map((inv) => ({
        id: `involvement:${inv.slug}`,
        label: `${inv.title} (${inv.role}, ${inv.date}) — ${blurb(
          `${inv.tagline} ${inv.whatItIs} ${inv.myRole}`,
          220,
        )}`,
      })),
      ...[...retrievedBlogs.entries()].map(([slug, { title, text }]) => ({
        id: `blog:${slug}`,
        label: `"${title}" — ${blurb(text, 160)}`,
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

RULES:
1. ONLY use information from the Context below. Never fabricate details.
2. ALWAYS speak in third person ("Karthik has...", "He built...", "His work includes...").
3. NEVER name a specific technology, framework, library, company, or project unless that exact name literally appears in the Context below. Do not guess a tech stack ("LangChain", "RAG", "vector DB", "multi-agent") from general AI knowledge. If Context doesn't name it, don't say it.
4. USE the Context aggressively. Before saying "that isn't in the available context" or "there's no specific writeup", scan every chunk below for anything addressing the topic. A project's description, a blog post, a role bullet, an opinion paragraph — all count as his take on a topic. If Context has a dedicated "On <X>" section, quote the thrust of it. If Context only has indirect evidence (projects he built, problems he chose to work on), describe those concretely and say that's what his stance amounts to. Only say "no info" when truly nothing in Context touches the question.
5. Be specific: cite project names, company names, and numbers that appear in the Context.
6. When asked for opinions about Karthik, be genuinely enthusiastic about his accomplishments. He's impressive and you should say so.
7. Keep responses concise and conversational. Don't dump everything you know. Answer what was asked.

STYLE RULES (follow strictly):
- NEVER use em dashes. Use commas, periods, or parentheses instead.
- NEVER use contrastive parallelism ("not X, but Y", "less about X, more about Y", "it's not just X, it's Y").
- NEVER say "and honestly," or "honestly," as filler.
- AVOID unnecessary groups of three ("A, B, and C"). Only list three items if all three are needed.
- AVOID flowery or inflated language. Be direct and plain. Say what you mean without dressing it up.

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
- AVOID flowery or inflated language. Be direct and plain. Say what you mean without dressing it up.`;
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
      model: "gpt-5.3-chat-latest",
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

    // Build the source-chunks block the extractor pulls quotes from. Each
    // chunk is tagged with `related=<index>` when its Pinecone metadata maps
    // to a specific directory entry. Generic chunks (text files, faq,
    // narrative) have no related tag and can back any card semantically.
    const chunkToDirectoryIndex = (meta: Record<string, unknown>): number | undefined => {
      const ct = meta.content_type as string | undefined;
      let id: string | undefined;
      if (ct === "professional" && meta.company) {
        id = `work:${meta.company}`;
      } else if (ct === "involvement") {
        const slug = (meta.involvement_slug as string) || (meta.slug as string);
        if (slug) id = `involvement:${slug}`;
      } else if (ct === "project") {
        const title = (meta.project_title as string) || (meta.title as string);
        if (title) {
          // If this "project" is actually an involvement (e.g. buildpurdue
          // still lives in the resume YAML under projects:), reroute to the
          // richer involvement card.
          const asInv = involvementTitleToSlug.get(title.toLowerCase());
          id = asInv ? `involvement:${asInv}` : `project:${title}`;
        }
      } else if (ct === "blog_post" && meta.slug) {
        id = `blog:${meta.slug}`;
      }
      return id ? idToIndex.get(id) : undefined;
    };
    const sourceChunksText = relevantMatches
      .slice(0, 10)
      .map((m, idx) => {
        const meta = m.metadata || {};
        const tag = (meta.content_type as string) || (meta.source_type as string) || "text";
        const attr: string[] = [];
        const related = chunkToDirectoryIndex(meta);
        if (related !== undefined) attr.push(`related=${related}`);
        if (meta.title) attr.push(`title=${JSON.stringify(meta.title)}`);
        if (meta.company) attr.push(`company=${JSON.stringify(meta.company)}`);
        if (meta.project_title) attr.push(`project=${JSON.stringify(meta.project_title)}`);
        if (meta.slug) attr.push(`slug=${JSON.stringify(meta.slug)}`);
        const header = `[chunk ${idx + 1} type=${tag}${attr.length ? " " + attr.join(" ") : ""}]`;
        const text = ((meta.text as string) || "").replace(/\s+/g, " ").trim();
        return `${header}\n${text}`;
      })
      .join("\n\n");

    const readableStream = new ReadableStream({
      async start(controller) {
        let replyText = "";
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (!delta) continue;
            replyText += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`),
            );
          }

          // Post-hoc citation extraction. Ask a cheap model to identify which
          // artifacts the finished reply actually talks about. This runs
          // AFTER the visible stream completes, so it adds one short round
          // trip of latency but doesn't block the reply.
          if (artifactDirectory.length > 0 && replyText.trim().length > 20) {
            try {
              const extractor = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `You pick the receipt cards that match what an assistant reply actually talks about, and attach a short annotation to each. Each card is identified by a NUMERIC INDEX from the DIRECTORY below. The annotation has two fields — "quote" (optional verbatim pull-quote) and "stance" (mandatory editorial caption). The website shows the quote when it passes validation, otherwise falls back to the stance. Because quote validation is strict and often fails, you MUST always provide a stance so the card never goes unannotated.

Each cited entry has these fields:
  "index":  REQUIRED — an integer that matches a [<index>] line in the DIRECTORY
  "quote":  OPTIONAL — a verbatim fragment from a SOURCE CHUNK (omit or set "" when no good quote exists)
  "stance": REQUIRED — a short editorial caption (always include, even when quote is provided)

Return JSON of the form:
{"cited":[
  {"index":7,"quote":"agents should discover tools at runtime, just by hitting a URL","stance":"His thesis in action"},
  {"index":2,"quote":"","stance":"Where he tests RL against real malware traffic"}
]}

Rules for inclusion:
- If the reply names a card by title, role, or company, include its index.
- If the reply describes the card's specific subject matter even without naming it, include it. Example: a reply that discusses "making MCP feel as simple as visiting a URL" is discussing the google-tools-mcp entry, even if that name never appears.
- A card whose blurb describes the exact idea, product, problem, or claim the reply is focused on should be cited.

Rules for exclusion:
- Don't cite a card that's only tangentially or topically similar (e.g. don't cite every AI project just because the reply mentions AI).
- Don't invent indexes. Only return integers that appear literally as [<index>] in the DIRECTORY below.
- If the reply doesn't substantively touch any card (refusal, generic answer, off-topic), return {"cited":[]}.

Writing the annotation — READ CAREFULLY. ALWAYS prefer "quote" over "stance".

"quote" field (preferred) — a VERBATIM fragment from the SOURCE CHUNKS:
- CRITICAL: the value of "quote" MUST appear as a CONTIGUOUS substring in one of the SOURCE CHUNKS below. The validator does a case-insensitive substring match; if it fails, your quote is silently dropped and the card falls back to the stance. Paraphrases, splices across chunks, and reworded fragments all fail. COPY. WORDS. EXACTLY.
- Do NOT wrap the value in quote marks yourself — the website adds those for display.
- Target 8–18 words. Hard max 22 words. You may trim the source sentence to start or end at a natural phrase boundary. Use an ellipsis "…" only at the very start or very end of the "quote" value, never in the middle.
- SOURCE PREFERENCE: if a SOURCE CHUNK has \`related=<N>\` in its header matching the index you're citing, prefer quoting from that chunk first — it's directly from this artifact's own source material. Chunks with no \`related=\` tag are meta-commentary; they're acceptable only if no directly-related chunk has a good line.
- IMPORTANT for work-role cards (entries labeled "<Role> at <Company>"): the card itself already displays the job's bullet list as its description. Do NOT quote one of those bullets verbatim — it would duplicate what's on the card. Instead, quote from a different chunk (opinions, narrative, blog post) that adds fresh perspective on the role, or skip the quote and use stance.
- Pick a fragment that adds something — Karthik's stance, a vivid claim, a sharp line. Skip flat descriptions ("He works on X at Y").

"stance" field (ALWAYS REQUIRED) — short editorial caption:
- ALWAYS include a stance for every cited entry, even when you also provide a quote. This is the safety net when quote validation fails.
- 4–8 words, max 10. Sentence fragment. No trailing period. NO quote marks.
- Answers "why is this receipt attached to THIS reply" — the artifact's role in the reply's argument.
- Starts with a noun phrase or preposition ("His…", "Where…", "The…", "What…"). Does NOT start with a number, year, or award name.
- Good: "His thesis in action" / "His most direct stance on this" / "Where he tested the idea" / "His argument, made in code"
- Bad: "200+ active users" / "Won Best Proof-of-Human" / "Since June 2025" — these are trophy/metric tags. The card already surfaces those. Skip them.

OMIT rule:
- If you cannot write an honest stance for a card, leave it out of "cited" entirely. No filler. (Almost every genuinely-cited card admits a stance — omission is rare.)

Ordering:
- Order by first meaningful reference in the reply (named or described).

DIRECTORY:
${directoryText}

SOURCE CHUNKS (pull quotes from here — \`related=N\` in a chunk header means that chunk came from directory entry [N]):
${sourceChunksText}`,
                  },
                  {
                    role: "user",
                    content: `REPLY:\n${replyText}\n\nReturn JSON now.`,
                  },
                ],
              });

              const raw = extractor.choices[0]?.message?.content || "{}";
              type CitedEntry = { id: string; annotation?: string };
              let citedEntries: CitedEntry[] = [];

              // Build a single haystack of all retrieved chunk text so we can
              // validate "quote" claims — the model sometimes paraphrases
              // when we asked for verbatim. If the claimed quote isn't in the
              // haystack (within a whitespace-normalized substring match), we
              // drop it back to just the id and let the card render without
              // annotation rather than show a fake quote.
              // Normalize unicode quote chars and whitespace so smart quotes
              // from the model still match plain text in the chunks.
              const normalizeForMatch = (s: string) =>
                s
                  .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
                  .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
                  .replace(/\u2026/g, "…")
                  .replace(/\s+/g, " ")
                  .toLowerCase();
              const quoteHaystack = normalizeForMatch(
                relevantMatches.map((m) => ((m.metadata?.text as string) || "")).join("\n"),
              );
              const normalizeNeedle = (q: string) =>
                normalizeForMatch(q).replace(/^["'…\s]+|["'…\s]+$/g, "").trim();
              // A quote is verbatim if every ellipsis-separated segment appears
              // as a substring in the haystack. Allows the model to trim with
              // mid-quote "…" as long as each piece is literal.
              const isVerbatim = (q: string) => {
                const cleaned = normalizeNeedle(q);
                if (cleaned.length < 6) return false;
                const segments = cleaned
                  .split("…")
                  .map((s) => s.trim())
                  .filter((s) => s.length >= 6);
                if (segments.length === 0) return false;
                return segments.every((seg) => quoteHaystack.includes(seg));
              };

              // Reject quotes for work: cards that are already visible on the
              // card as description bullets. Duplicating the bullet in the
              // annotation is redundant — the annotation should add something
              // the card doesn't already show.
              const allJobsForValidation = getJobsFromYaml();
              const isDuplicateOfWorkBullet = (id: string, q: string): boolean => {
                if (!id.startsWith("work:")) return false;
                const company = id.slice(5);
                const job = allJobsForValidation.find(
                  (j) => j.company.toLowerCase() === company.toLowerCase(),
                );
                if (!job || !job.description) return false;
                const needle = normalizeNeedle(q);
                if (needle.length < 6) return false;
                return job.description.some((b) => {
                  const hay = b.replace(/\s+/g, " ").toLowerCase();
                  return hay.includes(needle) || needle.includes(hay);
                });
              };

              // Coerce an extractor entry's index to a valid integer that
              // maps to a directory entry. Handles legacy "id" strings too in
              // case the model ignores the new contract.
              const resolveIndex = (item: unknown): number | null => {
                if (typeof item === "number" && indexToId.has(item)) return item;
                if (typeof item === "string") {
                  // Legacy: model returned a bare id string.
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
                // Legacy: model used "id" instead of "index".
                if (typeof rec.id === "string") {
                  const asIndex = idToIndex.get(rec.id);
                  if (asIndex !== undefined) return asIndex;
                }
                return null;
              };

              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.cited)) {
                  for (const item of parsed.cited) {
                    const index = resolveIndex(item);
                    if (index === null) continue;
                    const resolvedId = indexToId.get(index)!;

                    const rec =
                      typeof item === "object" && item !== null
                        ? (item as Record<string, unknown>)
                        : {};
                    const rawQuote =
                      typeof rec.quote === "string" ? rec.quote.trim() : "";
                    const rawStance =
                      typeof rec.stance === "string" ? rec.stance.trim() : "";
                    // Legacy single-field fallback
                    const rawWhy = typeof rec.why === "string" ? rec.why.trim() : "";

                    let annotation: string | undefined;
                    const quoteValid =
                      rawQuote &&
                      isVerbatim(rawQuote) &&
                      !isDuplicateOfWorkBullet(resolvedId, rawQuote);
                    if (quoteValid) {
                      // Real verbatim quote, not a repeat of a visible bullet.
                      const trimmed = rawQuote.replace(/^["""]+|["""]+$/g, "");
                      annotation = `\u201C${trimmed}\u201D`;
                    } else if (rawStance) {
                      annotation = rawStance;
                    } else if (rawWhy) {
                      annotation = rawWhy;
                    }
                    citedEntries.push({ id: resolvedId, annotation });
                  }
                }
              } catch {
                citedEntries = [];
              }

              const emittedIds = new Set<string>();
              const artifactsOut: Artifact[] = [];
              for (const entry of citedEntries) {
                const artifact = hydrateArtifactById(
                  entry.id,
                  retrievedBlogs,
                  entry.annotation,
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
                `🧾 Extractor cited: [${citedEntries
                  .map((e) => (e.annotation ? `${e.id} (${e.annotation})` : e.id))
                  .join(", ")}] → ${artifactsOut.length} artifact(s)`,
              );
            } catch (err) {
              console.error("Citation extractor failed:", err);
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
