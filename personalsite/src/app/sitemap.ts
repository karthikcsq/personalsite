import type { MetadataRoute } from "next";
import { getSortedPosts } from "@/utils/blogUtils";
import { getAllNotes, noteHref } from "@/utils/notesUtils";

const SITE = "https://www.karthikthyagarajan.com";

// Generated at build time and served at /sitemap.xml. Everything listed here
// is statically rendered, so lastModified is the build date for pages whose
// source has no date of its own.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
      { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${SITE}/work`, changeFrequency: "monthly", priority: 0.9 },
      { url: `${SITE}/projects`, changeFrequency: "monthly", priority: 0.9 },
      { url: `${SITE}/involvement`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${SITE}/notes`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${SITE}/blog`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${SITE}/gallery`, changeFrequency: "monthly", priority: 0.5 },
    ] satisfies MetadataRoute.Sitemap
  ).map((r) => ({ ...r, lastModified: now }));

  const posts: MetadataRoute.Sitemap = getSortedPosts().map((post) => {
    const parsed = new Date(post.date);
    return {
      url: `${SITE}/blog/${post.slug}`,
      lastModified: Number.isNaN(parsed.getTime()) ? now : parsed,
      changeFrequency: "yearly",
      priority: 0.7,
    };
  });

  const notes: MetadataRoute.Sitemap = getAllNotes().map((note) => ({
    url: `${SITE}${noteHref(note.kind, note.slug)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...posts, ...notes];
}
