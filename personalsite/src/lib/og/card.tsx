import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Shared renderer for every Open Graph card on the site. The cards borrow the
// home page's look: the sunset sky, the glowing sun in the top-left, Karla for
// headlines and Source Serif italic for the "voice" line.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const SITE_HOST = "karthikthyagarajan.com";
const NAME = "Karthik Thyagarajan";

const INK = "#202124";
const INK_MUTED = "#4a4f58";
const INK_SOFT = "#6b707a";
const ACCENT = "#f14b29";

// Satori can't decode WebP, so the sky and headshot live as JPEG copies in
// assets/og/ (made from public/living-corpus/sunset-sky.webp and
// public/karthik-headshot.jpg).
async function assetDataUrl(file: string): Promise<string> {
  const data = await readFile(join(process.cwd(), "assets/og", file), "base64");
  return `data:image/jpeg;base64,${data}`;
}

type FontSpec = {
  name: "sans" | "serif" | "mono";
  family: string;
  weight: 400 | 500;
  style: "normal" | "italic";
};

const FONTS: FontSpec[] = [
  { name: "sans", family: "Karla", weight: 500, style: "normal" },
  { name: "serif", family: "Source Serif 4", weight: 400, style: "italic" },
  { name: "mono", family: "JetBrains Mono", weight: 500, style: "normal" },
];

// Fetches only the glyphs the card uses. A failed fetch drops that font
// instead of failing the build; Satori falls back to its bundled sans.
async function loadFont(spec: FontSpec, text: string) {
  const axis = spec.style === "italic" ? `ital,wght@1,${spec.weight}` : `wght@${spec.weight}`;
  const url = `https://fonts.googleapis.com/css2?family=${spec.family.replace(/ /g, "+")}:${axis}&text=${encodeURIComponent(text)}`;
  try {
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!src) return null;
    const data = await (await fetch(src)).arrayBuffer();
    return { name: spec.name, data, weight: spec.weight, style: spec.style };
  } catch {
    return null;
  }
}

async function loadFonts(text: string) {
  const loaded = await Promise.all(FONTS.map((f) => loadFont(f, text)));
  return loaded.filter((f): f is NonNullable<typeof f> => f !== null);
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.—-]+$/, "")}…`;
}

function titleSize(title: string): number {
  const len = title.length;
  if (len <= 20) return 84;
  if (len <= 36) return 72;
  if (len <= 60) return 62;
  if (len <= 90) return 52;
  return 46;
}

function Sky({ sky }: { sky: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sky} width={1200} height={675} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
      {/* Same white wash the live site lays over the sky, plus a gentle fade
          toward the bottom-right so dark text always has contrast. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(105deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.38) 55%, rgba(255,255,255,0.62) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 58,
          left: 70,
          width: 46,
          height: 46,
          borderRadius: 9999,
          background: "#ffffff",
          boxShadow:
            "0 0 18px 7px rgba(255,255,255,0.95), 0 0 45px 15px rgba(255,245,234,0.85), 0 0 100px 35px rgba(255,224,200,0.4)",
          display: "flex",
        }}
      />
    </>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", width: 32, height: 3, background: ACCENT }} />
      <div
        style={{
          display: "flex",
          fontFamily: "mono",
          fontSize: 20,
          letterSpacing: 4,
          color: ACCENT,
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export type ArticleCardInput = {
  /** Small uppercase label above the title, e.g. "Essay" or "Project · Notes". */
  eyebrow?: string;
  title: string;
  /** Rendered in serif italic under the title. Truncated to fit. */
  subtitle?: string;
  /** Right side of the footer, e.g. a publish date. Defaults to the domain. */
  meta?: string;
};

/** Card for a single page: blog posts, notes, and section landing pages. */
export async function renderArticleCard({ eyebrow, title, subtitle, meta }: ArticleCardInput) {
  const sub = subtitle ? truncate(subtitle, title.length > 60 ? 120 : 170) : "";
  const right = meta ?? SITE_HOST;
  const [sky, headshot, fonts] = await Promise.all([
    assetDataUrl("sky.jpg"),
    assetDataUrl("headshot.jpg"),
    loadFonts(`${eyebrow ?? ""}${(eyebrow ?? "").toUpperCase()}${title}${sub}${NAME}${right}…`),
  ]);
  const size = titleSize(title);

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", color: INK }}>
        <Sky sky={sky} />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "150px 96px 64px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {eyebrow && <Eyebrow text={eyebrow} />}
            <div
              style={{
                display: "flex",
                fontFamily: "sans",
                fontWeight: 500,
                fontSize: size,
                lineHeight: 1.04,
                letterSpacing: -size * 0.025,
                maxWidth: 1000,
              }}
            >
              {title}
            </div>
            {sub && (
              <div
                style={{
                  display: "flex",
                  fontFamily: "serif",
                  fontStyle: "italic",
                  fontSize: 30,
                  lineHeight: 1.3,
                  color: INK_MUTED,
                  maxWidth: 940,
                }}
              >
                {sub}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={headshot}
                width={60}
                height={60}
                alt=""
                style={{ borderRadius: 9999, border: "3px solid rgba(255,255,255,0.9)" }}
              />
              <div style={{ display: "flex", fontFamily: "sans", fontSize: 26, color: INK }}>{NAME}</div>
            </div>
            <div style={{ display: "flex", fontFamily: "mono", fontSize: 20, color: INK_SOFT }}>{right}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** The site-wide card: used for the home page and anything without its own. */
export async function renderHomeCard({ tagline, interests }: { tagline: string; interests: string }) {
  const sections = "Work · Projects · Writing · Involvement";
  const [sky, headshot, fonts] = await Promise.all([
    assetDataUrl("sky.jpg"),
    assetDataUrl("headshot.jpg"),
    loadFonts(`${NAME}${tagline}${interests}${SITE_HOST}${sections}`),
  ]);

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", color: INK }}>
        <Sky sky={sky} />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "150px 96px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 680 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "sans",
                  fontWeight: 500,
                  fontSize: 92,
                  lineHeight: 0.98,
                  letterSpacing: -2.4,
                }}
              >
                {NAME}
              </div>
              <div style={{ display: "flex", fontFamily: "serif", fontStyle: "italic", fontSize: 38, color: INK_MUTED }}>
                {tagline}
              </div>
              <div style={{ display: "flex", fontFamily: "sans", fontSize: 26, lineHeight: 1.35, color: INK_SOFT, marginTop: 6 }}>
                {interests}
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headshot}
              width={270}
              height={270}
              alt=""
              style={{
                borderRadius: 9999,
                border: "6px solid rgba(255,255,255,0.92)",
                boxShadow: "0 18px 50px rgba(120,80,90,0.25)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "mono",
              fontSize: 20,
              color: INK_SOFT,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", width: 32, height: 3, background: ACCENT }} />
              <div style={{ display: "flex" }}>{SITE_HOST}</div>
            </div>
            <div style={{ display: "flex" }}>{sections}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
