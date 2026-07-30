This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Chat model routing

The chat API uses a conservative hybrid route:

- Narrow, strongly retrieved factual questions use `gpt-5-mini`.
- Multi-turn, weak-retrieval, opinion, comparison, role, and narrative questions use `gpt-5.6-luna`.
- A2UI composition and repair always use `gpt-5.6-luna`.
- Retrieval rewrites, quote selection, and topic selection use `gpt-5.4-nano`.
- Embeddings remain on `text-embedding-3-small`.

Useful environment overrides:

```text
OPENAI_ANSWER_ROUTING_MODE=hybrid
OPENAI_ANSWER_FAST_MODEL=gpt-5-mini
OPENAI_ANSWER_QUALITY_MODEL=gpt-5.6-luna
OPENAI_ANSWER_REASONING_EFFORT=low
OPENAI_REWRITE_MODEL=gpt-5.4-nano
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_QUOTE_MODEL=gpt-5.4-nano
OPENAI_TOPIC_MODEL=gpt-5.4-nano
OPENAI_A2UI_MODEL=gpt-5.6-luna
OPENAI_A2UI_REASONING_EFFORT=low
OPENAI_HYDE_MODE=adaptive
```

`OPENAI_ANSWER_MODEL` remains a compatibility override. When set, it pins both
answer routes to the same model, which is useful for isolated benchmarks.

`OPENAI_HYDE_MODE` accepts `adaptive`, `speculative`, or `off`. Adaptive mode
runs the three retrieval rewrites only after a weak baseline. Speculative mode
starts them beside baseline retrieval. Off disables them.

### Chat caches

Standalone retrieval rewrites are cached for seven days. Exact questions from
the host-authored suggestion bank cache their grounded reply and artifacts for
30 days. A2UI output is deliberately excluded, so repeated pill questions can
still produce different component types and composition options.

Production uses the existing Upstash connection. Development uses an in-memory
bounded cache. `CHAT_CACHE_VERSION` manually invalidates suggested reply
entries. Vercel deployments default to `VERCEL_GIT_COMMIT_SHA`, so content
changes naturally receive a new cache namespace.

### Chat benchmark

The benchmark writes reply text, artifacts, A2UI JSON, routing decisions,
per-stage timings, token usage, cache state, and estimated cost to JSONL.

```powershell
node bench-chat.mjs --runs 1
node bench-chat.mjs --query "What does Karthik study at Purdue?" --runs 3
```

Set `CHAT_BENCHMARK_KEY` on both the server and benchmark process to bypass chat
rate limiting during controlled benchmark runs.
