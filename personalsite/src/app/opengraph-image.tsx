import { OG_CONTENT_TYPE, OG_SIZE, renderHomeCard } from "@/lib/og/card";
import { CONTACT_TOPICS } from "@/lib/living-corpus/contactInvitation";

export const alt = "Karthik Thyagarajan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Same invitation the home page shows under the name.
export default async function OpengraphImage() {
  const topics = CONTACT_TOPICS.map((t) => t.label);
  const line = `Interested in ${topics.slice(0, -1).join(", ")}, or ${topics.at(-1)}.`;
  return renderHomeCard({ line });
}
