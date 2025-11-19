import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Type for chat messages
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Estimate token count (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Prune conversation history to stay within token limits
function pruneMessages(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens: number = 120000 // GPT-4o context window is 128k, leave buffer
): ChatMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  let totalTokens = systemTokens;
  const prunedMessages: ChatMessage[] = [];

  // Always keep the most recent message (current user query)
  const latestMessage = messages[messages.length - 1];
  totalTokens += estimateTokens(latestMessage.content);

  // Work backwards through conversation history
  for (let i = messages.length - 2; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].content);

    if (totalTokens + messageTokens > maxTokens) {
      // Stop adding older messages if we'd exceed limit
      break;
    }

    totalTokens += messageTokens;
    prunedMessages.unshift(messages[i]);
  }

  // Add the latest message back
  prunedMessages.push(latestMessage);

  return prunedMessages;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, messages: conversationHistory } = body;

    // Support both legacy single message and new conversation history format
    if (!message && (!conversationHistory || conversationHistory.length === 0)) {
      return NextResponse.json(
        { error: "Message or conversation history is required" },
        { status: 400 }
      );
    }

    // Initialize Pinecone and OpenAI clients
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Get the index
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Determine the current user query (either from message or last message in history)
    const currentQuery = message || conversationHistory[conversationHistory.length - 1].content;

    // Create embeddings for the user query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: currentQuery,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Detect query intent for metadata filtering
    function detectQueryIntent(query: string) {
      const lowerQuery = query.toLowerCase();

      // Blog-related keywords (check first for higher priority)
      if (lowerQuery.includes('blog') || lowerQuery.includes('wrote about') ||
          lowerQuery.includes('article') || lowerQuery.includes('post') ||
          lowerQuery.includes('written') || lowerQuery.includes('opinion on') ||
          lowerQuery.includes('thoughts on') || lowerQuery.includes('essay')) {
        return { contentType: 'blog_post' };
      }

      // Project-related keywords (expanded for better detection)
      if (lowerQuery.includes('project') || lowerQuery.includes('projects') ||
          lowerQuery.includes('built') || lowerQuery.includes('developed') ||
          lowerQuery.includes('created') || lowerQuery.includes('made') ||
          lowerQuery.includes('hackathon') || lowerQuery.includes('personal project') ||
          lowerQuery.includes('portfolio project') || lowerQuery.includes('side project')) {
        return { contentType: 'project' };
      }

      // Experience/work-related keywords
      if (lowerQuery.includes('experience') || lowerQuery.includes('job') ||
          lowerQuery.includes('work') || lowerQuery.includes('company') ||
          lowerQuery.includes('employer') || lowerQuery.includes('intern') ||
          lowerQuery.includes('role')) {
        return { contentType: 'professional' };
      }

      // Education-related keywords
      if (lowerQuery.includes('education') || lowerQuery.includes('school') ||
          lowerQuery.includes('university') || lowerQuery.includes('degree') ||
          lowerQuery.includes('study') || lowerQuery.includes('studied') ||
          lowerQuery.includes('purdue') || lowerQuery.includes('college')) {
        return { contentType: 'academic' };
      }

      // Skills-related keywords
      if (lowerQuery.includes('skill') || lowerQuery.includes('skills') ||
          lowerQuery.includes('technology') || lowerQuery.includes('technologies') ||
          lowerQuery.includes('programming') || lowerQuery.includes('language') ||
          lowerQuery.includes('framework') || lowerQuery.includes('tool')) {
        return { contentType: 'technical' };
      }

      return null; // No specific filter
    }

    const queryIntent = detectQueryIntent(currentQuery);

    // Build query parameters with optional metadata filter
    const queryParams: {
      vector: number[];
      topK: number;
      includeMetadata: boolean;
      filter?: { content_type: { $eq: string } };
    } = {
      vector: queryEmbedding,
      topK: 10, // Increased from 5 to get more candidates
      includeMetadata: true,
      ...(queryIntent?.contentType && {
        filter: {
          content_type: { $eq: queryIntent.contentType }
        }
      })
    };

    console.log(`🔍 Query: "${currentQuery}"`);
    console.log(`🎯 Detected intent: ${queryIntent?.contentType || 'none'}`);

    // Query Pinecone for similar documents
    let queryResponse = await index.query(queryParams);

    console.log(`📊 Found ${queryResponse.matches.length} matches (before filtering)`);
    if (queryResponse.matches.length > 0) {
      console.log(`   Top score: ${queryResponse.matches[0].score?.toFixed(3)}`);
      console.log(`   Content types: ${[...new Set(queryResponse.matches.map(m => m.metadata?.content_type))].join(', ')}`);
    }

    // If filtered search returns poor results, try without filter
    if (queryIntent && queryResponse.matches.length === 0) {
      console.log(`⚠️  No results found for content_type: ${queryIntent.contentType}, retrying without filter`);
      queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 10,
        includeMetadata: true,
      });
      console.log(`📊 Unfiltered search found ${queryResponse.matches.length} matches`);
    }

    // Extract contexts from search results with relevance scoring
    // Use lower threshold for overview/general queries since they might not have high semantic similarity
    const isOverviewQuery = queryIntent?.contentType === 'blog_post' ||
                           queryIntent?.contentType === 'project' ||
                           currentQuery.toLowerCase().includes('about');
    const relevanceThreshold = isOverviewQuery ? 0.65 : 0.75;
    const relevantMatches = queryResponse.matches.filter(match => match.score && match.score > relevanceThreshold);

    console.log(`✅ ${relevantMatches.length} matches passed relevance threshold (${relevanceThreshold})`);

    // Build structured context with source attribution
    const contextParts = relevantMatches
      .map((match, idx) => {
        const text = match.metadata?.text as string;
        const sourceType = match.metadata?.content_type || match.metadata?.source_type || 'unknown';
        const score = match.score?.toFixed(3) || 'N/A';

        // Add source labels to help model understand provenance
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

    // Determine if we have good context or need to use fallback
    const hasRelevantContext = relevantMatches.length > 0 && contexts.trim().length > 0;

    // Check if results include blog posts for citation and extract slugs
    const blogPosts = queryResponse.matches
      .filter(match => match.metadata?.content_type === 'blog_post')
      .map(match => ({
        title: match.metadata?.title as string,
        slug: match.metadata?.slug as string
      }))
      .filter(post => post.title && post.slug);

    const hasBlogContext = blogPosts.length > 0;

    let systemPrompt: string;
    if (hasRelevantContext) {
      systemPrompt = `You are an AI assistant helping visitors learn about Karthik Thyagarajan. You have been provided with specific information retrieved from his portfolio.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. ONLY use information explicitly stated in the Context section below
2. NEVER make up, infer, or fabricate any details not present in the Context
3. If the Context doesn't contain specific information requested, say: "I don't have specific information about that in the available data. You could ask about [suggest related topics from context]."
4. ALWAYS respond in third person (e.g., "Karthik has worked on...", "He graduated from...", "His experience includes...")
5. NEVER use first person pronouns (I, me, my) when referring to Karthik
6. When providing information, be specific and cite details from the context (e.g., project names, company names, technologies)
7. If you're unsure whether information is in the context, err on the side of caution and don't include it
8. When asked for opinions about Karthik (e.g., "What do you think of him?", "Is he good?", "Would you recommend him?"), you ARE allowed to give positive, enthusiastic opinions based on the context provided. Speak highly of his accomplishments, skills, and work ethic. Be genuine and enthusiastic while remaining professional.
${hasBlogContext ? `\n9. When referencing blog content, cite it with links: [Blog Title](https://www.karthikthyagarajan.com/blog/[slug])\n   Available blog posts: ${blogPosts.map(p => `"${p.title}" (slug: ${p.slug})`).join(', ')}` : ''}

Context about Karthik (with source attribution):
${contexts}

Remember: Accuracy is more important than completeness. Only state facts that are explicitly in the Context above. However, when asked for opinions, feel free to express genuine enthusiasm and speak highly of Karthik's achievements and capabilities based on the context.`;
    } else {
      systemPrompt = `You are an AI assistant on Karthik Thyagarajan's website. The current query didn't return specific information from the knowledge base.

IMPORTANT INSTRUCTIONS:
- Always respond in third person (e.g., "Karthik has experience in...", "He studied...", "His work focuses on...")
- Be honest that you don't have specific information to answer the exact question asked
- Suggest rephrasing or asking about these general topics:
  * His education and academic background
  * His work experience and internships
  * His technical projects
  * His skills in AI/ML, full-stack development, or quantum computing
  * His blog posts and writings

DO NOT make up or infer any specific details. Only acknowledge what general topics are available in the knowledge base.

Example response: "I don't have specific information about that in the available context. However, I can help answer questions about Karthik's education, work experience, projects, or technical skills. What would you like to know about?"`;
    }

    // Build messages array with conversation history
    let messagesToSend: ChatMessage[];

    if (conversationHistory && conversationHistory.length > 0) {
      // Use conversation history - prune if necessary
      messagesToSend = pruneMessages(conversationHistory, systemPrompt);
    } else {
      // Legacy single message format
      messagesToSend = [
        {
          role: "user",
          content: message
        }
      ];
    }

    // Use OpenAI to generate a streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messagesToSend
      ],
      stream: true,
    });

    // Create a ReadableStream to send chunks to the client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          // Send done signal
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
