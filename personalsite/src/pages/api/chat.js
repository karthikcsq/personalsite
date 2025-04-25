import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// Export a default function for Pages Router API routes
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Initialize Pinecone and OpenAI clients
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Get the index
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    
    // Create embeddings for the user query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: message,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Query Pinecone for similar documents
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });
    
    // Extract contexts from search results
    const contexts = queryResponse.matches.map(match => match.metadata.text).join("\n\n");
    
    if (!contexts || queryResponse.matches.length === 0) {
      return res.status(200).json({ 
        answer: "I don't have enough information to answer that question. Could you try asking something else?" 
      });
    }
    
    // Use OpenAI to generate a response based on the context
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Answer the user's question based only on the following context:\n\n${contexts}`
        },
        {
          role: "user",
          content: message
        }
      ],
    });
    
    const answer = completion.choices[0].message.content;
    
    return res.status(200).json({ answer });
  
  } catch (error) {
    console.error("Error in chat API:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}