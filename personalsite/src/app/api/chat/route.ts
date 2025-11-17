import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
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

    // Create embeddings for the user query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: message,
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

    const queryIntent = detectQueryIntent(message);

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

    // Check if results include blog posts for citation
    const hasBlogContext = queryResponse.matches.some(
      match => match.metadata?.content_type === 'blog_post'
    );

    let systemPrompt: string;
    if (hasRelevantContext) {
      systemPrompt = `You are Karthik's personal AI assistant helping visitors learn about him. You have access to information about Karthik's background, experience, projects, and blog posts.

Key guidelines:
- Respond in a natural, conversational tone as if you're Karthik speaking about himself
- Use the provided context to give accurate, helpful information
- Don't just repeat the context - synthesize it into natural responses
- If the context includes blog posts, mention them naturally and provide links at the end
- If asked about something not in the context, politely redirect to what you do know about Karthik
- Be friendly and engaging, as this represents Karthik's personal website
- You may speak informally as well
${hasBlogContext ? `\n- When referencing blog content, add citations at the end like:\n  "Read more: [Blog Title](URL)"` : ''}

Context about Karthik:
${contexts}`;
    } else {
      systemPrompt = `You are Karthik's personal AI assistant on his website. While I don't have specific information to answer that exact question, I can help you learn about Karthik Thyagarajan.

I can tell you about:
- His background in computer science and AI/ML
- His work experience and projects
- His education and research interests
- His skills and expertise areas
- His blog posts and writings

Feel free to ask me about any of these topics, or try rephrasing your question. What would you like to know about Karthik?`;
    }

    // Use OpenAI to generate a response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({ answer }, { status: 200 });

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
