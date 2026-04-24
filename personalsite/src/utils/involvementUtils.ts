import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface Contribution {
  area: string;
  detail: string;
}

export interface InvolvementEntry {
  slug: string;
  title: string;
  role: string;
  org: string;
  tagline: string;
  link?: string;
  date: string;
  startDate: string;
  endDate: string;
  location?: string;
  tools?: string;
  whatItIs: string;
  myRole: string;
  contributions: Contribution[];
  pointOfView: string[];
  bullets: string[];
}

interface YamlContribution {
  area?: string;
  detail?: string;
}

interface YamlInvolvementItem {
  slug: string;
  title?: string;
  role: string;
  org?: string;
  tagline?: string;
  link?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  tools?: string;
  what_it_is?: string;
  my_role?: string;
  contributions?: YamlContribution[];
  point_of_view?: string[];
  bullets?: string[];
}

interface RootYaml {
  involvement?: YamlInvolvementItem[];
}

function readInvolvementYaml(): RootYaml | null {
  const candidates = [
    path.join(process.cwd(), '..', 'python-rag', 'rag-docs', 'involvement.yaml'),
    path.join(__dirname, 'involvement.yaml'),
    path.join(process.cwd(), 'rag-docs', 'involvement.yaml'),
    path.join(process.cwd(), '..', 'rag-docs', 'involvement.yaml'),
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
  console.error('Could not locate involvement.yaml in candidates:', candidates);
  return null;
}

function normalize(item: YamlInvolvementItem): InvolvementEntry {
  const start = item.start_date || '';
  const end = item.end_date || '';
  const date = item.date || (start && end ? `${start} - ${end}` : '');
  return {
    slug: item.slug,
    title: item.title || item.slug,
    role: item.role,
    org: item.org || item.title || item.slug,
    tagline: item.tagline || '',
    link: item.link,
    date,
    startDate: start,
    endDate: end,
    location: item.location,
    tools: item.tools,
    whatItIs: (item.what_it_is || '').trim(),
    myRole: (item.my_role || '').trim(),
    contributions: (item.contributions || []).map((c) => ({
      area: c.area || '',
      detail: (c.detail || '').trim(),
    })),
    pointOfView: (item.point_of_view || []).map((p) => p.trim()),
    bullets: item.bullets || [],
  };
}

export function getInvolvementsFromYaml(): InvolvementEntry[] {
  const data = readInvolvementYaml();
  if (!data || !data.involvement) return [];
  return data.involvement.map(normalize);
}

export function getInvolvementBySlug(slug: string): InvolvementEntry | undefined {
  return getInvolvementsFromYaml().find((i) => i.slug === slug);
}
