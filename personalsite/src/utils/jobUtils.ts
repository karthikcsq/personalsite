import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface JobEntry {
  title: string;
  company: string;
  description: string[];
  year: string; // combined date range
  color: string;
  icon: string; // path to icon under /public/companies
}

interface YamlExperienceItem {
  role: string;
  company: string;
  start_date: string; // e.g. "Jun 2025"
  end_date: string;   // e.g. "Present" or "Aug 2023"
  bullets: string[];
}

interface RootYaml {
  experience?: YamlExperienceItem[];
}

// Deterministic palette so each company always maps to same color.
const COLOR_PALETTE = [
  'rgb(65, 190, 184)',
  'rgb(211, 211, 211)',
  'rgb(27, 168, 203)',
  'rgb(1, 70, 15)',
  'rgb(4, 6, 136)',
  'rgb(168, 96, 250)',
  'rgb(172, 240, 255)'
];

// Simple icon filename inference: take first word of company lowercased and match existing file names manually map if needed.
const ICON_MAP: Record<string, string> = {
  'Peraton Labs': '/companies/peratonlabs.png',
  'Memories.ai': '/companies/memoriesai.png',
  'IDEAS Lab, Purdue University': '/companies/ideaslab.png',
  'The Data Mine Corporate Partners, Purdue University': '/companies/agrpa.png',
  'Naval Research Laboratory': '/companies/nrl.png',
  'Instachip (Formerly Procyon Photonics)': '/companies/procyon.png',
  'Fairfax County Public Schools': '/companies/fcps.png'
};

function getIconForCompany(company: string): string {
  if (ICON_MAP[company]) return ICON_MAP[company];
  // Fallback: attempt slug approach
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `/companies/${slug}.png`;
}

export function getJobsFromYaml(): JobEntry[] {
  // Resolution order:
  // 1. python-rag/rag-docs/ (correct location)
  // 2. Colocated file in this utils directory
  // 3. Legacy location under workspace root rag-docs/
  // 4. Parent rag-docs/ (if app nested)
  const candidates = [
    path.join(process.cwd(), '..', 'python-rag', 'rag-docs', 'karthik_thyagarajan_truth.yaml'),
    path.join(__dirname, 'karthik_thyagarajan_truth.yaml'),
    path.join(process.cwd(), 'rag-docs', 'karthik_thyagarajan_truth.yaml'),
    path.join(process.cwd(), '..', 'rag-docs', 'karthik_thyagarajan_truth.yaml')
  ];
  let raw: string | undefined;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        raw = fs.readFileSync(p, 'utf8');
        break;
      } catch {
        
      }
    }
  }
  if (!raw) {
    console.error('Could not locate YAML experience file in candidates:', candidates);
    return [];
  }
  let data: RootYaml;
  try {
    data = yaml.load(raw) as RootYaml;
  } catch (e) {
    console.error('Failed to parse YAML file', e);
    return [];
  }
  const experience = data.experience || [];

  // Map experience entries to JobEntry format.
  const jobs: JobEntry[] = experience.map((item, idx) => ({
    title: item.role,
    company: item.company,
    description: item.bullets,
    year: `${item.start_date} - ${item.end_date}`,
    color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
    icon: getIconForCompany(item.company)
  }));
  return jobs;
}
