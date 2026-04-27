import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface Contribution {
  area: string;
  detail: string;
}

export interface InvolvementLink {
  label: string;
  url: string;
  type:
    | "github"
    | "devpost"
    | "website"
    | "npm"
    | "appstore"
    | "linkedin"
    | "arxiv"
    | "pdf"
    | "youtube";
}

export interface InvolvementEntry {
  slug: string;
  title: string;
  role: string;
  org: string;
  tagline: string;
  link?: string;
  links: InvolvementLink[];
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

interface YamlLink {
  label?: string;
  url?: string;
  type?: string;
}

interface YamlInvolvementItem {
  slug: string;
  title?: string;
  role: string;
  org?: string;
  tagline?: string;
  link?: string;
  links?: YamlLink[];
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
  const linkTypes = new Set([
    'github', 'devpost', 'website', 'npm', 'appstore',
    'linkedin', 'arxiv', 'pdf', 'youtube',
  ]);
  const inferType = (url: string): InvolvementLink['type'] => {
    const u = url.toLowerCase();
    if (u.includes('github.com')) return 'github';
    if (u.includes('devpost.com')) return 'devpost';
    if (u.includes('npmjs.com')) return 'npm';
    if (u.includes('apps.apple.com')) return 'appstore';
    if (u.includes('linkedin.com')) return 'linkedin';
    if (u.includes('arxiv.org')) return 'arxiv';
    if (u.endsWith('.pdf')) return 'pdf';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    return 'website';
  };
  const explicitLinks: InvolvementLink[] = (item.links || [])
    .filter((l): l is YamlLink & { url: string } => !!l && typeof l.url === 'string')
    .map((l) => {
      const type = (l.type && linkTypes.has(l.type) ? l.type : inferType(l.url)) as InvolvementLink['type'];
      return { label: l.label || type, url: l.url, type };
    });
  const links: InvolvementLink[] = [...explicitLinks];
  if (item.link && !links.some((l) => l.url === item.link)) {
    const type = inferType(item.link);
    links.unshift({ label: type, url: item.link, type });
  }
  return {
    slug: item.slug,
    title: item.title || item.slug,
    role: item.role,
    org: item.org || item.title || item.slug,
    tagline: item.tagline || '',
    link: item.link,
    links,
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
