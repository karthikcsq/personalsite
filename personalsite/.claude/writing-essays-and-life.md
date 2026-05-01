# Brainstorm: Essays + Life writing on the site

Status: in-progress design conversation. Not yet implemented.

## The question

Karthik wants to surface life content (travel, instruments, hobbies, personal reflections like "Coming to Purdue") on the site. Started as "should this be a chat artifact?", evolved into "I want a writing surface where essays and life writing are both visible."

## Direction (current consensus)

Rename `/blog` to `/writing`. One page. Two registers of content:

- **Essays** — arguments, takes, polished pieces. The existing blog content.
- **Life writing** — memoir, places, scenes. New content. Examples: "Brazil 2024", "Coming to Purdue", "Why I started playing piano."

Both are markdown posts in `blog/posts/*.md`. A new frontmatter field distinguishes them: `kind: essay | life` (defaults to `essay`).

## UX: pill-based filter, default to "All"

Layout:

```
/writing
+--------------------------------------+
| WRITING                              |
|                                      |
|  [ All ]  [ Essays ]  [ Life ]       |  <- pill, default "All"
|                                      |
|  ---                                 |
|  ESSAY · 2026-04                     |
|  Why I think X                       |
|  Short summary line that reads...    |
|  ---                                 |
|  LIFE · 2024-08                      |
|  Brazil                              |
|  Two weeks in Sao Paulo, learning... |
|  ---                                 |
|  ESSAY · 2026-03                     |
|  ...                                 |
+--------------------------------------+
```

Why pill (and not the alternatives we considered):

- **Two-column desktop layout** (essays left, life right): wastes ~35% of width on a section that's small relative to the essay list. Cramps essay titles. Two scroll regions on desktop. Responsive reorder needed on mobile.
- **Sectioned vertical (essays then life)**: Karthik's flag — "if I write more essays it'll be a really far scroll to get to the life." Life drifts below the fold as essays grow.
- **Two routes (/blog and /life)**: splits the IA. Forces a choice on arrival. Header gets heavier.
- **Pill with default "Essays"**: hides half the content behind a click. Bad.
- **Pill with default "All" (this plan)**: nothing hidden. Both kinds visible by first scroll because they're mixed chronologically with kind-labels per item. The pill becomes a *narrow*, not a *reveal*.

URLs: `/writing` (all), `/writing?kind=essays`, `/writing?kind=life`. Clean, SEO-friendly, deep-linkable.

## Implementation sketch (not finalized)

### Routes

- Move `src/app/blog/` → `src/app/writing/`.
- `next.config.ts` redirects: `/blog` → `/writing`, `/blog/:slug*` → `/writing/:slug*`. Keeps external links and old chat citations working.

### Content model

- One frontmatter field: `kind: essay | life`. Defaults to `essay` if omitted (so existing posts need zero changes).
- Life entries can carry the same fields essays already have (title, date, summary). Optional `photo` field if a thumbnail makes sense later.

### `/writing` index page

- Reads `getSortedPosts()` (already exists in `src/utils/blogUtils.ts`).
- Adds `kind` to the `BlogPost` interface, defaulting to `essay`.
- Default render: chronological mixed list, each item shows `<kind label> · <date>` + title + summary.
- Pill state stored in URL (`?kind=...`), client-side filter.

### Chat integration

- Posts of both kinds remain `blog:<slug>` artifacts in chat. Same `BlogArtifact` card.
- The system prompt's URL pattern (`/blog/[slug]`) needs updating to `/writing/[slug]`.
- The URL-parse regex in `src/app/api/chat/route.ts` (`scanPattern`) needs the same update — currently matches `/blog/`, needs to match `/writing/`.

## Open questions before coding

- **Header copy.** "Writing" / "Reading" / "Pieces"? Plan assumes "Writing".
- **Visual differentiation per kind in the mixed list.** Plan assumes a small mono kind-label per item ("ESSAY" / "LIFE"). Could go further (different typographic register per kind, italic for life), but v1 keeps it minimal.
- **Optional thumbnails on life entries.** Frontmatter supports `photo`, but render-side may or may not use it at v1. TBD.
- **Reverse-chronological by `date` is the default sort.** Confirm this is right for the mixed feed (alternative: pin recent essays to the top, then chronological).

## Earlier rejected directions (for context)

- **Life as a chat-only `note`-style artifact** (`topic:travel`, `topic:piano`). Rejected: framing was opinion-shaped, not memoir-shaped; carries no metadata or photo; PRODUCT.md says "show the work, not the marketing — receipts beat adjectives" and an opinion tile about Brazil is an adjective.
- **New `life` artifact kind with card-is-the-receipt** (no destination page). Rejected: Karthik wanted life writing to be *visible*, not hidden in chat receipts. The card pattern works for small data (a place + a meta + an excerpt) but didn't fit when life writing started looking like full essays.
- **Two-column desktop (essays | life) + stacked mobile.** Rejected: wastes width on the smaller section; pill is simpler and cleaner.

## Earlier work (now reverted)

The `life` artifact direction was partially implemented in this session before pivoting. All of those changes were reverted. The reverted files: `src/app/components/ChatArtifact.tsx`, `src/app/api/chat/route.ts`, `src/utils/lifeUtils.ts` (deleted), `python-rag/rag-docs/life.yaml` (deleted). Working tree is clean.
