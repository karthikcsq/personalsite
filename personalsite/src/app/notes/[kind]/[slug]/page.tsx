import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import {
  NOTE_KINDS,
  getAllNotes,
  getNote,
  noteHref,
  noteKindLabel,
  type NoteKind,
} from "@/utils/notesUtils";

export const dynamicParams = false;

const SITE = "https://www.karthikthyagarajan.com";

type Props = { params: Promise<{ kind: string; slug: string }> };

function parseKind(kind: string): NoteKind | null {
  return (NOTE_KINDS as readonly string[]).includes(kind) ? (kind as NoteKind) : null;
}

export async function generateStaticParams(): Promise<{ kind: string; slug: string }[]> {
  return getAllNotes().map((n) => ({ kind: n.kind, slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind: rawKind, slug } = await params;
  const kind = parseKind(rawKind);
  const note = kind ? await getNote(kind, slug) : null;
  if (!note) return { title: "Notes" };

  const title = `${note.title} — Notes`;
  const description =
    note.summary || `Karthik Thyagarajan's notes on ${note.title}.`;
  const url = `${SITE}${noteHref(note.kind, note.slug)}`;

  return {
    title,
    description,
    keywords: [note.title, "Karthik Thyagarajan", noteKindLabel(note.kind), ...note.topics],
    authors: [{ name: "Karthik Thyagarajan" }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      authors: ["Karthik Thyagarajan"],
      siteName: "Karthik Thyagarajan",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function NotePage({ params }: Props) {
  const { kind: rawKind, slug } = await params;
  const kind = parseKind(rawKind);
  const note = kind ? await getNote(kind, slug) : null;
  if (!note) notFound();

  const url = `${SITE}${noteHref(note.kind, note.slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${note.title} — Notes`,
    description: note.summary,
    about: note.title,
    keywords: note.topics.join(", "),
    inLanguage: "en",
    wordCount: note.wordCount,
    author: {
      "@type": "Person",
      name: "Karthik Thyagarajan",
      url: SITE,
    },
    publisher: {
      "@type": "Person",
      name: "Karthik Thyagarajan",
      url: SITE,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    isPartOf: { "@type": "Collection", name: "Notes", url: `${SITE}/notes` },
  };

  return (
    <article className="mx-auto max-w-[760px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]"
      >
        <Link href="/notes" className="transition-colors hover:text-[var(--color-accent)]">
          Notes
        </Link>
        <span aria-hidden>/</span>
        <span>{noteKindLabel(note.kind)}</span>
      </nav>

      <h1 className="mt-8 font-serif text-[clamp(2rem,4.5vw,3rem)] italic leading-[1.05] tracking-tight text-[var(--color-ink)]">
        {note.title}
      </h1>

      {note.subtitle && (
        <p className="mt-4 text-[15px] leading-[1.6] text-[var(--color-ink-muted)]">
          {note.subtitle}
        </p>
      )}

      <p className="mt-6 max-w-[620px] text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
        Unedited notes in my own words, written to explain the thinking behind
        this rather than summarize it. These are the same notes the chat on this
        site draws from.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        {note.sourceHref && (
          <Link
            href={note.sourceHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-surface-raised)] px-3.5 py-1.5 text-[13px] text-[var(--color-ink)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <span aria-hidden>←</span> {note.sourceLabel} entry
          </Link>
        )}
        <a
          href={`${noteHref(note.kind, note.slug)}/raw`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-surface-raised)] px-3.5 py-1.5 font-mono text-[12px] text-[var(--color-ink-muted)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Raw markdown
          <ArrowUpRight className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
        </a>
      </div>

      {note.headings.length > 2 && (
        <nav
          aria-label="On this page"
          className="mt-10 rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-5 py-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
            On this page
          </p>
          <ul className="mt-3 space-y-1.5">
            {note.headings.map((h) => (
              <li key={h.id} className={h.depth > 0 ? "pl-4" : undefined}>
                <a
                  href={`#${h.id}`}
                  className="text-[14px] leading-[1.5] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)]"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="my-12 h-px bg-[var(--color-hairline)]" />

      <div
        className="prose [&_h2]:scroll-mt-[80px] [&_h3]:scroll-mt-[80px]"
        dangerouslySetInnerHTML={{ __html: note.contentHtml }}
      />

      {note.topics.length > 0 && (
        <footer className="mt-14 border-t border-[var(--color-hairline)] pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
            Topics
          </p>
          <p className="mt-3 text-[13px] leading-[1.7] text-[var(--color-ink-muted)]">
            {note.topics.join(" · ")}
          </p>
        </footer>
      )}
    </article>
  );
}
