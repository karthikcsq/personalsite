import { NOTE_KINDS, getAllNotes, getNoteMarkdown, type NoteKind } from "@/utils/notesUtils";

// Plain-markdown mirror of each note. Useful for anyone (or anything) that
// wants the source rather than the rendered page. Marked noindex so it does
// not compete with the HTML page as duplicate content — that page is canonical.

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ kind: string; slug: string }[]> {
  return getAllNotes().map((n) => ({ kind: n.kind, slug: n.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  const { kind: rawKind, slug } = await params;
  if (!(NOTE_KINDS as readonly string[]).includes(rawKind)) {
    return new Response("Not found", { status: 404 });
  }

  const markdown = getNoteMarkdown(rawKind as NoteKind, slug);
  if (!markdown) return new Response("Not found", { status: 404 });

  return new Response(`${markdown}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
