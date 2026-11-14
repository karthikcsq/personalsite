import { notFound } from "next/navigation";
import CorpusArticle from "@/app/components/CorpusArticle";
import styles from "@/app/components/corpus-article.module.css";
import type { Metadata } from "next";
import { noteSummary } from "@/app/_home/oneLiners";
import {
  NOTE_KINDS,
  getAllNotes,
  getNote,
  noteHref,
  noteKindLabel,
  noteLinks, noteVideoId,
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
    (await noteSummary(`${note.kind}:${note.slug}`)) || note.summary || `Karthik Thyagarajan's notes on ${note.title}.`;
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
  const oneLiner = await noteSummary(`${note.kind}:${note.slug}`);
  const links = noteLinks(note.kind, note.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${note.title} — Notes`,
    description: oneLiner || note.summary,
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
    isPartOf: { "@type": "Collection", name: "Writing", url: `${SITE}/writing` },
  };

  const back = note.kind === "topic" ? "/#interests" : "/#work";
  const video = noteVideoId(note.kind, note.slug);
  return (
    <CorpusArticle
      back={back}
      title={note.title}
      titleId={`${note.kind}:${note.slug}`}
      // a sentence about the thing, not a keyword list: projects lose their
      // tools line; jobs keep role and dates
      meta={note.kind === "project" ? undefined : note.subtitle || note.meta}
      summary={oneLiner}
      headings={note.headings.map((h) => ({ id: h.id, text: h.text, level: h.depth ? 3 : 2 }))}
      minTocHeadings={3}
      media={video ? (
        <div className={styles.video}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video}`}
            title={`${note.title} video`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : null}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {links.length ? <div className={styles.links}>
        {links.map((l) => (
          <a key={l.url} href={l.url} target={l.url.startsWith("/") ? undefined : "_blank"} rel={l.url.startsWith("/") ? undefined : "noopener noreferrer"}>
            {l.label} ↗
          </a>
        ))}
      </div> : null}
      <div dangerouslySetInnerHTML={{ __html: note.contentHtml }} />
    </CorpusArticle>
  );
}
