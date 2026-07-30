import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { InvolvementClient } from "./InvolvementClient";
import { HashScroller } from "@/app/components/HashScroller";
import { getNotesByKind, noteHref } from "@/utils/notesUtils";

export default function InvolvementPage() {
  const involvements = getInvolvementsFromYaml();
  // Corpus lookup is filesystem-backed, so it has to resolve here on the
  // server and travel to the client section as plain data.
  const noteLinks = Object.fromEntries(
    getNotesByKind("involvement").map((n) => [n.slug, noteHref("involvement", n.slug)]),
  );
  return (
    <>
      <HashScroller />
      <InvolvementClient involvements={involvements} noteLinks={noteLinks} />
    </>
  );
}
