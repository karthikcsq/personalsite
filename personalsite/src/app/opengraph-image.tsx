import { ImageResponse } from "next/og";
import { OG_COLORS, OgCorpusFrame } from "@/app/og-brand";

export const alt =
  "Karthik Thyagarajan — Researcher, Builder, Writer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default async function OpengraphImage() {
  const headline = "Researcher, Builder, Writer.";
  const eyebrow = "KARTHIK THYAGARAJAN";
  const url = "karthikthyagarajan.com";
  const fontText = `${headline}${eyebrow}${url}`;

  const [sans, mono] = await Promise.all([
    loadGoogleFont("Karla", 500, fontText),
    loadGoogleFont("JetBrains Mono", 500, fontText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: OG_COLORS.surface,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 0,
          color: OG_COLORS.ink,
        }}
      >
        <OgCorpusFrame />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "84px 140px" }}>
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
              fontSize: 22,
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
            flexDirection: "column",
            fontFamily: "sans",
            fontSize: 68,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: -2,
            color: OG_COLORS.ink,
          }}
        >
          <span style={{ display: "flex" }}>Researcher, Builder,</span>
          <span style={{ display: "flex" }}>Writer.</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "mono",
            fontSize: 22,
            color: OG_COLORS.inkMuted,
          }}
        >
          <span style={{ display: "flex" }}>{url}</span>
          <span style={{ display: "flex" }}>Work · Projects · Writing · Involvement</span>
        </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "sans", data: sans, style: "normal", weight: 500 },
        { name: "mono", data: mono, style: "normal", weight: 500 },
      ],
    },
  );
}
