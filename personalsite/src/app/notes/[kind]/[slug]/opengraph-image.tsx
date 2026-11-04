import { OG_CONTENT_TYPE, OG_SIZE, renderArticleCard } from "@/lib/og/card";
import { NOTE_KINDS, findNote, getAllNotes, noteKindLabel, type NoteKind } from "@/utils/notesUtils";

export const alt = "Notes by Karthik Thyagarajan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams(): Promise<{ kind: string; slug: string }[]> {
  return getAllNotes().map((n) => ({ kind: n.kind, slug: n.slug }));
}

export default async function NoteOpengraphImage({ params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  const note = (NOTE_KINDS as readonly string[]).includes(kind) ? findNote(kind as NoteKind, slug) : null;
  return renderArticleCard({
    eyebrow: note ? `${noteKindLabel(note.kind)} · Notes` : "Notes",
    title: note?.title ?? "Notes",
    subtitle: note?.summary,
  });
}
