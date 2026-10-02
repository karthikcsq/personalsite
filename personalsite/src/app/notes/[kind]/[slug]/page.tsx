import Link from "next/link";
import { notFound } from "next/navigation";
import CorpusArticle from "@/app/components/CorpusArticle";
import styles from "@/app/components/corpus-article.module.css";
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
    isPartOf: { "@type": "Collection", name: "Writing", url: `${SITE}/?section=writing` },
  };

  const category = note.kind === "project" ? "projects" : note.kind === "topic" ? "writing" : note.kind;
  return (
    <CorpusArticle category={category} title={note.title} meta={note.subtitle || note.meta} summary={note.summary}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className={styles.links}>
        {note.sourceHref ? <Link href={note.sourceHref}>← {note.sourceLabel}</Link> : null}
        <a href={`${noteHref(note.kind, note.slug)}/raw`}>Raw markdown ↗</a>
      </div>
      {note.headings.length > 2 ? (
        <nav className={styles.toc} aria-label="Contents">
          <p>Contents</p>
          <ul>{note.headings.map((heading) => (
            <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>
          ))}</ul>
        </nav>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: note.contentHtml }} />
      {note.topics.length ? <footer className={styles.topics}>{note.topics.join(" · ")}</footer> : null}
    </CorpusArticle>
  );
}
