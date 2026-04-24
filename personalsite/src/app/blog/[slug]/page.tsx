import Link from "next/link";
import { getPostBySlug, getSortedPosts } from "@/utils/blogUtils";
import { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);
  return {
    title: post.title,
    description:
      post.summary || `Read Karthik Thyagarajan's blog post: ${post.title}`,
    keywords: [
      "blog",
      "Karthik Thyagarajan",
      "technology",
      "research",
      post.title,
    ],
    authors: [{ name: "Karthik Thyagarajan" }],
    openGraph: {
      title: post.title,
      description:
        post.summary || `Read Karthik Thyagarajan's blog post: ${post.title}`,
      type: "article",
      publishedTime: post.date,
      authors: ["Karthik Thyagarajan"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description:
        post.summary || `Read Karthik Thyagarajan's blog post: ${post.title}`,
    },
  };
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = getSortedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);

  return (
    <article className="mx-auto max-w-[720px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-accent)]"
      >
        <span>←</span> Writing
      </Link>

      <time className="mt-10 block font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
        {post.date}
      </time>

      <h1 className="mt-3 font-serif text-[clamp(2rem,4.5vw,3rem)] italic leading-[1.05] tracking-tight text-[var(--color-ink)]">
        {post.title}
      </h1>

      {post.summary && (
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.6] text-[var(--color-ink-muted)]">
          {post.summary}
        </p>
      )}

      <div className="my-12 h-px bg-[var(--color-hairline)]" />

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
