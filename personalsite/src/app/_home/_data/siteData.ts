// Server-only data for the home page. Rule: prose shown to visitors is
// Karthik's own writing, verbatim. No invented taglines or summaries.
import fs from "node:fs";
import path from "node:path";
import { buildMinimalCorpusItems } from "@/lib/living-corpus/minimalHomepage";
import type { MinimalCorpusItem, MinimalCorpusMedia } from "@/lib/living-corpus/minimalTypes";
import { getPostBySlug, getSortedPosts } from "@/utils/blogUtils";
import { listCorpusFiles } from "@/utils/quotesUtils";
import { NOTE_KINDS, findNote, noteHref, type NoteKind } from "@/utils/notesUtils";

// Where an artifact links from the home page: its note if there is one, else its
// full text, else its first outside link. The old section pages are gone.
function hrefFor(item: MinimalCorpusItem): string {
  const [kind, slug] = item.id.split(":");
  if ((NOTE_KINDS as readonly string[]).includes(kind) && slug && findNote(kind as NoteKind, slug)) return noteHref(kind as NoteKind, slug);
  return item.fullTextHref ?? item.links?.[0]?.url ?? "";
}

export type SpikeKind = "work" | "project" | "writing" | "involvement";

export interface SpikeItem {
  id: string;
  kind: SpikeKind;
  title: string;
  /** e.g. "AI Research Intern · May 2026 - Aug 2026" or "Jun 2026" */
  meta: string;
  /** Sortable year (best effort, current/ongoing → this year). */
  year: number;
  /** Karthik's own description, verbatim. */
  description: string;
  /** First sentence of the description (verbatim). */
  lede: string;
  href: string;
  media: Extract<MinimalCorpusMedia, { type: "image" }>[];
  /** Corpus topics, lowercased. Used to draw relationships. */
  topics: string[];
  /** Hand-picked "defining" items. */
  featured: boolean;
  /**
   * Real visual evidence (photos, screenshots, figures), best first.
   * Empty when nothing real exists; draw the mechanism instead of using stock art.
   */
  visuals: { src: string; alt: string }[];
}

export interface SpikeEssay {
  slug: string;
  title: string;
  date: string;
  dateLabel: string;
  summary: string;
  readingMinutes: number;
  href: string;
  cover?: string;
  /** First few paragraphs, plain text, verbatim. */
  opening: string[];
  /** Full essay HTML (trusted, authored markdown). */
  html: string;
}

export interface SpikeQuote {
  text: string;
  source: string;
  href: string;
}

export interface SpikeData {
  name: string;
  /** The line Karthik picked as his tagline (verbatim, from The Owl and the Sparrows). */
  tagline: SpikeQuote;
  links: { label: string; href: string }[];
  items: SpikeItem[];
  essays: SpikeEssay[];
  quotes: SpikeQuote[];
  photos: { src: string; album: string }[];
}

const FEATURED = new Set([
  "work:samsung-research-america",
  "project:tavi",
  "project:parm",
  "project:repple",
  "involvement:buildpurdue",
  "project:google-tools-mcp",
]);

// Verbatim lines from Karthik's essays and notes. Do not edit the wording.
const QUOTES: SpikeQuote[] = [
  {
    text: "I believe the responsibility of engineers extends beyond making technology more capable.",
    source: "The Owl and the Sparrows",
    href: "/blog/the-owl-and-the-sparrows",
  },
  {
    text: "Like the sparrows, we are drawn to the possibility of creating something that can accomplish what we cannot do.",
    source: "The Owl and the Sparrows",
    href: "/blog/the-owl-and-the-sparrows",
  },
  {
    text: "What makes this example disturbing is that the system would not need to hate humanity.",
    source: "The Owl and the Sparrows",
    href: "/blog/the-owl-and-the-sparrows",
  },
  {
    text: "Yes, jobs will be replaced, but not humanity itself.",
    source: "On the Future of Work with AI",
    href: "/blog/future-of-ai-work",
  },
  {
    text: "What does societal stability look like in an age of artificial intelligence?",
    source: "Stability in the Age of AI",
    href: "/blog/stability-in-the-age-of-ai",
  },
  {
    text: "There should not be a world where ideas are easier than ever to build, but the ones with said ideas have to hope that large corporations open their doors to them, or gamble on a venture that may not work out.",
    source: "The AI Company I'd Love to Create",
    href: "/blog/the-ai-company-id-love-to-create",
  },
  {
    text: "A use case is duct tape when the entire intention of something is for a human to do the action.",
    source: "Where AI doesn't belong",
    href: "/writing",
  },
  {
    text: "The ground footprint and the space we take up is so extremely valuable.",
    source: "My Trip to Silicon Valley",
    href: "/blog/silicon-valley-trip",
  },
];

// Real photos/screens beyond what projects.json carries. No stock imagery.
const EXTRA_VISUALS: Record<string, { src: string; alt: string }[]> = {
  "involvement:buildpurdue": [
    { src: "/media/shared/buildpurdue-nightshift.webp", alt: "buildpurdue night shift: student founders working around tables" },
    { src: "/media/shared/buildpurdue-workshop.webp", alt: "buildpurdue workshop at a whiteboard" },
  ],
  "project:repple": [
    { src: "/media/shared/repple-home-page.webp", alt: "Repple home screen" },
    { src: "/media/shared/repple-matchup-chat.webp", alt: "Repple matchup chat" },
    { src: "/media/shared/repple-spin-the-slots.webp", alt: "Repple spin the slots" },
  ],
};

const ESSAY_COVERS: Record<string, string> = {
  "the-owl-and-the-sparrows": "/projects/owl-and-sparrows.webp",
  "stability-in-the-age-of-ai": "/projects/stability-in-the-age-of-ai.webp",
  "future-of-ai-work": "/projects/future-of-work.webp",
  "the-ai-company-id-love-to-create": "/projects/ai-company.webp",
};

function kindOf(item: MinimalCorpusItem): SpikeKind | null {
  if (item.category === "work") return "work";
  if (item.category === "projects") return "project";
  if (item.category === "involvement") return "involvement";
  return null; // writing comes from the blog directly
}

function yearOf(meta: string): number {
  const years = [...meta.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
  if (/present|currently/i.test(meta) || years.length === 0) return 2026;
  return Math.max(...years);
}

function firstSentence(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  const match = /^(.{20,}?[.?!])(\s|$)/.exec(clean);
  return match ? match[1] : clean;
}

function topicsFor(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const file of listCorpusFiles()) {
    for (const id of file.applies_to) {
      // Work notes are keyed by company name: "work:Peraton Labs" → "work:peraton-labs".
      const [kind, ...rest] = id.split(":");
      const key = `${kind}:${rest.join(":").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      out.set(key, [...(out.get(key) ?? []), ...file.topics.map((t) => t.toLowerCase())]);
    }
  }
  return out;
}

function htmlToParagraphs(html: string, limit: number): string[] {
  const paras: string[] = [];
  for (const m of html.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 40) paras.push(text);
    if (paras.length >= limit) break;
  }
  return paras;
}

function loadPhotos(): SpikeData["photos"] {
  const root = path.join(process.cwd(), "public", "galleryimgs");
  if (!fs.existsSync(root)) return [];
  const photos: SpikeData["photos"] = [];
  for (const album of fs.readdirSync(root)) {
    const dir = path.join(root, album);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
      photos.push({ src: `/galleryimgs/${encodeURIComponent(album)}/${encodeURIComponent(file)}`, album });
    }
  }
  return photos;
}

let cached: Promise<SpikeData> | null = null;

export function getSiteData(): Promise<SpikeData> {
  cached ??= build();
  return cached;
}

async function build(): Promise<SpikeData> {
  const topics = topicsFor();
  const items: SpikeItem[] = [];
  for (const item of buildMinimalCorpusItems()) {
    const kind = kindOf(item);
    if (!kind) continue;
    items.push({
      id: item.id,
      kind,
      title: item.title,
      meta: item.meta,
      year: yearOf(item.meta),
      description: item.description,
      lede: firstSentence(item.description),
      href: hrefFor(item),
      media: item.media.filter((m): m is Extract<MinimalCorpusMedia, { type: "image" }> => m.type === "image"),
      topics: topics.get(item.id) ?? [],
      featured: FEATURED.has(item.id),
      visuals: [
        ...(EXTRA_VISUALS[item.id] ?? []),
        ...item.media.flatMap((m) =>
          m.type === "image" && !m.src.startsWith("/projects/repple") ? [{ src: m.src, alt: m.alt }] : [],
        ),
      ],
    });
  }

  const essays: SpikeEssay[] = [];
  for (const meta of getSortedPosts()) {
    const post = await getPostBySlug(meta.slug);
    essays.push({
      slug: meta.slug,
      title: meta.title,
      date: meta.date,
      dateLabel: new Date(`${meta.date}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      summary: meta.summary ?? "",
      readingMinutes: meta.readingMinutes,
      href: `/blog/${meta.slug}`,
      cover: ESSAY_COVERS[meta.slug],
      opening: htmlToParagraphs(post.contentHtml, 4),
      html: post.contentHtml,
    });
  }

  return {
    name: "Karthik Thyagarajan",
    tagline: QUOTES[0],
    links: [
      { label: "Email", href: "mailto:karthik6002@gmail.com" },
      { label: "GitHub", href: "https://github.com/karthikcsq" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/karthikthyagarajan06" },
      { label: "X", href: "https://x.com/karthikthy" },
    ],
    items,
    essays,
    quotes: QUOTES,
    photos: loadPhotos(),
  };
}
