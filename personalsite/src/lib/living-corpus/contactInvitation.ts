import { corpusItemHref } from "./links";

export const CONTACT_NOTE_ID = "topic:what-im-looking-for";
export const CONTACT_NOTE_HREF = corpusItemHref("writing", CONTACT_NOTE_ID);
export const CONTACT_TOPICS = [
  { label: "live AI", section: "live-ai" },
  { label: "invisible wearables", section: "invisible-wearables" },
  { label: "internet infrastructure for AI agents", section: "internet-infrastructure-for-ai-agents" },
] as const;
