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

      // Project-related keywords
      if (lowerQuery.includes('project') || lowerQuery.includes('projects') ||
          lowerQuery.includes('built') || lowerQuery.includes('developed') ||
          lowerQuery.includes('created') || lowerQuery.includes('work on')) {
        return { contentType: 'project' };
      }

      // Experience/work-related keywords
      if (lowerQuery.includes('experience') || lowerQuery.includes('job') ||
          lowerQuery.includes('work') || lowerQuery.includes('company') ||
          lowerQuery.includes('employer')) {
        return { contentType: 'professional' };
      }

      // Education-related keywords
      if (lowerQuery.includes('education') || lowerQuery.includes('school') ||
          lowerQuery.includes('university') || lowerQuery.includes('degree') ||
          lowerQuery.includes('study') || lowerQuery.includes('studied')) {
        return { contentType: 'academic' };
      }

      // Skills-related keywords
      if (lowerQuery.includes('skill') || lowerQuery.includes('skills') ||
          lowerQuery.includes('technology') || lowerQuery.includes('technologies') ||
          lowerQuery.includes('programming') || lowerQuery.includes('language')) {
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
      topK: 5,
      includeMetadata: true,
      ...(queryIntent?.contentType && {
        filter: {
          content_type: { $eq: queryIntent.contentType }
        }
      })
    };

    // Query Pinecone for similar documents
    let queryResponse = await index.query(queryParams);

    // If filtered search returns poor results, try without filter
    if (queryIntent && queryResponse.matches.length === 0) {
      console.log(`No results found for content_type: ${queryIntent.contentType}, retrying without filter`);
      queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
      });
    }

    // Extract contexts from search results with relevance scoring
    const relevantMatches = queryResponse.matches.filter(match => match.score && match.score > 0.75);
    const contexts = queryResponse.matches
      .map(match => match.metadata?.text as string)
      .filter(Boolean)
      .join("\n\n");

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
      systemPrompt = `You are an AI assistant helping visitors learn about Karthik Thyagarajan. You have access to information about Karthik's background, experience, projects, and blog posts.

Key guidelines:
- ALWAYS respond in third person (e.g., "Karthik has worked on...", "He graduated from...", "His experience includes...")
- NEVER use first person pronouns (I, me, my) when referring to Karthik
- Use the provided context to give accurate, helpful information
- Don't just repeat the context - synthesize it into natural, conversational responses
- Be friendly and engaging, as this represents Karthik's personal website
- If asked about something not in the context, politely redirect to what you do know about Karthik
${hasBlogContext ? `\n- When referencing blog content, cite it naturally with links in this format:\n  [Blog Title](https://www.karthikthyagarajan.com/blog/[slug])\n  Available blog posts: ${blogPosts.map(p => `"${p.title}" (slug: ${p.slug})`).join(', ')}` : ''}

Context about Karthik:
${contexts}`;
    } else {
      systemPrompt = `You are an AI assistant on Karthik Thyagarajan's website. While there isn't specific information to answer that exact question, you can help visitors learn about Karthik.

IMPORTANT: Always respond in third person (e.g., "Karthik has experience in...", "He studied...", "His work focuses on...").

You can provide information about:
- Karthik's background in computer science and AI/ML
- His work experience and projects
- His education and research interests
- His skills and expertise areas
- His blog posts and writings

Feel free to ask about any of these topics, or try rephrasing your question.`;
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
      model: "gpt-4o",
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
