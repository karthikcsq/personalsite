import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photos",
  description: "Photographs from Karthik Thyagarajan's travels, including Costa Rica, Hawaii, Kilimanjaro, Amsterdam, and San Francisco.",
  keywords: ["gallery", "photos", "travel", "Costa Rica", "Hawaii", "Kilimanjaro", "Amsterdam", "Karthik Thyagarajan"],
  alternates: { canonical: "/gallery" },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
