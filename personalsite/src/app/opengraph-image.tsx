import { OG_CONTENT_TYPE, OG_SIZE, renderHomeCard } from "@/lib/og/card";
import { CONTACT_TOPICS } from "@/lib/living-corpus/contactInvitation";

export const alt = "Karthik Thyagarajan — researcher, builder, writer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  const topics = CONTACT_TOPICS.map((t) => t.label);
  const interests = `Interested in ${topics.slice(0, -1).join(", ")}, and ${topics.at(-1)}.`;
  return renderHomeCard({ tagline: "Researcher, builder, writer.", interests });
}
