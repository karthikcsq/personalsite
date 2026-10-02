export const MINIMAL_CATEGORIES = [
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "writing", label: "Writing" },
  { id: "involvement", label: "Involvement" },
] as const;

export type MinimalCategory = (typeof MINIMAL_CATEGORIES)[number]["id"];

export type MinimalCorpusMedia =
  | {
      type: "image";
      src: string;
      alt: string;
      width: number;
      height: number;
    }
  | {
      type: "embed";
      src: string;
      title: string;
      height: number;
    };

export interface MinimalCorpusItem {
  id: string;
  category: MinimalCategory;
  title: string;
  meta: string;
  description: string;
  href: string;
  fullTextHref?: string;
  links?: Array<{ label: string; url: string }>;
  referenceItems: string[];
  media: MinimalCorpusMedia[];
  sections: Array<{
    id: string;
    heading: string;
    text: string;
    media: MinimalCorpusMedia[];
  }>;
}

export function readableSections(item: MinimalCorpusItem): MinimalCorpusItem["sections"] {
  const normalizedDescription = item.description.trim().replace(/\s+/g, " ");
  return item.sections.filter(
    (section) => section.text.trim().replace(/\s+/g, " ") !== normalizedDescription,
  );
}
