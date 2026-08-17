import { buildLlmsIndex } from "@/utils/llmsIndex";
import { getAllNotes, getNoteMarkdown, noteHref, noteKindLabel } from "@/utils/notesUtils";

// The index plus the full text of every public corpus note, so an agent can
// get the whole picture in one fetch instead of following 25 links.
export const dynamic = "force-static";

const SITE = "https://www.karthikthyagarajan.com";

export function GET() {
  const parts = [buildLlmsIndex(), "---", "", "# Full notes", ""];

  for (const note of getAllNotes()) {
    const markdown = getNoteMarkdown(note.kind, note.slug);
    if (!markdown) continue;
    parts.push(`## ${noteKindLabel(note.kind)}: ${note.title}`);
    parts.push("");
    parts.push(`Source: ${SITE}${noteHref(note.kind, note.slug)}`);
    parts.push("");
    parts.push(markdown.trim());
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  return new Response(parts.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
