import fs from "node:fs";
import { corpusItemHref } from "./links";
import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import path from "node:path";
import matter from "gray-matter";
import { projects } from "@/data/projectsData";
import { buildLivingCorpus } from "@/lib/living-corpus/buildLivingCorpus";
import {
  MINIMAL_CATEGORIES,
  type MinimalCategory,
  type MinimalCorpusItem,
  type MinimalCorpusMedia,
} from "@/lib/living-corpus/minimalTypes";

const VISIBLE_CATEGORIES = new Set<MinimalCategory>(
  MINIMAL_CATEGORIES.map(({ id }) => id),
);

const projectsById = new Map(projects.map((project) => [project.id, project]));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeMediaSource(value: string): string | null {
  const src = value.trim();
  if (src.startsWith("/")) return src;
  try {
    const url = new URL(src);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function projectMedia(artifactId: string): MinimalCorpusMedia[] {
  const project = projectsById.get(artifactId.replace(/^project:/, ""));
  if (!project) return [];

  const media: MinimalCorpusMedia[] = [];
  for (const image of project.display.images ?? []) {
    const src = safeMediaSource(image.src);
    if (!src) continue;
    media.push({
      type: "image",
      src,
      alt: image.alt,
      width: image.width,
      height: image.height,
    });
  }

  const embedSrc = project.display.embedUrl
    ? safeMediaSource(project.display.embedUrl)
    : null;
  if (embedSrc) {
    media.push({
      type: "embed",
      src: embedSrc,
      title: `${project.title} demo`,
      height: project.display.embedHeight ?? 375,
    });
  }
  return media;
}

function htmlAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}=["']([^"']+)["']`, "i").exec(tag);
  return match?.[1]?.trim() || null;
}

function mediaFromToken(
  token: string,
  fallbackTitle: string,
): MinimalCorpusMedia | null {
  if (token.startsWith("![")) {
    const match = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/.exec(
      token,
    );
    const src = match?.[2] ? safeMediaSource(match[2]) : null;
    if (!src) return null;
    return {
      type: "image",
      src,
      alt: match?.[1]?.trim() || fallbackTitle,
      width: 1200,
      height: 800,
    };
  }

  const srcValue = htmlAttribute(token, "src");
  const src = srcValue ? safeMediaSource(srcValue) : null;
  if (!src) return null;

  if (/^<iframe\b/i.test(token)) {
    const height = Number(htmlAttribute(token, "height"));
    return {
      type: "embed",
      src,
      title: htmlAttribute(token, "title") || fallbackTitle,
      height: Number.isFinite(height) && height > 0 ? height : 375,
    };
  }

  const width = Number(htmlAttribute(token, "width"));
  const height = Number(htmlAttribute(token, "height"));
  const naturalWidth = Number.isFinite(width) && width > 0 ? width : 1200;
  return {
    type: "image",
    src,
    alt: htmlAttribute(token, "alt") || fallbackTitle,
    width: naturalWidth,
    height:
      Number.isFinite(height) && height > 0
        ? height
        : Math.round(naturalWidth * (2 / 3)),
  };
}

function blogMediaBySection(
  artifactId: string,
  title: string,
): Map<string, MinimalCorpusMedia[]> {
  const slug = artifactId.replace(/^writing:/, "");
  const file = path.join(process.cwd(), "blog", "posts", `${slug}.md`);
  let markdown = "";
  try {
    markdown = matter(fs.readFileSync(file, "utf8")).content;
  } catch {
    return new Map();
  }

  const mediaBySection = new Map<string, MinimalCorpusMedia[]>();
  let sectionId = "overview";
  const mediaPattern = /!\[[^\]]*\]\([^)]+\)|<img\b[^>]*>|<iframe\b[^>]*>(?:<\/iframe>)?/gi;

  for (const line of markdown.split("\n")) {
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line.trim());
    if (headingMatch) sectionId = slugify(headingMatch[1]) || "overview";

    for (const match of line.matchAll(mediaPattern)) {
      const media = mediaFromToken(match[0], title);
      if (!media) continue;
      const existing = mediaBySection.get(sectionId) ?? [];
      existing.push(media);
      mediaBySection.set(sectionId, existing);
    }
  }
  return mediaBySection;
}

export function buildMinimalCorpusItems(): MinimalCorpusItem[] {
  const artifacts = buildLivingCorpus().artifacts;
  const involvementById = new Map(getInvolvementsFromYaml().map((item) => [`involvement:${item.slug}`, item]));
  const orderedArtifacts = [
    ...artifacts.filter((artifact) => artifact.category !== "ideas"),
    ...artifacts.filter((artifact) => artifact.category === "ideas"),
  ];
  return orderedArtifacts.flatMap<MinimalCorpusItem>((artifact) => {
    const category = artifact.category === "ideas" ? "writing" : artifact.category;
    if (!VISIBLE_CATEGORIES.has(category as MinimalCategory)) return [];
    const normalizedDescription = artifact.description.trim().toLowerCase();
    const isWriting = artifact.category === "writing";
    const writingMedia = isWriting
      ? blogMediaBySection(artifact.id, artifact.title)
      : new Map<string, MinimalCorpusMedia[]>();
    return [
      {
        id: artifact.id,
        category: category as MinimalCategory,
        title: artifact.title,
        meta: artifact.meta,
        description: artifact.description,
        href: corpusItemHref(category as MinimalCategory, artifact.id),
        fullTextHref: /^\/(blog|notes)\//.test(artifact.href) ? artifact.href : undefined,
        links: (artifact.category === "projects"
          ? projectsById.get(artifact.id.replace(/^project:/, ""))?.links
          : involvementById.get(artifact.id)?.links)?.map(({ label, url }) => ({ label, url })) ?? [],
        referenceItems: artifact.referenceItems.filter(
          (reference) => reference.trim().toLowerCase() !== normalizedDescription,
        ),
        media: artifact.category === "projects" ? projectMedia(artifact.id) : [],
        sections: artifact.sections.map((section) => ({
          id: section.id,
          heading: section.heading,
          text: section.text,
          media: writingMedia.get(section.id) ?? [],
        })),
      },
    ];
  });
}
