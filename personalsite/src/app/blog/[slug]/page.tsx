import CorpusArticle from "@/app/components/CorpusArticle";
import { notFound } from "next/navigation";
import { getPostBySlug, getSortedPosts } from "@/utils/blogUtils";
import { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  if (!getSortedPosts().some((post) => post.slug === resolvedParams.slug)) notFound();
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
    alternates: { canonical: `/blog/${resolvedParams.slug}` },
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

const SITE = "https://www.karthikthyagarajan.com";

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  if (!getSortedPosts().some((post) => post.slug === resolvedParams.slug)) notFound();
  const post = await getPostBySlug(resolvedParams.slug);
  const url = `${SITE}/blog/${resolvedParams.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary || undefined,
    datePublished: post.date,
    inLanguage: "en",
    author: { "@type": "Person", name: "Karthik Thyagarajan", url: SITE },
    publisher: { "@type": "Person", name: "Karthik Thyagarajan", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <CorpusArticle category="writing" title={post.title} meta={post.date} summary={post.summary}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </CorpusArticle>
  );
}
