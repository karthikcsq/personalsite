import { getJobsFromYaml } from "@/utils/jobUtils";
import { WorkTimelineClient } from "./WorkTimelineClient";
import { HashScroller } from "@/app/components/HashScroller";
import { getNotesByKind, noteHref } from "@/utils/notesUtils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work",
  description: "Karthik Thyagarajan's work experience, roles, and professional timeline.",
};

export default function WorkPage() {
  const jobs = getJobsFromYaml();
  // Corpus lookup is filesystem-backed, so it has to resolve here on the
  // server and travel to the timeline as plain data.
  const noteLinks = Object.fromEntries(
    getNotesByKind("work").map((n) => [n.slug, noteHref("work", n.slug)]),
  );
  return (
    <>
      <HashScroller />
      <WorkTimelineClient jobs={jobs} noteLinks={noteLinks} />
    </>
  );
}
