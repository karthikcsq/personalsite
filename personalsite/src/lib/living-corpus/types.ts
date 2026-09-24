export const CORPUS_CATEGORIES = [
  "work",
  "projects",
  "ideas",
  "writing",
  "involvement",
  "personal",
] as const;

export type CorpusCategory = (typeof CORPUS_CATEGORIES)[number];

export interface CorpusQuote {
  id: string;
  heading: string;
  text: string;
  href: string;
  source: string;
}

export type CorpusSection = CorpusQuote;

export interface CorpusMedia {
  type: "image";
  src: string;
  alt: string;
  caption: string;
}

export interface CorpusArtifact {
  id: string;
  category: CorpusCategory;
  title: string;
  meta: string;
  description: string;
  referenceItems: string[];
  href: string;
  topics: string[];
  quotes: CorpusQuote[];
  sections: CorpusSection[];
  media?: CorpusMedia;
}

export interface LivingCorpusPayload {
  artifacts: CorpusArtifact[];
}

export const JOURNEY_TOPIC_IDS = ["ai", "research", "products", "founders"] as const;

export type JourneyTopicId = (typeof JOURNEY_TOPIC_IDS)[number];

export interface JourneyNoteSection {
  id: string;
  heading: string;
  text: string;
}

export interface JourneyNode {
  id: string;
  artifactId: string;
  category: CorpusCategory;
  title: string;
  meta: string;
  heading: string;
  sectionId: string;
  text: string;
  href: string;
  topics: string[];
  label: string;
  context: string;
  summary: string;
  referenceItems: string[];
  sections: JourneyNoteSection[];
  media?: CorpusMedia;
}

export interface JourneyEntry {
  id: JourneyTopicId;
  label: string;
  node: JourneyNode;
}

export interface JourneyBootstrap {
  entries: JourneyEntry[];
}

export interface JourneyOption {
  label: string;
  node: JourneyNode;
}

export interface JourneyNextResponse {
  currentNodeId: string;
  options: JourneyOption[];
  complete: boolean;
  confidence: number;
  selectionMode: "typesafe" | "authored";
}

export interface AttentiveReveal {
  artifactId: string;
  quote: CorpusQuote | null;
  confidence: number;
}

export interface FailureExcerpt {
  id: string;
  artifactId: string;
  category: CorpusCategory;
  source: string;
  meta: string;
  heading: string;
  text: string;
  href: string;
}

export interface WhatBrokeResponse {
  excerpts: FailureExcerpt[];
  confidence: number;
  selectionMode: "typesafe" | "authored";
}
