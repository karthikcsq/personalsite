# AGENTS.md

Guidance for agents working in this repository.

## Overview

Karthik Thyagarajan's personal site: https://www.karthikthyagarajan.com, hosted on Vercel.

- `personalsite/`: the website (Next.js 16 App Router, React 19, TypeScript, CSS modules). Run npm commands here.
- `python-rag/`: the source documents the site reads (`rag-docs/`), plus the older Pinecone tooling.

The site is one long home page (the "Monolith" design) plus essay pages, note pages and a brief. There is no chatbot, gallery page or separate Work/Projects/About page any more; those URLs redirect into home-page sections (see `personalsite/next.config.ts`).

Next.js 16 differs from what you may remember. Read the matching guide in `personalsite/node_modules/next/dist/docs/` before touching framework APIs (see `personalsite/AGENTS.md`).

## Commands (from `personalsite/`)

- `npm run dev`: dev server. Over the tailnet: `DEV_ALLOWED_ORIGINS=<host> npx next dev -H 0.0.0.0 -p 3123`.
- `npm run build` / `npm start`: production build and serve.
- `npm run lint`: ESLint (flat config, `eslint-config-next`). Should be clean.
- `npm test`: Node tests in `tests/*.test.mjs`.
- `npx tsc --noEmit`: type check. Errors under `.next/types` are stale generated files; ignore them.

## Routes

- `/`: the home page. `src/app/page.tsx` reads the data and passes it to `src/app/_home/monolith/Monolith.tsx`. Its sections are, in order, an overture (a record to play), Writing, Work, Also, interests and photographs.
- `/blog/[slug]`: essays from `personalsite/blog/posts/`.
- `/notes/[kind]/[slug]`: one page per corpus file, plus `/raw` for the Markdown. Project notes show the project's video at the top and its links (from `projects.json` / `involvement.yaml`).
- `/brief`: the founder brief.
- `/feed.xml`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`.
- Redirects: `/work`, `/projects` and `/involvement` go to `/#work`; `/writing` and `/blog` to `/#writing`; `/notes` to `/#work`; `/gallery` to `/#photographs`; `/about` to `/`. Old `?item=kind:slug` links go to that item's note page. When you remove a route, add a redirect for it.
- `src/proxy.ts` serves the brief as Markdown to requests that explicitly prefer `text/markdown`.

## How the home page works

- **Code:** everything for the home page lives in `src/app/_home/`.
  - `monolith/`: layout and sections.
  - `exhibit/plates/`: the animated line drawing for each work item.
  - `sound/`: the waveform, the piano keys and the recording data.
  - `player/`: the site-wide player.
- **Work items:** each item's one-line description is in the `PLAN` table in `src/app/page.tsx`. A selected item opens in place, showing its line, "More →" (its note) and any extra link (`also`, e.g. the QKD paper).
- **Music player:** `player/Player.tsx` is mounted once in the root layout (via `components/ConditionalChrome.tsx`), so music keeps playing across pages. There is a single `<audio>` element; the home waveform and the docked rail (`monolith/Rail.tsx`) both read from it. Internal links must use `next/link` (the `Go` component does this), or the page reloads and the music stops.
- **Recordings:**
  - Data: listed with their waveform peaks in `sound/recitalPeaks.ts`.
  - Audio: the files live in S3 at `kt-personalsite.s3.us-east-2.amazonaws.com/media/recordings/`. The bucket allows public reads and CORS.
  - Override: `NEXT_PUBLIC_RECORDINGS_BASE` changes where they are loaded from.
  - Adding a recording: upload the `.m4a` file and add its entry, peaks and duration.
- **Page transitions:** React `ViewTransition` (`_home/PageTransition.tsx`; global CSS at the end of `globals.css`).
  - A work or essay title morphs into the page heading (`SharedTitle`).
  - The rail stays fixed.
  - CSS modules hash `view-transition-name`, so set it inline.
  - The morph only pairs with a prefetched page, so check it with a production build; `next dev` doesn't prefetch.
- **Back links:**
  - `components/BackLink.tsx` returns the visitor to the home-page section they came from, read from sessionStorage `mo-back`.
  - The `mo-return` key reopens the work item they left.
- **Photos:** resized copies in `public/media/photos/`, listed in `monolith/photos.ts`. Other images are in `public/media/shared/`.

## Content and data

- **Essays:** `personalsite/blog/posts/*.md`. Frontmatter is `title` and `date`, plus an optional `summary`. Raw HTML is allowed.
- **Corpus notes:** `python-rag/rag-docs/corpus/<kind>_<slug>.md`. `src/utils/notesUtils.ts` is the registry.
  - Kinds: project, work, involvement, topic.
  - `public: false` hides a note from the site.
  - Authoring rules are in `corpus/README.md`.
- **Work history:** `python-rag/rag-docs/karthik_thyagarajan_truth.yaml`.
- **Projects:** `src/data/projects.json` (links, videos, images).
- **Involvement and topics:** YAML under `python-rag/rag-docs/`.
- **Item ids** (`kind:slug`) are used by URLs, redirects and the home page. Keep them stable.

## Writing and design rules (from Karthik)

- Prose visitors read must be Karthik's own words, verbatim. Don't write taglines, bios or summaries for him. New copy only with his approval, or when he asks you to draft options.
- Upright type only, never italic. Fonts: Fraunces (display) and IBM Plex Mono, from `_home/fonts.ts`.
- Minimal and premium, showing rather than telling.
- Section headings use the large, light "chapter" style. No small numbered labels such as "01".
- No scroll-jacking, pinned banners, snap scrolling, or fades over photo rows.
- Recordings show only the composer and the piece.
- When offering design options, show at most three and recommend one.

## Environment

- `next.config.ts` loads the repo-root `.env`. Variables set in Vercel take precedence. Never print or commit credentials.
- The site itself needs no secrets. The optional variables are `NEXT_PUBLIC_RECORDINGS_BASE` and `DEV_ALLOWED_ORIGINS`.
- `python-rag/create-pinecone.py` still uses `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` and `OPENAI_API_KEY` (`uv sync`, then `uv run python create-pinecone.py`; `--reset` wipes the index after a confirmation prompt). The site no longer queries Pinecone.

## SEO

- `metadataBase` in `src/app/layout.tsx` is the production URL; relative canonicals resolve against it.
- Share cards: `opengraph-image.tsx` files, rendered through `src/lib/og/card.tsx`.
- JSON-LD:
  - Person and WebSite on the home page
  - BlogPosting on essays
  - Article on notes
- Keep these in step with the routes: `sitemap.ts`, `llms.txt`, `llms-full.txt`, and the inline index on the home page.
