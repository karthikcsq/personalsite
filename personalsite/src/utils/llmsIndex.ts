import { getJobsFromYaml } from "@/utils/jobUtils";
import { getProjectsFromYaml } from "@/utils/projectUtils";
import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { getTopicsFromYaml } from "@/utils/topicsUtils";
import { getSortedPosts } from "@/utils/blogUtils";
import { getAllNotes, noteHref, type NoteKind } from "@/utils/notesUtils";
import projectsJson from "@/data/projects.json";

const SITE = "https://www.karthikthyagarajan.com";

interface ProjectJson {
  id: string;
  title: string;
  date: string;
  description: string;
  tools: string;
  links?: { label: string; url: string; type: string }[];
}

const projects = projectsJson as ProjectJson[];

// Must match the anchor ids the pages actually render: WorkTimelineClient
// keys sections off slugify(company), /projects off project.id, and
// InvolvementClient off inv.slug.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STOPWORDS = new Set(["a", "an", "and", "for", "of", "the", "to", "with"]);

function titleTokens(title: string): Set<string> {
  return new Set(
    slugify(title ?? "")
      .split("-")
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

// The resume YAML and projects.json name the same project differently
// ("Photonic Implementation of QKD" vs "...of Quantum Key Distribution"), so
// exact or prefix matching misses. Two titles are the same artifact when most
// of the shorter one's significant words appear in the longer.
function sameArtifact(a: Set<string>, b: Set<string>): boolean {
  const [short, long] = a.size <= b.size ? [a, b] : [b, a];
  if (short.size === 0) return false;
  let shared = 0;
  for (const token of short) if (long.has(token)) shared += 1;
  return shared / short.size >= 0.6;
}

function noteIndex(): Map<string, string> {
  const byKey = new Map<string, string>();
  for (const note of getAllNotes()) {
    byKey.set(`${note.kind}:${note.slug}`, `${SITE}${noteHref(note.kind, note.slug)}`);
  }
  return byKey;
}

function truncate(s: string, max = 260): string {
  const flat = s.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}...`;
}

// One bullet per artifact: title, dates, a one-line description, the canonical
// on-site URL, the long-form notes URL when a corpus file exists, and any
// external links. Agents that stop reading here still have a complete
// inventory; agents that want depth have a direct link per item and never
// have to crawl the client-rendered pages.
function line(parts: {
  title: string;
  meta?: string;
  summary?: string;
  url: string;
  notes?: string | null;
  links?: { label: string; url: string }[];
}): string {
  const head = parts.meta ? `**${parts.title}** (${parts.meta})` : `**${parts.title}**`;
  const body = parts.summary ? ` ${parts.summary}` : "";
  const links = [`[page](${parts.url})`];
  if (parts.notes) links.push(`[notes](${parts.notes})`);
  for (const l of parts.links ?? []) links.push(`[${l.label}](${l.url})`);
  return `- ${head} -${body} ${links.join(" ")}`;
}

// The home page is server-rendered on demand (its metadata reads ?q), so
// without this the whole corpus would be re-read from disk on every request.
// Dev skips the cache so edits to YAML or corpus files show up on reload.
let cached: string | null = null;

export function buildLlmsIndex(): string {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const built = render();
  cached = built;
  return built;
}

function render(): string {
  const notes = noteIndex();
  const seenNotes = new Set<string>();

  const noteFor = (kind: NoteKind, slug: string): string | null => {
    const url = notes.get(`${kind}:${slug}`) ?? null;
    if (url) seenNotes.add(`${kind}:${slug}`);
    return url;
  };

  const out: string[] = [];

  out.push("# Karthik Thyagarajan");
  out.push("");
  out.push(
    "Founder-engineer and Purdue CS student. This file is the complete machine-readable " +
      "index of everything on karthikthyagarajan.com: work history, projects, community " +
      "involvement, topics I have written up, and blog posts. Every entry links to its " +
      "page and, where one exists, to a long-form notes page written in my own words.",
  );
  out.push("");
  out.push(`Canonical site: ${SITE}`);
  out.push(`Sitemap: ${SITE}/sitemap.xml`);
  out.push(`Full text of every note in one file: ${SITE}/llms-full.txt`);
  out.push("");
  out.push(
    "Any note page is also available as raw markdown by appending `/raw` to its URL. " +
      "For questions this index does not answer there is a retrieval-backed chat at " +
      `${SITE}/?q=<your+question>.`,
  );
  out.push("");

  const jobs = getJobsFromYaml();
  if (jobs.length) {
    out.push("## Work experience");
    out.push("");
    for (const job of jobs) {
      const slug = slugify(job.company);
      out.push(
        line({
          title: `${job.title}, ${job.company}`,
          meta: job.year,
          summary: truncate(job.description.join(" ")),
          url: `${SITE}/work#${slug}`,
          notes: noteFor("work", slug),
        }),
      );
    }
    out.push("");
  }

  if (projects.length) {
    out.push("## Projects");
    out.push("");
    for (const project of projects) {
      out.push(
        line({
          title: project.title,
          meta: [project.date, project.tools].filter(Boolean).join(" - "),
          summary: truncate(project.description),
          url: `${SITE}/projects#${project.id}`,
          notes: noteFor("project", project.id),
          links: (project.links ?? []).map((l) => ({ label: l.label, url: l.url })),
        }),
      );
    }

    // The resume YAML is a superset in principle: anything listed there but
    // absent from projects.json has no /projects card, so link it by its
    // external URL rather than dropping it.
    const known = projects.map((p) => titleTokens(p.title));
    const involvementTitles = getInvolvementsFromYaml().flatMap((i) => [
      titleTokens(i.title),
      titleTokens(i.org),
    ]);
    for (const entry of getProjectsFromYaml()) {
      const tokens = titleTokens(entry.title);
      if ([...known, ...involvementTitles].some((t) => sameArtifact(t, tokens))) continue;
      out.push(
        line({
          title: entry.title,
          meta: [entry.date, entry.tools].filter(Boolean).join(" - "),
          summary: truncate(entry.bullets.join(" ")),
          url: entry.link || `${SITE}/projects`,
        }),
      );
    }
    out.push("");
  }

  const involvements = getInvolvementsFromYaml();
  if (involvements.length) {
    out.push("## Community and involvement");
    out.push("");
    for (const item of involvements) {
      out.push(
        line({
          title: `${item.title}${item.org && item.org !== item.title ? `, ${item.org}` : ""}`,
          meta: [item.role, item.date].filter(Boolean).join(" - "),
          summary: truncate(item.tagline || item.whatItIs),
          url: `${SITE}/involvement#${item.slug}`,
          notes: noteFor("involvement", item.slug),
          links: (item.links ?? []).map((l) => ({ label: l.label, url: l.url })),
        }),
      );
    }
    out.push("");
  }

  const topics = getTopicsFromYaml();
  if (topics.length) {
    out.push("## Topics I have written up");
    out.push("");
    for (const topic of topics) {
      const noteUrl = noteFor("topic", topic.slug);
      out.push(
        line({
          title: topic.title,
          summary: truncate(topic.tagline),
          url: noteUrl ?? `${SITE}/notes`,
        }),
      );
    }
    out.push("");
  }

  const posts = getSortedPosts();
  if (posts.length) {
    out.push("## Blog posts");
    out.push("");
    for (const post of posts) {
      out.push(
        line({
          title: post.title,
          meta: post.date,
          summary: post.summary ? truncate(post.summary) : undefined,
          url: `${SITE}/blog/${post.slug}`,
        }),
      );
    }
    out.push("");
  }

  // A corpus file whose artifact was renamed or retired still belongs in the
  // index, otherwise adding a note could silently drop it from here.
  const orphans = getAllNotes().filter((n) => !seenNotes.has(`${n.kind}:${n.slug}`));
  if (orphans.length) {
    out.push("## Other notes");
    out.push("");
    for (const note of orphans) {
      out.push(
        line({
          title: note.title,
          meta: note.meta || undefined,
          summary: truncate(note.summary),
          url: `${SITE}${noteHref(note.kind, note.slug)}`,
        }),
      );
    }
    out.push("");
  }

  out.push("## Other pages");
  out.push("");
  out.push(`- **About** - longer bio and background. [page](${SITE}/about)`);
  out.push(`- **Notes index** - every long-form writeup in one list. [page](${SITE}/notes)`);
  out.push(`- **Gallery** - photography. [page](${SITE}/gallery)`);
  out.push(`- **Resume** - PDF. [file](${SITE}/resume.pdf)`);
  out.push("");

  return out.join("\n");
}
