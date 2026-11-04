import type { Metadata } from "next";

// One place for each section's share copy. Both the page metadata and the
// section's opengraph-image.tsx read from here, so the preview text and the
// card always agree. `description` feeds search and link previews; `blurb` is
// the shorter line on the card itself, which already shows the name.

export const SITE_NAME = "Karthik Thyagarajan";

export const SECTIONS = {
  about: {
    title: "About",
    path: "/about",
    blurb: "A builder, researcher, and writer studying Computer Science and AI at Purdue.",
    description:
      "Karthik Thyagarajan — a builder, researcher, and writer studying Computer Science and AI at Purdue.",
  },
  work: {
    title: "Work",
    path: "/work",
    blurb: "Roles, research positions, and what I built in each.",
    description: "Karthik Thyagarajan's roles, research positions, and what he built in each.",
  },
  projects: {
    title: "Projects",
    path: "/projects",
    blurb: "From AI agents and on-device AI to robotics and quantum key distribution.",
    description:
      "Things Karthik Thyagarajan has built, from AI agents and on-device AI to robotics and quantum key distribution.",
  },
  writing: {
    title: "Writing",
    path: "/writing",
    blurb: "Essays and notes on AI, work, and building things.",
    description: "Essays and notes by Karthik Thyagarajan on AI, work, and building things.",
  },
  involvement: {
    title: "Involvement",
    path: "/involvement",
    blurb: "The communities and organizations I’m part of.",
    description: "The communities and organizations Karthik Thyagarajan is part of.",
  },
  brief: {
    title: "For founders and hiring teams",
    path: "/brief",
    blurb: "Startup and founding-team experience, technical ownership, shipped products, and the evidence behind them.",
    description:
      "Karthik Thyagarajan's startup and founding-team experience, technical ownership, shipped products, and supporting evidence.",
  },
  gallery: {
    title: "Photos",
    path: "/gallery",
    blurb: "Costa Rica, Hawaii, Kilimanjaro, Amsterdam, San Francisco, and more.",
    description:
      "Photographs from Karthik Thyagarajan's travels, including Costa Rica, Hawaii, Kilimanjaro, Amsterdam, and San Francisco.",
  },
} as const;

export type SectionKey = keyof typeof SECTIONS;

// A page's `openGraph` replaces the root layout's object wholesale rather than
// merging with it, so every field has to be restated here. Without this,
// sharing /work showed the home page's title and URL.
export function sectionMetadata(key: SectionKey, extra: Metadata = {}): Metadata {
  const { title, path, description } = SECTIONS[key];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url: path,
      title: `${title} · ${SITE_NAME}`,
      description,
    },
    ...extra,
  };
}
