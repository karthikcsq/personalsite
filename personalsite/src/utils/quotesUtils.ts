import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface CorpusFile {
  slug: string;        // filename without .md
  applies_to: string[]; // artifact ids: project:foo, work:bar, involvement:baz, blog:slug, topic:slug
  topics: string[];
  body: string;        // post-frontmatter markdown content
}

function findCorpusDir(): string | null {
  const candidates = [
    path.join(process.cwd(), '..', 'python-rag', 'rag-docs', 'corpus'),
    path.join(process.cwd(), 'python-rag', 'rag-docs', 'corpus'),
    path.join(process.cwd(), 'rag-docs', 'corpus'),
    path.join(__dirname, '..', '..', '..', 'python-rag', 'rag-docs', 'corpus'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return null;
}

// Resolve a blog slug to its source post body. Reads
// `personalsite/blog/posts/<slug>.md`, strips frontmatter, returns the
// markdown body (or null if the file doesn't exist). Blog posts are
// authoritative Karthik prose — the picker reads them directly instead of
// requiring a copied corpus file.
function readBlogPostBody(slug: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'blog', 'posts', `${slug}.md`),
    path.join(process.cwd(), '..', 'personalsite', 'blog', 'posts', `${slug}.md`),
    path.join(__dirname, '..', '..', '..', 'blog', 'posts', `${slug}.md`),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const { content } = matter(raw);
      return content.trim();
    } catch {
      continue;
    }
  }
  return null;
}

let cache: CorpusFile[] | null = null;

function loadAll(): CorpusFile[] {
  if (cache) return cache;
  const dir = findCorpusDir();
  if (!dir) {
    cache = [];
    return cache;
  }
  const files: CorpusFile[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const full = path.join(dir, name);
    let raw: string;
    try {
      raw = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    const { data, content } = matter(raw);
    const body = content.trim();
    // Skip empty corpus files (frontmatter only, no prose). Without this
    // the picker gets handed a body-less CORPUS section and hallucinates
    // plausible-sounding sentences from training knowledge of the artifact
    // name — every candidate fails verbatim check, but the wasted picker
    // call still pollutes the log.
    if (!body) continue;
    const applies_to = Array.isArray(data.applies_to)
      ? data.applies_to.filter((x): x is string => typeof x === 'string')
      : [];
    const topics = Array.isArray(data.topics)
      ? data.topics.filter((x): x is string => typeof x === 'string')
      : [];
    files.push({
      slug: name.replace(/\.md$/, ''),
      applies_to,
      topics,
      body,
    });
  }
  cache = files;
  return cache;
}

// Corpus body for an artifact id.
//   - For `blog:<slug>`: read the source blog post directly from
//     `blog/posts/<slug>.md`. The post IS the corpus. Corpus files are
//     never consulted for blog artifacts (the post is authoritative; any
//     manual commentary would just diverge).
//   - For everything else (`work`, `project`, `involvement`, `topic`):
//     concatenate every corpus file whose `applies_to` includes the id.
// Returns "" if no source matches.
export function getCorpusForArtifact(id: string): string {
  if (id.startsWith('blog:')) {
    const slug = id.slice(5);
    const body = readBlogPostBody(slug);
    return body ?? '';
  }

  const pieces: string[] = [];
  for (const f of loadAll()) {
    if (f.applies_to.includes(id)) {
      pieces.push(`--- ${f.slug} ---\n${f.body}`);
    }
  }
  return pieces.join('\n\n');
}

// Test/diagnostic helper.
export function listCorpusFiles(): CorpusFile[] {
  return loadAll();
}
