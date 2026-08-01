import { NextResponse } from "next/server";
import { loadGalleryIndex } from "@/utils/galleryIndex";

const galleryCacheHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    return NextResponse.json(await loadGalleryIndex(), {
      status: 200,
      headers: galleryCacheHeaders,
    });
  } catch (error) {
    console.error("Error fetching gallery data from S3:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery data" },
      { status: 500 },
    );
  }
}
