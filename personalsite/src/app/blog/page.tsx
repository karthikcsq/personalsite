import Link from "next/link";
import { getSortedPosts } from "@/utils/blogUtils";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Essays and notes by Karthik Thyagarajan on AI, research, and things worth thinking about.",
};

export default async function BlogIndex() {
  const posts = getSortedPosts();

  return (
    <article className="mx-auto max-w-[720px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        Writing
      </p>
      <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
        Notes and essays.
      </h1>
      <p className="mt-5 max-w-[540px] font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] italic leading-snug text-[var(--color-ink-muted)]">
        Thinking out loud about AI, research, startups, and the occasional tangent.
      </p>

      {posts.length === 0 ? (
        <p className="mt-16 text-[var(--color-ink-muted)]">Nothing published yet.</p>
      ) : (
        <ol className="mt-14">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="border-t border-[var(--color-hairline)] last:border-b"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group block py-7 transition-colors"
              >
                <time className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
                  {post.date}
                </time>
                <h2 className="mt-2 font-serif text-[clamp(1.4rem,2.5vw,1.75rem)] italic leading-tight text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]">
                  {post.title}
                </h2>
                {post.summary && (
                  <p className="mt-3 line-clamp-2 max-w-[600px] text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
                    {post.summary}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]">
                  Read
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
