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


<!-- Daily inconsequential PersonalSite README note 2026-10-20 #1: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #2: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #3: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #4: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #5: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #6: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #7: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #8: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #9: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #10: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #11: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #12: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #13: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #14: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #15: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #16: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #17: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #18: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #19: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-20 #20: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #1: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #2: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #3: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #4: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #5: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #6: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #7: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #8: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #9: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #10: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #11: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #12: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #13: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #14: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #15: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #16: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #17: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #18: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #19: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-21 #20: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #1: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #2: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #3: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #4: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #5: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #6: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #7: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #8: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #9: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #10: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #11: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #12: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #13: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #14: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #15: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #16: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #17: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #18: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #19: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-22 #20: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #1: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #2: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #3: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #4: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #5: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #6: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #7: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #8: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #9: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #10: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #11: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #12: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #13: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #14: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #15: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #16: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #17: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #18: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #19: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-23 #20: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-24 #1: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-24 #2: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-24 #3: This comment intentionally adds no product information. -->

<!-- Daily inconsequential PersonalSite README note 2026-10-24 #4: This comment intentionally adds no product information. -->
