# AGENTS.md

Guidance for agents working in this repository. The redesign starts from checkpoint `9a775a3` (`feat: checkpoint minimal living corpus redesign`).

## Overview

Karthik Thyagarajan's personal portfolio uses Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4. The website package lives in `personalsite/`; run npm commands there. The repository also contains Python tools and source documents in `python-rag/`. The production site is https://www.karthikthyagarajan.com and is hosted on Vercel.

The public experience is the minimal living corpus. Its four sections are Work, Projects, Writing, and Involvement, with About and Photos as separate pages. All public pages use the same white field, sun/branch environment, winter-night mode, and eclipse interaction. There is no public chat UI or `/api/chat` endpoint, and no prompt-specific `/api/og` endpoint.

## Development

- `npm run dev` — local Next.js development server.
- `npm run build` — production compilation, TypeScript checks, and static generation.
- `npm start` — serve the production build.
- `npm test` — Node tests in `tests/*.test.mjs`.
- `npx tsc --noEmit` — standalone TypeScript check.
- The inherited `npm run lint` script uses `next lint`, which is unsupported in Next.js 16.
- Read applicable Next.js guides in `personalsite/node_modules/next/dist/docs/` before changing routing or framework APIs; `personalsite/AGENTS.md` also contains Next.js guidance.

## Public routes and presentation

- `src/app/page.tsx` resolves `?section=` and `?item=` on the server so direct links render the correct view immediately. It renders `living-corpus-draft/LivingCorpusClient.tsx`; the component directory name is historical, and the `/living-corpus-draft` route redirects home.
- `src/lib/living-corpus/minimalTypes.ts` defines visible categories and reader data. `minimalHomepage.ts` builds those items from the corpus, blog posts, projects, and involvement data.
- `src/lib/living-corpus/links.ts` builds item URLs. Use it rather than linking to section-list anchors.
- `/work`, `/projects`, `/involvement`, `/blog`, and `/notes` permanently redirect to the corresponding homepage section. Anchored section bookmarks resolve to their matching items in the client.
- `/blog/[slug]` and `/notes/[kind]/[slug]` retain their canonical URLs and full content, rendered with `CorpusArticle` and `MinimalInterior`. Note source links open the matching corpus item.
- About and Photos also use `MinimalInterior`. Shared navigation lives in `CorpusNavigation` and `SiteHeader`; page transitions use `CorpusPageTransition`.
- `ConditionalChrome` renders the global achievements panel without a separate navigation system or botanical frame.
- `/a2ui-draft` redirects home. Historical A2UI components/utilities remain in source but are not a public experience.
- The branded `not-found.tsx` handles missing pages, including unknown blog posts.
- `opengraph-image.tsx`, blog-specific Open Graph images, `og-brand.tsx`, and `icon.svg` share the redesign's visual identity.
- `sitemap.ts`, `/llms.txt`, `/llms-full.txt`, and the inline homepage index must reflect current destinations. Middleware serves the markdown index to programmatic root requests while preserving HTML for browsers, search engines, and link-preview crawlers.

## Content and data

- Blog posts live in `personalsite/blog/posts/` with `title`, `date`, and optional `summary` frontmatter. `src/utils/blogUtils.ts` uses gray-matter and remark. Trusted authored Markdown can contain raw HTML.
- Personal and work data live in `python-rag/rag-docs/karthik_thyagarajan_truth.yaml`. Work entries require `role`, `company`, `start_date`, `end_date`, and `bullets`.
- Corpus notes live in `python-rag/rag-docs/corpus/` as `<kind>_<slug>.md`. `notesUtils.ts` publishes public notes, their raw Markdown routes, and links to their source items. Honor `public: false`.
- Projects are defined in `src/data/projects.json` and typed by `projectsData.ts`. Preserve outbound links, demo embeds, and images in the reader; media precedes Contents.
- Work and involvement utilities parse YAML. Keep corpus identity stable because item URLs, coverage, and achievements refer to those IDs.
- Session state and achievements are managed by `visitState.ts` and `achievements.ts`. Compatibility maps the former Ideas category to Writing. Keep reset, reduced-motion, storage-unavailable, keyboard, and touch behavior working.

## Photos

- `/api/gallery` uses the server-only `galleryIndex.ts` to list S3 album objects, with caching and request deduplication.
- Images use `next/image` responsive optimization in both the grid and lightbox.
- S3 host: `kt-personalsite.s3.us-east-2.amazonaws.com`; allowed paths are `/galleryimgs/**` and `/blog/**` in `next.config.ts`.

## AI and document tooling

- Live AI routes are under `/api/living-corpus/` (attend, journey, what-broke). Keep portfolio exploration useful without an AI request.
- `python-rag/` retains document/vector-management tools. Run `uv sync` there to install dependencies, and `uv run python create-pinecone.py` for incremental updates. `--reset` deletes vectors and requires confirmation.
- Root `.env` is loaded by `next.config.ts`; deployed environment variables take precedence. Do not print or commit credentials.
- Python vector setup uses `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, and `OPENAI_API_KEY`. Live AI integrations may use OpenAI and TypeSafe configuration; check their route code for the exact variables.
- Shared rate-limiting helpers use Upstash or Vercel KV environment variables. Their historical chat naming does not imply a public chat endpoint.

## Code constraints

- API handlers use named HTTP method exports and Next.js App Router conventions, never default handler exports.
- TypeScript is strict; `@/*` resolves to `personalsite/src/*`.
- Preserve the minimal visual system across every public route, metadata image, error page, and content link. Do not restore the retired chat or alternate prototype interfaces.
