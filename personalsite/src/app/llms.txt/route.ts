import { buildLlmsIndex } from "@/utils/llmsIndex";

// Static: every source this reads (YAML, corpus markdown, blog posts) is on
// disk at build time, same as the sitemap.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsIndex(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
