import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Dynamic OG image for /?q=<prompt> deep links. Renders the prompt as a
// chat bubble in the site's cream/vermilion palette, matching the static
// opengraph-image.tsx so a shared link card feels like an extension of the
// brand rather than a generic fallback.

const CREAM = "#efe7d3";
const INK = "#241d18";
const INK_MUTED = "#5a4f44";
const VERMILION = "#c8391c";
const BUBBLE_BORDER = "#d8ccb3";

const SIZE = { width: 1200, height: 630 };
const MAX_PROMPT = 200;
const TRUNCATE_AT = 180;

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
  if (!match) throw new Error(`Failed to load font ${family} (${style} ${weight})`);
  return await (await fetch(match[1])).arrayBuffer();
}

function readPromptParam(searchParams: URLSearchParams): string {
  const raw = searchParams.get("q") ?? "";
  const trimmed = raw.trim().slice(0, MAX_PROMPT);
  if (trimmed.length <= TRUNCATE_AT) return trimmed;
  return trimmed.slice(0, TRUNCATE_AT - 1).trimEnd() + "…";
}

// Pick a prompt font size that keeps long quotes readable without wrapping
// past the bubble. Calibrated by character count rather than measuring real
// text width — the OG renderer can't measure layout before render.
function promptFontSize(prompt: string): number {
  const len = prompt.length;
  if (len <= 50) return 84;
  if (len <= 90) return 68;
  if (len <= 130) return 56;
  return 46;
}

export async function GET(req: NextRequest) {
  const prompt = readPromptParam(req.nextUrl.searchParams);
  const fallback = "Ask the site anything.";
  const display = prompt || fallback;

  // Glyph subset: every char that appears in the rendered image. Keeps the
  // font payload tiny (no full Source Serif 4 download per request).
  const eyebrow = "ASK KARTHIK";
  const footerLeft = "karthikthyagarajan.com";
  const footerRight = "Karthik Thyagarajan";
  const fontText = `${display}${eyebrow}${footerLeft}${footerRight}“”`;

  const [serifItalic, mono, sans] = await Promise.all([
    loadGoogleFont("Source Serif 4", 500, "italic", fontText),
    loadGoogleFont("JetBrains Mono", 500, "normal", eyebrow),
    loadGoogleFont("Host Grotesk", 500, "normal", `${footerLeft}${footerRight}`),
  ]);

  const size = promptFontSize(display);

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
          padding: "72px 84px",
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
              fontSize: 22,
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
            background: "#fbf5e6",
            border: `2px solid ${BUBBLE_BORDER}`,
            borderRadius: 28,
            padding: "44px 56px",
            maxWidth: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "serif",
              fontStyle: "italic",
              fontSize: size,
              lineHeight: 1.18,
              letterSpacing: -0.5,
              color: INK,
            }}
          >
            {`\u201C${display}\u201D`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "sans",
            fontSize: 22,
            color: INK_MUTED,
          }}
        >
          <span style={{ display: "flex" }}>{footerLeft}</span>
          <span style={{ display: "flex" }}>{footerRight}</span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "serif", data: serifItalic, style: "italic", weight: 500 },
        { name: "mono", data: mono, style: "normal", weight: 500 },
        { name: "sans", data: sans, style: "normal", weight: 500 },
      ],
      headers: {
        // Shared link previews are re-fetched by every scraper that sees
        // the URL. Cache at the edge for a day so repeated previews of the
        // same prompt don't re-render the image.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable",
      },
    },
  );
}
