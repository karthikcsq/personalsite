import { getSortedPosts } from "@/utils/blogUtils";
import { buildRssFeed } from "@/utils/rss";

// Posts live on disk, so the feed updates with every deployment.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildRssFeed(getSortedPosts()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
