import projectsJson from './projects.json';

export interface ProjectLink {
  label: string;
  url: string;
  type: "github" | "devpost" | "website" | "npm" | "appstore" | "linkedin" | "arxiv" | "pdf" | "youtube" | "instagram";
}

export interface ProjectDisplay {
  embedUrl?: string;
  embedHeight?: number;
  images?: { src: string; alt: string; width: number; height: number }[];
}

export interface Project {
  id: string;
  title: string;
  date: string;
  description: string;
  ragNarrative: string;
  tools: string;
  links: ProjectLink[];
  display: ProjectDisplay;
  awards?: string;
}

export const projects: Project[] = projectsJson as Project[];
