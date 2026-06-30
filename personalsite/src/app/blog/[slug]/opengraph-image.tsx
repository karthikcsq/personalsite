import { ImageResponse } from "next/og";
import { getPostBySlug, getSortedPosts } from "@/utils/blogUtils";
import { OG_COLORS, OgBotanicalFrame } from "@/app/og-brand";

export const alt = "Blog post by Karthik Thyagarajan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getSortedPosts().map((p) => ({ slug: p.slug }));
}

async function loadGoogleFont(
  family: string,
  weight: number,
  style: "normal" | "italic",
  text: string,
): Promise<ArrayBuffer> {
  const styleParam = style === "italic" ? "ital,wght@1," : "wght@";
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:${styleParam}${weight}&text=${encodeURIComponent(text)}`;
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
    loadGoogleFont("Source Serif 4", 500, "italic", fontText),
    loadGoogleFont("JetBrains Mono", 500, "normal", fontText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: OG_COLORS.surface,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "84px 96px",
          color: OG_COLORS.ink,
        }}
      >
        <OgBotanicalFrame />
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
              background: OG_COLORS.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "mono",
              fontSize: 20,
              letterSpacing: 5,
              color: OG_COLORS.accent,
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: titleFontSize(post.title),
            lineHeight: 1.08,
            letterSpacing: -1.6,
            color: OG_COLORS.ink,
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
            color: OG_COLORS.inkMuted,
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
        { name: "serif", data: serif, style: "italic", weight: 500 },
        { name: "mono", data: mono, style: "normal", weight: 500 },
      ],
    },
  );
}
