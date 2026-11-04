import { OG_CONTENT_TYPE, OG_SIZE, renderArticleCard } from "@/lib/og/card";
import { SECTIONS } from "@/lib/og/sections";

const section = SECTIONS.projects;

export const alt = `${section.title} — Karthik Thyagarajan`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return renderArticleCard({ title: section.title, subtitle: section.blurb });
}
