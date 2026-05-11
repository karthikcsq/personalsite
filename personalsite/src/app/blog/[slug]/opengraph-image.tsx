import { ImageResponse } from "next/og";
import { getPostBySlug, getSortedPosts } from "@/utils/blogUtils";

export const alt = "Blog post by Karthik Thyagarajan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getSortedPosts().map((p) => ({ slug: p.slug }));
}

const CREAM = "#efe7d3";
const INK = "#241d18";
const INK_MUTED = "#5a4f44";
const VERMILION = "#c8391c";

async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\((.+?)\) format/);
  if (!match) throw new Error(`Failed to load font ${family}`);
  return await (await fetch(match[1])).arrayBuffer();
}

function titleFontSize(title: string): number {
  const len = title.length;
  if (len <= 28) return 104;
  if (len <= 48) return 84;
  if (len <= 72) return 68;
  if (len <= 100) return 56;
  return 48;
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

export default async function BlogOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved = await params;
  const post = await getPostBySlug(resolved.slug);
  const date = formatDate(post.date);
  const eyebrow = "ESSAY · KARTHIK THYAGARAJAN";
  const url = "karthikthyagarajan.com";
  const fontText = `${post.title}${date}${eyebrow}${url}`;

  const [serif, mono] = await Promise.all([
    loadGoogleFont("Source Serif 4", 600, fontText),
    loadGoogleFont("JetBrains Mono", 500, fontText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "84px 96px",
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 36,
              height: 4,
              background: VERMILION,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "mono",
              fontSize: 20,
              letterSpacing: 5,
              color: VERMILION,
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "serif",
            fontSize: titleFontSize(post.title),
            lineHeight: 1.08,
            letterSpacing: -1.6,
            color: INK,
            maxWidth: 1010,
          }}
        >
          {post.title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "mono",
            fontSize: 20,
            color: INK_MUTED,
          }}
        >
          <span style={{ display: "flex" }}>{date}</span>
          <span style={{ display: "flex" }}>{url}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "serif", data: serif, style: "normal", weight: 600 },
        { name: "mono", data: mono, style: "normal", weight: 500 },
      ],
    },
  );
}
