import { ImageResponse } from "next/og";

export const alt =
  "Karthik Thyagarajan — builder, researcher, engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default async function OpengraphImage() {
  const headline = "builder, researcher, engineer.";
  const eyebrow = "KARTHIK THYAGARAJAN";
  const url = "karthikthyagarajan.com";
  const fontText = `${headline}${eyebrow}${url}`;

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
            flexDirection: "column",
            fontFamily: "serif",
            fontSize: 116,
            lineHeight: 1.04,
            letterSpacing: -2.5,
            color: INK,
          }}
        >
          <span style={{ display: "flex" }}>builder, researcher,</span>
          <span style={{ display: "flex" }}>engineer.</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "mono",
            fontSize: 22,
            color: INK_MUTED,
          }}
        >
          <span style={{ display: "flex" }}>{url}</span>
          <span style={{ display: "flex" }}>Ask the site anything.</span>
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
