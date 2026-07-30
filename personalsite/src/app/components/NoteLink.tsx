import Link from "next/link";
import { NotebookPen } from "lucide-react";

// Entry point from an artifact (project / work / involvement) into its note.
// Rendered only when a corpus file actually exists for that artifact, so it
// never becomes a dead link. Pure presentational — safe to import from both
// server and client components.

export function NoteLink({ href, label = "Read the notes" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/35 bg-[var(--color-accent-soft)] px-3.5 py-1.5 text-[13px] text-[var(--color-accent-hover)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/12"
    >
      <NotebookPen className="h-3.5 w-3.5 opacity-70 transition-opacity group-hover:opacity-100" />
      {label}
    </Link>
  );
}
