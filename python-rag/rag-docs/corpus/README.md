# Corpus

Karthik's own prose about each artifact, authored via `/quote-harvest`. Two
consumers read these files:

1. **The chatbot.** `create-pinecone.py` embeds them; `quotesUtils.ts` resolves
   them per artifact for the receipts panel.
2. **The public site.** Every file renders as a page under `/notes`, linked
   from the artifact's own entry on `/projects`, `/work`, or `/involvement`.

Anything written here is published. Treat it as public writing.

## Filename convention

`<kind>_<slug>.md`, where `kind` is one of `project`, `work`, `involvement`,
`topic`.

The `slug` must match the artifact's anchor id on its own page, because that is
how a note resolves its title and its link back:

| kind | slug source | example |
| --- | --- | --- |
| `project` | `id` in `src/data/projects.json` | `project_repple.md` |
| `work` | slugified `company` in `karthik_thyagarajan_truth.yaml` | `work_samsung-research-america.md` |
| `involvement` | `slug` in `involvement.yaml` | `involvement_buildpurdue.md` |
| `topic` | `slug` in `topics.yaml` | `topic_agents.md` |

A file whose slug matches nothing still publishes, just without a backlink or a
button on the artifact page.

## Frontmatter

```yaml
---
applies_to: [project:repple]   # artifact ids, used by the chatbot
topics: [fitness, ELO]         # shown at the foot of the note page
public: false                  # optional; omit to publish
---
```

Set `public: false` to pull a file from the website while keeping it in the RAG
index. The page disappears, the artifact's button disappears, and the entry
drops out of `sitemap.xml`.

## Headings

Whatever level the file starts at becomes `<h2>` on the page, so `#` and `##`
are both fine as the top level. Headings get anchor ids and a table of contents
is rendered when a file has more than two of them.

Files with frontmatter but no body are skipped by both consumers.

## After editing

`/notes` pages are generated at build time, so a Vercel deploy picks up changes
automatically. To refresh the chatbot's index, run
`uv run python create-pinecone.py` from `python-rag/`.
