import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { projects } from "@/data/projectsData";
import { getSortedPosts } from "@/utils/blogUtils";
import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { getJobsFromYaml } from "@/utils/jobUtils";
import { getProjectsFromYaml } from "@/utils/projectUtils";
import {
  findNote,
  getNoteMarkdown,
  noteHref,
  type NoteMeta,
} from "@/utils/notesUtils";
import { getTopicsFromYaml } from "@/utils/topicsUtils";
import type {
  CorpusArtifact,
  CorpusCategory,
  CorpusMedia,
  CorpusQuote,
  CorpusSection,
  LivingCorpusPayload,
} from "@/lib/living-corpus/types";

const MAX_QUOTE = 760;

const TOPIC_RULES: Array<[string, RegExp]> = [
  ["agents", /\bagents?\b|agentic|orchestrat/i],
  ["memory", /\bmemory\b|retrieval|remember|long[- ]form/i],
  ["trust", /\btrust\b|approval|permission|guardrail|safety/i],
  ["control", /\bcontrol\b|robot|reinforcement|action space/i],
  ["privacy", /privacy|classified|local model|on-device|security/i],
  ["tools", /\btools?\b|MCP|workspace|API/i],
  ["context", /\bcontext\b|prompt|discovery|routing/i],
  ["automation", /automat|always-on|ambient/i],
  ["work", /\bwork\b|career|company|team/i],
  ["building", /\bbuild|built|ship|product|prototype/i],
  ["failure", /fail|wrong|hard part|constraint|frustrat/i],
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  const flat = cleanMarkdown(value);
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  const word = cut.lastIndexOf(" ");
  const end = sentence > max * 0.55 ? sentence + 1 : word;
  return `${cut.slice(0, Math.max(1, end)).trim()}…`;
}

function collectTopics(...values: Array<string | string[] | undefined>): string[] {
  const textParts: string[] = [];
  const topics = new Set<string>();
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const topic of value) {
        const normalized = slugify(topic);
        if (normalized) topics.add(normalized);
      }
    } else if (value) {
      textParts.push(value);
    }
  }

  const text = textParts.join(" ");
  for (const [topic, pattern] of TOPIC_RULES) {
    if (pattern.test(text)) topics.add(topic);
  }
  return Array.from(topics).slice(0, 12);
}

interface MarkdownSection {
  id: string;
  heading: string;
  text: string;
}

function extractSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let heading = "Overview";
  let buffer: string[] = [];

  const flush = () => {
    const text = cleanMarkdown(buffer.join(" "));
    buffer = [];
    if (text.length < 44) return;
    sections.push({ id: slugify(heading) || "overview", heading, text });
  };

  for (const line of lines) {
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      flush();
      heading = cleanMarkdown(headingMatch[1]);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      if (buffer.length) buffer.push("");
      continue;
    }
    if (/^(---|```|~~~)/.test(trimmed)) continue;
    buffer.push(trimmed.replace(/^[-*+]\s+/, ""));
  }
  flush();

  const unique = new Map<string, MarkdownSection>();
  for (const section of sections) {
    if (!unique.has(section.id)) unique.set(section.id, section);
  }
  return Array.from(unique.values());
}

function quotesFromMarkdown(
  markdown: string | null,
  href: string,
  source: string,
): CorpusQuote[] {
  return sectionsFromMarkdown(markdown, href, source).map((section) => ({
    ...section,
    text: truncate(section.text, MAX_QUOTE),
  }));
}

function sectionsFromMarkdown(
  markdown: string | null,
  href: string,
  source: string,
): CorpusSection[] {
  if (!markdown) return [];
  return extractSections(markdown).map((section) => ({
      id: section.id,
      heading: section.heading,
      text: cleanMarkdown(section.text),
      href: `${href}#${section.id}`,
      source,
    }));
}

function fallbackQuote(
  id: string,
  heading: string,
  text: string,
  href: string,
  source: string,
): CorpusQuote {
  return { id, heading, text: truncate(text, MAX_QUOTE), href, source };
}

function fallbackSection(
  id: string,
  heading: string,
  text: string,
  href: string,
  source: string,
): CorpusSection {
  return { id, heading, text: cleanMarkdown(text), href, source };
}

function noteData(
  kind: "work" | "project" | "topic" | "involvement",
  slug: string,
) {
  const note = findNote(kind, slug);
  if (!note) return { note: null, markdown: null, href: null };
  const href = noteHref(kind, slug);
  return { note, markdown: getNoteMarkdown(kind, slug), href };
}

function artifact(input: {
  id: string;
  category: CorpusCategory;
  title: string;
  meta: string;
  description: string;
  referenceItems?: string[];
  href: string;
  explicitTopics?: string[];
  quotes: CorpusQuote[];
  sections?: CorpusSection[];
  media?: CorpusMedia;
}): CorpusArtifact {
  const topics = collectTopics(
    input.explicitTopics,
    input.title,
    input.description,
    input.quotes.map((quote) => `${quote.heading} ${quote.text}`).join(" "),
  );
  return {
    ...input,
    description: cleanMarkdown(input.description),
    referenceItems: (input.referenceItems ?? []).map((item) => cleanMarkdown(item)),
    sections: (input.sections ?? input.quotes).map((section) => ({
      ...section,
      text: cleanMarkdown(section.text),
    })),
    topics,
  };
}

function buildPersonal(): CorpusArtifact[] {
  return [
    artifact({
      id: "personal:background",
      category: "personal",
      title: "Before the work",
      meta: "Northern Virginia · Purdue",
      description:
        "The background behind the projects: Northern Virginia, TJHSST, Purdue, and a habit of building ideas that were too ambitious for the time available.",
      href: "/about",
      explicitTopics: ["personal", "background", "education", "purdue"],
      quotes: [
        fallbackQuote(
          "northern-virginia-to-purdue",
          "Northern Virginia to Purdue",
          "I grew up in Northern Virginia and went to TJHSST before coming to Purdue to study computer science and artificial intelligence. I have always gravitated toward projects that were a little too ambitious for the week I had—the scope changed, but that habit never really did.",
          "/about",
          "Before the work",
        ),
      ],
    }),
    artifact({
      id: "personal:music",
      category: "personal",
      title: "Piano",
      meta: "Royal Conservatory · Level 8",
      description:
        "Karthik is a classically trained pianist who completed the Royal Conservatory Level 8 examination.",
      href: "/about",
      explicitTopics: ["personal", "music", "piano", "practice"],
      quotes: [
        fallbackQuote(
          "piano",
          "Piano",
          "I am a classically trained pianist and completed the Royal Conservatory Level 8 examination. Piano is the long-running practice in my life that has nothing to do with shipping software, and I like that it asks for a completely different kind of attention.",
          "/about",
          "Piano",
        ),
      ],
      media: {
        type: "image",
        src: "/interests/music-interest.jpg",
        alt: "A piano representing Karthik's classical music practice",
        caption: "classical piano · outside the work",
      },
    }),
  ];
}

function buildPhotography(gallery: Readonly<Record<string, readonly string[]>>): CorpusArtifact[] {
  return Object.entries(gallery).flatMap(([album, images]) => {
    const src = images[0];
    if (!src) return [];
    const displayAlbum = album === "San Fransisco" ? "San Francisco" : album;
    const slug = slugify(album);
    const href = `/gallery#${slug}`;
    return [
      artifact({
        id: `personal:photography:${slug}`,
        category: "personal",
        title: displayAlbum,
        meta: "photography",
        description: `Photographs from ${displayAlbum}, from Karthik's travel archive.`,
        href,
        explicitTopics: [
          "personal",
          "photography",
          "travel",
          ...slug.split("-").filter(Boolean),
        ],
        quotes: [
          fallbackQuote(
            "photographs",
            `Frames from ${displayAlbum}`,
            `A few photographs I took in ${displayAlbum}. Photography is a second language for me when words fail; the gallery is where I keep the places and details that would feel flattened if I tried to explain all of them in a paragraph.`,
            href,
            displayAlbum,
          ),
        ],
        media: {
          type: "image",
          src,
          alt: `A photograph Karthik took in ${displayAlbum}`,
          caption: `${displayAlbum} · from my photo archive`,
        },
      }),
    ];
  });
}

function buildWork(): CorpusArtifact[] {
  return getJobsFromYaml().map((job) => {
    const slug = slugify(job.company);
    const data = noteData("work", slug);
    const href = data.href ?? `/work#${slug}`;
    const quotes = quotesFromMarkdown(data.markdown, href, job.company);
    const sections = sectionsFromMarkdown(data.markdown, href, job.company);
    if (!quotes.length && job.description[0]) {
      quotes.push(
        fallbackQuote("work", job.title, job.description[0], href, job.company),
      );
    }
    return artifact({
      id: `work:${slug}`,
      category: "work",
      title: job.company,
      meta: `${job.title} · ${job.year}`,
      description: job.description[0] || data.note?.summary || job.title,
      referenceItems: job.description,
      href,
      explicitTopics: data.note?.topics,
      quotes,
      sections: sections.length ? sections : undefined,
    });
  });
}

function buildProjects(): CorpusArtifact[] {
  const resumeProjects = getProjectsFromYaml();
  return projects.map((project) => {
    const data = noteData("project", project.id);
    const href = data.href ?? `/projects#${project.id}`;
    const quotes = quotesFromMarkdown(data.markdown, href, project.title);
    const sections = sectionsFromMarkdown(data.markdown, href, project.title);
    const normalizedTitle = project.title.trim().toLowerCase();
    const resumeProject = resumeProjects.find((entry) => {
      const candidate = entry.title.trim().toLowerCase();
      return candidate === normalizedTitle || candidate.includes(normalizedTitle);
    });
    if (!quotes.length) {
      quotes.push(
        fallbackQuote(
          "project",
          project.title,
          project.ragNarrative || project.description,
          href,
          project.title,
        ),
      );
    }
    return artifact({
      id: `project:${project.id}`,
      category: "projects",
      title: project.title,
      meta: project.date,
      description: project.description,
      referenceItems: resumeProject?.bullets ?? [project.description],
      href,
      explicitTopics: data.note?.topics,
      quotes,
      sections: sections.length
        ? sections
        : [
            fallbackSection(
              "overview",
              project.title,
              project.ragNarrative || project.description,
              href,
              project.title,
            ),
          ],
    });
  });
}

function buildInvolvement(): CorpusArtifact[] {
  return getInvolvementsFromYaml().map((entry) => {
    const data = noteData("involvement", entry.slug);
    const href = data.href ?? `/involvement#${entry.slug}`;
    const quotes = quotesFromMarkdown(data.markdown, href, entry.title);
    const sections = sectionsFromMarkdown(data.markdown, href, entry.title);
    if (!quotes.length) {
      const fallback = entry.whatItIs || entry.tagline || entry.myRole;
      if (fallback) {
        quotes.push(
          fallbackQuote("involvement", entry.role, fallback, href, entry.title),
        );
      }
    }
    return artifact({
      id: `involvement:${entry.slug}`,
      category: "involvement",
      title: entry.title,
      meta: `${entry.role} · ${entry.date}`,
      description: entry.tagline || entry.whatItIs || entry.role,
      href,
      explicitTopics: data.note?.topics,
      quotes,
      sections: sections.length
        ? sections
        : [
            fallbackSection(
              "overview",
              entry.title,
              entry.whatItIs || entry.tagline || entry.myRole,
              href,
              entry.title,
            ),
          ],
    });
  });
}

function ideaArtifacts(note: NoteMeta, markdown: string): CorpusArtifact[] {
  const href = noteHref("topic", note.slug);
  return extractSections(markdown).map((section) => {
    const quote = fallbackQuote(
      section.id,
      section.heading,
      section.text,
      `${href}#${section.id}`,
      note.title,
    );
    return artifact({
      id: `idea:${note.slug}:${section.id}`,
      category: "ideas",
      title: section.heading,
      meta: note.title,
      description: section.text,
      href: quote.href,
      explicitTopics: note.topics,
      quotes: [quote],
      sections: [{ ...quote, text: cleanMarkdown(section.text) }],
    });
  });
}

function buildIdeas(): CorpusArtifact[] {
  return getTopicsFromYaml().flatMap((topic) => {
    const note = findNote("topic", topic.slug);
    const markdown = getNoteMarkdown("topic", topic.slug);
    if (!note || !markdown) return [];
    return ideaArtifacts(note, markdown);
  });
}

function readBlogMarkdown(slug: string): string {
  const file = path.join(process.cwd(), "blog", "posts", `${slug}.md`);
  try {
    return matter(fs.readFileSync(file, "utf8")).content.trim();
  } catch {
    return "";
  }
}

function buildWriting(): CorpusArtifact[] {
  return getSortedPosts().map((post) => {
    const markdown = readBlogMarkdown(post.slug);
    const href = `/blog/${post.slug}`;
    const quotes = quotesFromMarkdown(markdown, href, post.title);
    const sections = sectionsFromMarkdown(markdown, href, post.title);
    const description = post.summary || quotes[0]?.text || post.title;
    const finalQuotes =
      quotes.length > 0
        ? quotes
        : [fallbackQuote("writing", post.title, description, href, post.title)];
    return artifact({
      id: `writing:${post.slug}`,
      category: "writing",
      title: post.title,
      meta: post.date,
      description,
      href,
      quotes: finalQuotes,
      sections: sections.length ? sections : finalQuotes,
    });
  });
}

let coreCache: LivingCorpusPayload | null = null;

function buildCoreCorpus(): LivingCorpusPayload {
  if (coreCache && process.env.NODE_ENV === "production") return coreCache;
  const payload: LivingCorpusPayload = {
    artifacts: [
      ...buildWork(),
      ...buildProjects(),
      ...buildInvolvement(),
      ...buildIdeas(),
      ...buildWriting(),
      ...buildPersonal(),
    ],
  };
  if (process.env.NODE_ENV === "production") coreCache = payload;
  return payload;
}

export function buildLivingCorpus(
  gallery: Readonly<Record<string, readonly string[]>> = {},
): LivingCorpusPayload {
  const core = buildCoreCorpus();
  const photography = buildPhotography(gallery);
  if (!photography.length) return core;
  return { artifacts: [...core.artifacts, ...photography] };
}
