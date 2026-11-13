import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "path";
import fs from "fs";

// Load env from the repo root so Next.js, the Python RAG scripts, and any
// other tooling all read from one canonical .env. Override:false means
// existing env vars (e.g., Vercel-injected on prod) win, so this only
// matters for local dev.
loadEnv({ path: path.resolve(__dirname, "../.env"), override: false });

const nextConfig: NextConfig = {
  // Extra hosts allowed to load dev-server resources (e.g. a tailnet name
  // when testing on a phone). Comma-separated; unset in production.
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean),
  // Runtime corpus readers use sibling repository content. Preserve that
  // layout in function output instead of tracing the whole app as data.
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  outputFileTracingIncludes: {
    '/*': [
      '../python-rag/rag-docs/corpus/*.md',
      '../python-rag/rag-docs/karthik_thyagarajan_truth.yaml',
      '../python-rag/rag-docs/involvement.yaml',
      '../python-rag/rag-docs/topics.yaml',
    ],
  },
  outputFileTracingExcludes: {
    // Static assets are served separately; no server code reads these files.
    // Keep them in public/ and in Git — only remove them from function traces.
    '/*': ['./design/**/*', './public/**/*', './src/data/bm25-model.json'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kt-personalsite.s3.us-east-2.amazonaws.com',
        port: '', // Leave empty for default ports
        pathname: '/galleryimgs/**', // Match all images under the galleryimgs folder
      },
      {
        protocol: 'https',
        hostname: 'kt-personalsite.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/blog/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // The old section pages now live as sections of the home page.
  async redirects() {
    // Old item links (e.g. /projects?item=project:tavi) go to that item's note page.
    const corpus = path.resolve(__dirname, "../python-rag/rag-docs/corpus");
    const section: Record<string, string[]> = { project: ["projects"], work: ["work"], involvement: ["involvement", "work"], topic: ["writing"] };
    const itemRedirects = (fs.existsSync(corpus) ? fs.readdirSync(corpus) : [])
      .map((f) => /^(project|work|involvement|topic)_(.+)\.md$/.exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .flatMap(([, kind, slug]) =>
        section[kind].map((from) => ({
          source: `/${from}`,
          has: [{ type: "query" as const, key: "item", value: `${kind}:${slug}` }],
          destination: `/notes/${kind}/${slug}`,
          permanent: true,
        })),
      );
    return [
      ...itemRedirects,
      { source: "/work", destination: "/#work", permanent: true },
      { source: "/projects", destination: "/#work", permanent: true },
      { source: "/involvement", destination: "/#work", permanent: true },
      { source: "/writing", destination: "/#writing", permanent: true },
      { source: "/gallery", destination: "/#photographs", permanent: true },
      { source: "/about", destination: "/", permanent: true },
      { source: "/living-corpus-draft", destination: "/", permanent: true },
      { source: "/a2ui-draft", destination: "/", permanent: true },
    ];
  },
  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
