import CorpusArticle from "@/app/components/CorpusArticle";
import RssLink from "@/app/components/RssLink";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPostDate, getPostBySlug, getSortedPosts, type PostMeta } from "@/utils/blogUtils";
import styles from "@/app/components/corpus-article.module.css";
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
      url: `/blog/${resolvedParams.slug}`,
      siteName: "Karthik Thyagarajan",
      locale: "en_US",
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
const EMAIL = "karthik6002@gmail.com";

function PostFooter({ post, newer, older }: { post: PostMeta; newer?: PostMeta; older?: PostMeta }) {
  const subject = encodeURIComponent(`Re: ${post.title}`);
  return (
    <footer className={styles.postFooter}>
      <p className={styles.reply}>
        Thoughts, disagreements, or something I got wrong?{" "}
        <a href={`mailto:${EMAIL}?subject=${subject}`}>Email me</a>.
      </p>
      {newer || older ? (
        <nav className={styles.adjacent} aria-label="More writing">
          {older ? (
            <Link href={`/blog/${older.slug}`} className={styles.adjacentLink}>
              <span className={styles.adjacentLabel}>← Older</span>
              <span className={styles.adjacentTitle}>{older.title}</span>
            </Link>
          ) : <span />}
          {newer ? (
            <Link href={`/blog/${newer.slug}`} className={styles.adjacentLink} data-align="end">
              <span className={styles.adjacentLabel}>Newer →</span>
              <span className={styles.adjacentTitle}>{newer.title}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      <div className={styles.footerLinks}>
        <Link href="/writing">All writing</Link>
        <RssLink />
      </div>
    </footer>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const posts = getSortedPosts();
  const index = posts.findIndex((post) => post.slug === resolvedParams.slug);
  if (index === -1) notFound();
  const post = await getPostBySlug(resolvedParams.slug);
  const newer = posts[index - 1];
  const older = posts[index + 1];
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
    <CorpusArticle
      showRss
      essay
      category="writing"
      title={post.title}
      meta={<><time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read</>}
      summary={post.summary}
      headings={post.headings}
      footer={<PostFooter post={post} newer={newer} older={older} />}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </CorpusArticle>
  );
}
