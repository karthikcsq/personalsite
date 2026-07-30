import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { projects } from '@/data/projectsData';
import { getJobsFromYaml } from '@/utils/jobUtils';
import { getInvolvementsFromYaml } from '@/utils/involvementUtils';
import { resolveTopic } from '@/utils/topicsUtils';

// Public rendering layer over `python-rag/rag-docs/corpus/*.md`.
//
// The corpus files are Karthik's own prose about each artifact, authored via
// /quote-harvest and embedded into Pinecone for the chatbot. This module
// exposes the same files as statically generated pages under /notes so they
// are crawlable, linkable, and readable without going through the chat.
//
// Filename convention is load-bearing: `<kind>_<slug>.md`, where <slug>
// already matches the anchor id used on the artifact's own page
// (project id, slugify(company), involvement slug, topic slug). That is what
// lets a note link back to /projects#repple without a hand-maintained map.
//
// Opt out of publishing a file by adding `public: false` to its frontmatter.
// It stays in the RAG index; it just stops rendering a page and drops out of
// the sitemap.

export const NOTE_KINDS = ['project', 'work', 'involvement', 'topic'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export interface NoteHeading {
  id: string;
  text: string;
  depth: number; // 0 = top-level section, 1 = nested
}

export interface NoteMeta {
  kind: NoteKind;
  slug: string;
  file: string;
  title: string;
  // Descriptive line under the title on the note page (tools, tagline, role).
  subtitle: string;
  // Short metadata for the index chip, which is set in uppercase mono and
  // only reads well at a few words. Empty when there is nothing terse to say.
  meta: string;
  summary: string;
  topics: string[];
  headings: NoteHeading[];
  sourceHref: string | null;
  sourceLabel: string | null;
  wordCount: number;
}

export interface Note extends NoteMeta {
  markdown: string;
  contentHtml: string;
}

const KIND_LABEL: Record<NoteKind, string> = {
  project: 'Project',
  work: 'Work',
  involvement: 'Involvement',
  topic: 'Topic',
};

export function noteKindLabel(kind: NoteKind): string {
  return KIND_LABEL[kind];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isNoteKind(s: string): s is NoteKind {
  return (NOTE_KINDS as readonly string[]).includes(s);
}

function findCorpusDir(): string | null {
  const candidates = [
    path.join(process.cwd(), '..', 'python-rag', 'rag-docs', 'corpus'),
    path.join(process.cwd(), 'python-rag', 'rag-docs', 'corpus'),
    path.join(process.cwd(), 'rag-docs', 'corpus'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return null;
}

// Split markdown into lines, tracking fenced code blocks so heading logic
// never fires on a `# comment` inside a snippet.
function eachProseLine(md: string, fn: (line: string, i: number) => string | void): string[] {
  const out: string[] = [];
  let inFence = false;
  md.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const replaced = inFence || /^\s*(```|~~~)/.test(line) ? undefined : fn(line, i);
    out.push(typeof replaced === 'string' ? replaced : line);
  });
  return out;
}

interface ParsedHeading {
  level: number;
  text: string;
}

function collectHeadings(md: string): ParsedHeading[] {
  const found: ParsedHeading[] = [];
  eachProseLine(md, (line) => {
    const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (m) found.push({ level: m[1].length, text: m[2].trim() });
  });
  return found;
}

// Corpus files are inconsistent about where they start: some open at `#`,
// most at `##`. Normalize so the shallowest heading in the file always
// renders as <h2>, sitting correctly under the page's single <h1>.
function normalizeHeadingLevels(md: string, minLevel: number): string {
  const shift = 2 - minLevel;
  if (shift === 0) return md;
  return eachProseLine(md, (line) => {
    const m = /^(#{1,6})(\s+.*)$/.exec(line);
    if (!m) return;
    const level = Math.min(6, Math.max(1, m[1].length + shift));
    return '#'.repeat(level) + m[2];
  }).join('\n');
}

// remark-html emits bare <h2>/<h3>. Inject stable ids so the table of
// contents and any external deep link resolve.
function injectHeadingIds(rendered: string, ids: Map<string, string>): string {
  return rendered.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (full, level: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = ids.get(text) ?? slugify(text);
    if (!id) return full;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

function firstParagraph(md: string): string {
  const lines = md.split('\n');
  const buf: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (buf.length) break;
      continue;
    }
    if (t.startsWith('#') || t.startsWith('---')) {
      if (buf.length) break;
      continue;
    }
    buf.push(t);
  }
  return buf
    .join(' ')
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '));
  return `${cut.slice(0, lastStop > 60 ? lastStop : max).trim()}…`;
}

interface Resolved {
  title: string;
  subtitle: string;
  meta: string;
  sourceHref: string | null;
  sourceLabel: string | null;
}

// Map a corpus file back to the artifact it describes so the note can link
// to the canonical page (and the canonical page can link to the note).
function resolveArtifact(kind: NoteKind, slug: string): Resolved {
  if (kind === 'project') {
    const p = projects.find((x) => x.id === slug);
    if (p) {
      return {
        title: p.title,
        subtitle: p.tools,
        meta: p.date,
        sourceHref: `/projects#${p.id}`,
        sourceLabel: 'Projects',
      };
    }
  }

  if (kind === 'work') {
    const job = getJobsFromYaml().find((j) => slugify(j.company) === slug);
    if (job) {
      return {
        title: job.company,
        subtitle: `${job.title} · ${job.year}`,
        meta: `${job.title} · ${job.year}`,
        sourceHref: `/work#${slug}`,
        sourceLabel: 'Work',
      };
    }
  }

  if (kind === 'involvement') {
    const inv = getInvolvementsFromYaml().find((i) => i.slug === slug);
    if (inv) {
      return {
        title: inv.title || inv.org || slug,
        subtitle: [inv.role, inv.date].filter(Boolean).join(' · '),
        meta: [inv.role, inv.date].filter(Boolean).join(' · '),
        sourceHref: `/involvement#${inv.slug}`,
        sourceLabel: 'Involvement',
      };
    }
  }

  if (kind === 'topic') {
    const topic = resolveTopic(slug);
    return {
      title: topic.title,
      subtitle: topic.tagline,
      // Taglines are full sentences; uppercase mono mangles them.
      meta: '',
      sourceHref: null,
      sourceLabel: null,
    };
  }

  // Corpus file with no matching artifact (renamed project, retired role).
  // Still worth publishing — just without a backlink.
  return {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subtitle: '',
    meta: '',
    sourceHref: null,
    sourceLabel: null,
  };
}

interface RawNote {
  meta: NoteMeta;
  markdown: string;
}

let cache: RawNote[] | null = null;

function loadAll(): RawNote[] {
  if (cache) return cache;
  const dir = findCorpusDir();
  if (!dir) {
    cache = [];
    return cache;
  }

  const notes: RawNote[] = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.md')) continue;

    const underscore = name.indexOf('_');
    if (underscore < 1) continue;
    const kind = name.slice(0, underscore);
    if (!isNoteKind(kind)) continue;
    const slug = name.slice(underscore + 1, -3);
    if (!slug) continue;

    let raw: string;
    try {
      raw = fs.readFileSync(path.join(dir, name), 'utf8');
    } catch {
      continue;
    }

    const { data, content } = matter(raw);
    if (data.public === false) continue;
    const markdown = content.trim();
    if (!markdown) continue;

    const parsed = collectHeadings(markdown);
    const minLevel = parsed.length ? Math.min(...parsed.map((h) => h.level)) : 2;
    const seen = new Map<string, number>();
    const headings: NoteHeading[] = parsed
      .filter((h) => h.level <= minLevel + 1)
      .map((h) => {
        const base = slugify(h.text) || 'section';
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        return { id: n ? `${base}-${n}` : base, text: h.text, depth: h.level - minLevel };
      });

    const resolved = resolveArtifact(kind, slug);
    notes.push({
      markdown,
      meta: {
        kind,
        slug,
        file: name,
        title: resolved.title,
        subtitle: resolved.subtitle,
        meta: resolved.meta,
        summary: truncate(firstParagraph(markdown), 200),
        topics: Array.isArray(data.topics)
          ? data.topics.filter((t: unknown): t is string => typeof t === 'string')
          : [],
        headings,
        sourceHref: resolved.sourceHref,
        sourceLabel: resolved.sourceLabel,
        wordCount: markdown.split(/\s+/).filter(Boolean).length,
      },
    });
  }

  const order: Record<NoteKind, number> = { project: 0, work: 1, involvement: 2, topic: 3 };
  notes.sort(
    (a, b) =>
      order[a.meta.kind] - order[b.meta.kind] || a.meta.title.localeCompare(b.meta.title),
  );
  cache = notes;
  return cache;
}

export function getAllNotes(): NoteMeta[] {
  return loadAll().map((n) => n.meta);
}

export function getNotesByKind(kind: NoteKind): NoteMeta[] {
  return getAllNotes().filter((n) => n.kind === kind);
}

// Lookup used by the artifact pages to decide whether to render a
// "Read the notes" button. Returns null when no corpus file exists yet.
export function findNote(kind: NoteKind, slug: string): NoteMeta | null {
  return loadAll().find((n) => n.meta.kind === kind && n.meta.slug === slug)?.meta ?? null;
}

export function getNoteMarkdown(kind: NoteKind, slug: string): string | null {
  return loadAll().find((n) => n.meta.kind === kind && n.meta.slug === slug)?.markdown ?? null;
}

export async function getNote(kind: NoteKind, slug: string): Promise<Note | null> {
  const found = loadAll().find((n) => n.meta.kind === kind && n.meta.slug === slug);
  if (!found) return null;

  const parsed = collectHeadings(found.markdown);
  const minLevel = parsed.length ? Math.min(...parsed.map((h) => h.level)) : 2;
  const normalized = normalizeHeadingLevels(found.markdown, minLevel);

  const ids = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const h of parsed) {
    const base = slugify(h.text) || 'section';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (!ids.has(h.text)) ids.set(h.text, n ? `${base}-${n}` : base);
  }

  const processed = await remark().use(html, { sanitize: false }).process(normalized);
  return {
    ...found.meta,
    markdown: found.markdown,
    contentHtml: injectHeadingIds(processed.toString(), ids),
  };
}

export function noteHref(kind: NoteKind, slug: string): string {
  return `/notes/${kind}/${slug}`;
}
