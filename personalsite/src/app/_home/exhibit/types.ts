export type PlateKey = "router" | "parm" | "tavi" | "mcp" | "repple" | "buildpurdue" | "peraton" | "memories" | "qkd" | "samsung";

export interface ExhibitEntry {
  plate: PlateKey;
  id: string;
  title: string;
  meta: string;
  /** Verbatim from his description. */
  line: string;
  href: string;
  /** A second way in, e.g. a paper. */
  also?: { label: string; href: string };
  visuals: { src: string; alt: string }[];
}

export interface ExhibitEssay {
  slug: string;
  title: string;
  dateLabel: string;
  readingMinutes: number;
  href: string;
}

export interface ExhibitRest {
  id: string;
  title: string;
  meta: string;
  href: string;
}
