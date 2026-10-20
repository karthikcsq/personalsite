import type { PostMeta } from "./blogUtils";

const SITE = "https://www.karthikthyagarajan.com";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function buildRssFeed(posts: readonly PostMeta[]): string {
  const sortedPosts = [...posts].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const items = sortedPosts.map((post) => {
    const url = escapeXml(`${SITE}/blog/${encodeURIComponent(post.slug)}`);
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>${post.summary ? `
      <description>${escapeXml(post.summary)}</description>` : ""}
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Karthik Thyagarajan — Writing</title>
    <link>${SITE}/?section=writing</link>
    <description>Essays by Karthik Thyagarajan on AI, technology, and building.</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />${sortedPosts.length ? `
    <lastBuildDate>${new Date(sortedPosts[0].date).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>\n`;
}
