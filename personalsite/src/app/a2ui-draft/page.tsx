import type { Metadata } from "next";
import A2uiDraftClient from "@/app/a2ui-draft/A2uiDraftClient";

export const metadata: Metadata = {
  title: "A2UI interaction draft",
  description: "An interactive focal-scene draft for Karthik's portfolio chat.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function A2uiDraftPage() {
  return <A2uiDraftClient />;
}
