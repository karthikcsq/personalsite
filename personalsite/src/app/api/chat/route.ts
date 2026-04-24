import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import bm25Model from "@/data/bm25-model.json";
import { getJobsFromYaml } from "@/utils/jobUtils";
import { findProjectByTitle } from "@/utils/projectUtils";

// Type for chat messages
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Artifact payload sent to client for dynamic component rendering
type Artifact =
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
        bullets: string[];
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
    };

interface PineconeMatch {
  id?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

function extractArtifacts(matches: PineconeMatch[], limit = 3): Artifact[] {
  // Build an artifact per match in the order provided, deduplicating by kind+key.
  // Caller controls ordering (intent-weighted) and which matches are eligible.
  const jobs = getJobsFromYaml();
  const seen = new Set<string>();
  const out: Artifact[] = [];

  for (const match of matches) {
    if (out.length >= limit) break;
    const meta = match.metadata || {};
    const contentType = meta.content_type as string | undefined;
    let artifact: Artifact | null = null;
    let kind: Artifact["kind"] | null = null;

    if (contentType === "professional") {
      const company = (meta.company as string) || "";
      if (!company) continue;
      const job = jobs.find(
        (j) =>
          j.company.toLowerCase() === company.toLowerCase() ||
          j.company.toLowerCase().includes(company.toLowerCase()),
      );
      if (!job) continue;
      kind = "work";
      artifact = {
        kind,
        id: `work:${job.company}`,
        data: {
          role: job.title,
          company: job.company,
          year: job.year,
          description: job.description,
          icon: job.icon,
        },
      };
    } else if (contentType === "project") {
      const title = (meta.project_title as string) || (meta.title as string) || "";
      if (!title) continue;
      const project = findProjectByTitle(title);
      if (!project) continue;
      kind = "project";
      artifact = {
        kind,
        id: `project:${project.title}`,
        data: {
          title: project.title,
          tools: project.tools,
          date: project.date,
          link: project.link,
          bullets: project.bullets,
        },
      };
    } else if (contentType === "blog_post") {
      const title = (meta.title as string) || "";
      const slug = (meta.slug as string) || "";
      if (!title || !slug) continue;
      kind = "blog";
      const text = (meta.text as string) || "";
      const excerpt = text.slice(0, 220).replace(/\s+/g, " ").trim();
      artifact = { kind, id: `blog:${slug}`, data: { title, slug, excerpt } };
    }

    if (!artifact || !kind) continue;
    if (seen.has(artifact.id)) continue;
    seen.add(artifact.id);
    out.push(artifact);
  }

  return out;
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
        content: `You are a search query optimizer for a portfolio website about Karthik Thyagarajan. Given a user's message and recent conversation context, produce a single search query optimized for semantic retrieval from a vector database.

Rules:
- Expand vague references like "that", "it", "his latest" using conversation context
- Include the full name "Karthik Thyagarajan" if the query is about him
- Include specific keywords: company names, project names, technologies, role titles
- If the user asks "tell me more about that", figure out what "that" refers to from context
- Output ONLY the search query, nothing else
- Keep it under 40 words`
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

    // Step 4: Filter by relevance threshold
    const relevanceThreshold = 0.45;
    const relevantMatches = queryResponse.matches.filter(
      match => match.score && match.score > relevanceThreshold
    );

    console.log(`✅ ${relevantMatches.length} matches passed threshold (${relevanceThreshold})`);

    // Build structured context with source attribution
    const contextParts = relevantMatches
      .map((match, idx) => {
        const text = match.metadata?.text as string;
        const sourceType = match.metadata?.content_type || match.metadata?.source_type || 'unknown';
        const score = match.score?.toFixed(3) || 'N/A';

        let sourceLabel = `Source ${idx + 1} [${sourceType}, relevance: ${score}]`;
        if (match.metadata?.title) {
          sourceLabel += ` - "${match.metadata.title}"`;
        } else if (match.metadata?.company) {
          sourceLabel += ` - ${match.metadata.company}`;
        } else if (match.metadata?.project_title) {
          sourceLabel += ` - ${match.metadata.project_title}`;
        }

        return `${sourceLabel}:\n${text}`;
      })
      .filter(Boolean);

    const contexts = contextParts.join("\n\n---\n\n");

    const hasRelevantContext = relevantMatches.length > 0 && contexts.trim().length > 0;

    // Extract blog posts for citation
    const blogPosts = queryResponse.matches
      .filter(match => match.metadata?.content_type === 'blog_post')
      .map(match => ({
        title: match.metadata?.title as string,
        slug: match.metadata?.slug as string
      }))
      .filter(post => post.title && post.slug);

    const hasBlogContext = blogPosts.length > 0;

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
- Blog: https://www.karthikthyagarajan.com/blog
- Gallery: https://www.karthikthyagarajan.com/gallery
When someone asks for a resume, link to the Projects or Work Experience page. Use these links naturally in your responses.
When discussing projects, ALWAYS include any GitHub, Devpost, arXiv, npm, or other links that appear in the retrieved Context. Use markdown link format.

RULES:
1. ONLY use information from the Context below. Never fabricate details.
2. ALWAYS speak in third person ("Karthik has...", "He built...", "His work includes...").
3. If the Context doesn't cover what's being asked, say so honestly and suggest related topics you can help with.
4. Be specific: cite project names, company names, technologies, and numbers from the context.
5. When asked for opinions about Karthik, be genuinely enthusiastic about his accomplishments. He's impressive and you should say so.
6. Keep responses concise and conversational. Don't dump everything you know. Answer what was asked.
${hasBlogContext ? `7. Cite blog posts as links: [Title](https://www.karthikthyagarajan.com/blog/[slug])\n   Available: ${blogPosts.map(p => `"${p.title}" (slug: ${p.slug})`).join(', ')}` : ''}

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
- Blog: https://www.karthikthyagarajan.com/blog
- Gallery: https://www.karthikthyagarajan.com/gallery
When someone asks for a resume, link to the Projects or Work Experience page. Use these links naturally in your responses.

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

    // Run dedicated per-kind retrieval to guarantee artifact diversity.
    // The main RAG retrieval can be dominated by one content type (often blog posts),
    // so we query separately with a metadata filter for each artifact-worthy kind.
    const ARTIFACT_KINDS = [
      { filter: { content_type: "professional" }, topK: 3 },
      { filter: { content_type: "project" }, topK: 3 },
      { filter: { content_type: "blog_post" }, topK: 3 },
    ];

    // Dedicated per-kind retrieval. Hybrid BM25+dense scores differ by orders of
    // magnitude across content types so we rank WITHIN each kind, then order kinds
    // by query intent rather than raw score.
    const perKindResults = await Promise.all(
      ARTIFACT_KINDS.map((k) =>
        index
          .query({
            vector: queryEmbedding,
            sparseVector: sparseQuery.indices.length > 0 ? sparseQuery : undefined,
            topK: k.topK,
            includeMetadata: true,
            filter: k.filter,
          })
          .catch((e) => {
            console.error(`Filter ${JSON.stringify(k.filter)} failed:`, e);
            return { matches: [] as PineconeMatch[] };
          }),
      ),
    );

    const q = currentQuery.toLowerCase();
    const intentOrder: Array<"work" | "project" | "blog"> = (() => {
      const work = /\b(work|job|role|company|companies|employer|intern|internship|experience|career|hire|employ)/.test(q);
      const project = /\b(project|built|building|build|made|create|created|ship|shipped|hack)/.test(q);
      const writing = /\b(write|writing|wrote|blog|post|think|thought|essay|article|read)/.test(q);
      if (work) return ["work", "project", "blog"];
      if (project) return ["project", "work", "blog"];
      if (writing) return ["blog", "project", "work"];
      return ["project", "work", "blog"];
    })();

    const topPerKind: Record<string, PineconeMatch | undefined> = {
      work: (perKindResults[0].matches as PineconeMatch[])[0],
      project: (perKindResults[1].matches as PineconeMatch[])[0],
      blog: (perKindResults[2].matches as PineconeMatch[])[0],
    };

    const orderedMatches = intentOrder
      .map((k) => topPerKind[k])
      .filter((m): m is PineconeMatch => !!m);

    const artifacts = extractArtifacts(orderedMatches, 3);
    console.log(
      `🎨 Intent: ${intentOrder.join(">")}  Emitting ${artifacts.length} artifact(s): ${artifacts
        .map((a) => a.kind)
        .join(", ")}`,
    );

    // Generate streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-5.3-chat-latest",
      messages: [
        { role: "system", content: systemPrompt },
        ...messagesToSend
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Emit artifacts as the first event so client can render the panel immediately
          if (artifacts.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ artifacts })}\n\n`),
            );
          }
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
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
