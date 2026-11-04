import { OG_CONTENT_TYPE, OG_SIZE, renderArticleCard } from "@/lib/og/card";
import { getPostBySlug, getSortedPosts } from "@/utils/blogUtils";

export const alt = "Essay by Karthik Thyagarajan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getSortedPosts().map((p) => ({ slug: p.slug }));
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export default async function BlogOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return renderArticleCard({
    kicker: `Essay · ${formatDate(post.date)}`,
    title: post.title,
    subtitle: post.summary,
  });
}
