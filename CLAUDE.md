# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio website for Karthik Thyagarajan built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4. Features a RAG-powered chatbot using OpenAI and Pinecone for Q&A about the portfolio owner. Hosted on Vercel with images on AWS S3.

Live site: https://www.karthikthyagarajan.com

## Project Structure

```
personalsite/
├── src/
│   ├── app/                    # Next.js 15 App Router pages & API routes
│   │   ├── page.tsx            # Home page with RAG chatbot
│   │   ├── about/              # About page with bio
│   │   ├── blog/               # Blog index and [slug] routes
│   │   ├── gallery/            # Photo gallery with Embla carousel
│   │   ├── projects/           # Projects showcase with Framer Motion
│   │   ├── work/               # Work timeline
│   │   ├── components/         # Shared React components
│   │   └── api/                # App Router API route handlers
│   │       ├── chat/           # RAG chatbot endpoint (POST)
│   │       │   └── route.ts
│   │       └── gallery/        # S3 gallery data endpoint (GET)
│   │           └── route.ts
│   └── utils/                  # Utility functions
│       ├── blogUtils.ts        # Markdown blog post loading
│       ├── jobUtils.ts         # YAML work experience parser
│       └── scrollUtils.ts      # Smooth scroll helpers
├── blog/posts/                 # Markdown blog posts with frontmatter
├── rag-docs/                   # Documents for RAG system (YAML, TXT)
├── create-pinecone.py          # Script to populate Pinecone vector DB
└── testing.py                  # Pinecone connection testing
```

## Development Commands

### Next.js
- **Development**: `npm run dev` (starts on http://localhost:3000)
- **Build**: `npm run build`
- **Production**: `npm start`
- **Lint**: `npm run lint`

### Python Scripts (RAG Setup)
- **Populate Pinecone**: `python create-pinecone.py`
  - Requires `.env` with: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `OPENAI_API_KEY`, `GITHUB_TOKEN` (optional), `GITHUB_USERNAME` (optional)
  - Loads documents from `rag-docs/` directory
  - Chunks text (500 chars, 50 overlap) and uploads embeddings to Pinecone
  - GitHub repo integration is currently commented out (lines 301-303)

## Architecture & Key Patterns

### Data Flow for RAG Chatbot
1. **User Input** → Home page (`src/app/page.tsx`) sends POST to `/api/chat`
2. **API Route** (`src/app/api/chat/route.ts`) embeds query using OpenAI text-embedding-ada-002
3. **Intent Detection** → Analyzes query for content type (project/experience/education/skills) to apply metadata filters
4. **Vector Search** → Queries Pinecone for top-5 relevant document chunks (score > 0.75 threshold)
5. **LLM Response** → GPT-3.5-turbo generates conversational answer with retrieved context
6. **Client Render** → ReactMarkdown displays formatted response with custom styling

### Blog System
- Static generation at build time via `getSortedPosts()` in `blogUtils.ts`
- Markdown files in `blog/posts/` with gray-matter frontmatter (title, date, summary)
- `remark` + `remark-html` for Markdown→HTML conversion with `sanitize: false`
- Dynamic routes: `/blog/[slug]` with `generateMetadata()` for SEO

### Work Timeline
- Single source of truth: `rag-docs/karthik_thyagarajan_truth.yaml`
- `jobUtils.ts` parses YAML experience entries → JobEntry interface
- Deterministic color palette (7 colors cycling) and icon mapping
- Fallback resolution: checks `__dirname`, `process.cwd()/rag-docs`, `../rag-docs`

### Gallery
- Images hosted on AWS S3: `kt-personalsite.s3.us-east-2.amazonaws.com/galleryimgs/**`
- `next.config.ts` configures `remotePatterns` for S3 access
- `/api/gallery` endpoint (`src/app/api/gallery/route.ts`) uses AWS SDK with Cognito Identity Pool to list S3 objects
- Returns JSON mapping album names to photo URL arrays
- Client-side Embla carousel for each album

### Styling
- Tailwind CSS 4 with PostCSS (`@tailwindcss/postcss`)
- `@tailwindcss/typography` for prose styling in blog posts
- Custom animations via Framer Motion (projects page)
- Path alias: `@/*` → `./src/*` (configured in `tsconfig.json`)

## Environment Variables

Required in `.env.local` (not tracked in git):
- `PINECONE_API_KEY` - Pinecone vector database
- `PINECONE_INDEX_NAME` - Name of Pinecone index
- `OPENAI_API_KEY` - OpenAI API for embeddings and chat completions
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 gallery images (if needed server-side)
- `NEXT_PUBLIC_*` - Any client-side env vars

## Important Constraints

1. **Blog Posts**: Must have frontmatter with `title`, `date`, and optionally `summary`
2. **Work YAML**: Experience entries require `role`, `company`, `start_date`, `end_date`, `bullets`
3. **S3 Images**: Must match hostname `kt-personalsite.s3.us-east-2.amazonaws.com` and path `/galleryimgs/**`
4. **API Routes**: Use Next.js 15 App Router pattern - route handlers in `src/app/api/*/route.ts` files
   - Export named HTTP method functions (GET, POST, etc.)
   - Use `NextRequest` and `NextResponse` from `next/server`
   - No default exports for route handlers

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`

## Notes for Development

- **API Routes**: Implemented using Next.js 15 App Router pattern in `src/app/api/`
  - `/api/chat` - POST endpoint for RAG-powered chatbot
  - `/api/gallery` - GET endpoint for S3 gallery data
- **RAG System**: Three-stage pipeline:
  1. Embedding: OpenAI text-embedding-ada-002
  2. Retrieval: Pinecone vector search with intent-based filtering
  3. Generation: GPT-3.5-turbo with dynamic system prompts
- **Blog Markdown**: Processed server-side with `sanitize: false`, allowing raw HTML in posts
- **Work Experience**: Data duplicated between `rag-docs/` (for RAG embeddings) and read directly by `jobUtils.ts` (for timeline display)
