import type { Metadata } from "next";
import { sectionMetadata } from "@/lib/og/sections";

export const metadata: Metadata = sectionMetadata("gallery", {
  keywords: ["gallery", "photos", "travel", "Costa Rica", "Hawaii", "Kilimanjaro", "Amsterdam", "Karthik Thyagarajan"],
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
