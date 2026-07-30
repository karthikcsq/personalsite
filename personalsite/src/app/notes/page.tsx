import Link from "next/link";
import type { Metadata } from "next";
import {
  NOTE_KINDS,
  getAllNotes,
  noteHref,
  noteKindLabel,
  type NoteKind,
  type NoteMeta,
} from "@/utils/notesUtils";

const SITE = "https://www.karthikthyagarajan.com";

const KIND_BLURB: Record<NoteKind, string> = {
  project: "Why I built each thing, what was hard, and what I'd do differently.",
  work: "What I actually worked on at each role, and what I took from it.",
  involvement: "The reasoning behind the communities I help run.",
  topic: "Standalone takes that aren't tied to any one project or job.",
};

export const metadata: Metadata = {
  title: "Notes",
  description:
    "Karthik Thyagarajan's working notes on every project, role, and community he's part of. Written in his own words: the reasoning, the tradeoffs, and the things that didn't work.",
  keywords: [
    "Karthik Thyagarajan",
    "engineering notes",
    "project writeups",
    "product thinking",
    "AI agents",
    "research",
  ],
  alternates: { canonical: `${SITE}/notes` },
  openGraph: {
    type: "website",
    url: `${SITE}/notes`,
    title: "Notes — Karthik Thyagarajan",
    description:
      "Working notes on every project, role, and community, written in Karthik's own words.",
    siteName: "Karthik Thyagarajan",
  },
};

export default function NotesIndexPage() {
  const notes = getAllNotes();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Notes",
    description:
      "Karthik Thyagarajan's working notes on every project, role, and community he's part of.",
    url: `${SITE}/notes`,
    author: { "@type": "Person", name: "Karthik Thyagarajan", url: SITE },
    hasPart: notes.map((n) => ({
      "@type": "Article",
      headline: `${n.title} — Notes`,
      description: n.summary,
      url: `${SITE}${noteHref(n.kind, n.slug)}`,
    })),
  };

  return (
    <article className="mx-auto max-w-[800px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        Notes
      </p>
      <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
        The thinking behind everything.
      </h1>
      <p className="mt-5 max-w-[600px] font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] italic leading-snug text-[var(--color-ink-muted)]">
        {notes.length} notes on why I built what I built, what was actually hard,
        and where I was wrong.
      </p>
      <p className="mt-5 max-w-[620px] text-[15px] leading-[1.7] text-[var(--color-ink-muted)]">
        Every project page, work entry, and involvement on this site links to
        one of these. They&apos;re unedited and written in my own words, and
        they&apos;re the same source the chat on the home page answers from.
      </p>

      {NOTE_KINDS.map((kind) => {
        const group = notes.filter((n) => n.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} className="mt-16">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink)]">
                {noteKindLabel(kind)}
              </h2>
              <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                {group.length}
              </span>
            </div>
            <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
              {KIND_BLURB[kind]}
            </p>
            <ul className="mt-6">
              {group.map((note) => (
                <NoteRow key={`${note.kind}/${note.slug}`} note={note} />
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}

function NoteRow({ note }: { note: NoteMeta }) {
  return (
    <li className="border-t border-[var(--color-hairline)] last:border-b">
      <Link
        href={noteHref(note.kind, note.slug)}
        className="group block py-6 transition-colors"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-[19px] font-medium leading-tight tracking-[-0.01em] text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]">
            {note.title}
          </h3>
          {note.meta && (
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
              {note.meta}
            </span>
          )}
        </div>
        {note.kind === "topic" && note.subtitle && (
          <p className="mt-2 max-w-[600px] font-serif text-[15px] italic leading-snug text-[var(--color-ink-muted)]">
            {note.subtitle}
          </p>
        )}
        <p className="mt-2 max-w-[640px] text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
          {note.summary}
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-subtle)]">
          {note.headings.length} sections · {note.wordCount.toLocaleString()} words
        </p>
      </Link>
    </li>
  );
}
