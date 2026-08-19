# PersonalSite

> My personal website and supporting scripts for docs & Pinecone integration.

## 🚀 Live Demo

[www.karthikthyagarajan.com](https://www.karthikthyagarajan.com)

## 🧩 Technologies

- **Frontend**: Next.js • React • TypeScript • Tailwind CSS  
- **Docs**: Markdown under `rag-docs/`  
- **Scripts**: Python 3.8+ (`create-pinecone.py`, `testing.py`)  
- **Hosting**: Vercel (for the site), Pinecone (vector index)

> A concise feature overview of each page and shared components in this Next.js project.

## 🚀 Pages & Features

### Home (`/`)
- **Chat interface** powered by OpenAI & Pinecone RAG  
  - Client-side form to submit questions  
  - `POST /api/chat` embeds your query, retrieves top-K contexts, and returns the LLM’s answer  
  - Messages rendered with ReactMarkdown  
- First-time “menu guide” tooltip (persisted in `localStorage`)  
- Auto-scroll to bottom on new messages  

### About (`/about`)
- Responsive split layout:  
  - **Desktop**: fixed left panel with your name; scrollable bio/quote/contact on the right  
  - **Mobile**: single-column stacked view  
- “Scroll to quote” arrow using `scrollToCenter`  
- Highlights roles, interests, and an email call-to-action  

### Blog Index (`/blog`)
- **Static build** via `getSortedPosts()` in `blogUtils.ts`  
- Lists posts with: title (links to `/blog/[slug]`), date, and two-line summary  

### Blog Post (`/blog/[slug]`)
- Dynamic route rendering Markdown content (e.g. from `rag-docs/`)  
- SEO metadata via `generateMetadata()`  
- Displays title, date, and full post content  

### Gallery (`/gallery`)
- Client component fetches album→images JSON from `/api/gallery`  
- Detects mobile vs. desktop for responsive layout  
- Uses **Embla** + `next/image` for each folder’s carousel  
- “Scroll to images” arrow via `scrollToCenter`  

### Projects (`/projects`)
- Animated **Framer Motion** cards for each project:  
  - **Verbatim**, **FORMulator**, **QKD**, **K-means SOM**, **Quantum Racer**  
  - Embeds (YouTube, PDFs), GitHub links, and custom styling per card  
- “Scroll down” arrow at top  

### Work (`/work`)
- Timeline of roles defined in a `jobs` array  
- Cards include title, company, dates, bullet-point achievements, icons, and color themes  
- Fade-in animations on scroll (Framer Motion)  
- Animated radial-gradient background & vertical timeline line 

