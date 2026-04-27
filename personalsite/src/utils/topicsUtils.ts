import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface TopicEntry {
  slug: string;
  title: string;
  tagline: string;
}

interface YamlTopicItem {
  slug?: string;
  title?: string;
  tagline?: string;
}

interface RootYaml {
  topics?: YamlTopicItem[];
}

function readTopicsYaml(): RootYaml | null {
  const candidates = [
    path.join(process.cwd(), '..', 'python-rag', 'rag-docs', 'topics.yaml'),
    path.join(__dirname, 'topics.yaml'),
    path.join(process.cwd(), 'rag-docs', 'topics.yaml'),
    path.join(process.cwd(), '..', 'rag-docs', 'topics.yaml'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, 'utf8');
      return yaml.load(raw) as RootYaml;
    } catch {
      // try next candidate
    }
  }
  return null;
}

let cache: TopicEntry[] | null = null;

export function getTopicsFromYaml(): TopicEntry[] {
  if (cache) return cache;
  const data = readTopicsYaml();
  const items = data?.topics ?? [];
  const entries: TopicEntry[] = [];
  for (const it of items) {
    if (!it || typeof it.slug !== 'string' || !it.slug.trim()) continue;
    entries.push({
      slug: it.slug.trim(),
      title: (it.title || `On ${it.slug}`).trim(),
      tagline: (it.tagline || '').trim(),
    });
  }
  cache = entries;
  return cache;
}

// Resolve a topic slug to its display title/tagline. Falls back to
// `title = "On <slug>"` and empty tagline when the slug isn't registered, so
// authoring a corpus file without updating topics.yaml still surfaces a tile.
export function resolveTopic(slug: string): TopicEntry {
  const found = getTopicsFromYaml().find((t) => t.slug === slug);
  if (found) return found;
  return { slug, title: `On ${slug.replace(/-/g, ' ')}`, tagline: '' };
}
