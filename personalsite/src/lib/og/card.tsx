import type { ReactNode } from "react";
import { ImageResponse } from "next/og";

// Shared renderer for every Open Graph card on the site. Typography only, set
// the way the home page sets it: Karla at 520 with tight tracking, ink on
// white, secondary text in the site's muted grey. No ornaments.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const SITE_HOST = "karthikthyagarajan.com";
const NAME = "Karthik Thyagarajan";

// --color-ink / --color-ink-muted from globals.css and the home page.
const INK = "#171719";
const MUTED = "#7b808b";
const TRACKING = -0.036; // em, matches .identity on the home page

// Satori only matches weights in steps of 100, so the 520 instance the site
// uses is registered under 500.
const WEIGHTS = [
  { fetch: 520, as: 500 },
  { fetch: 400, as: 400 },
] as const;

// Fetches only the glyphs the card uses. Google serves Karla's variable
// instances at any weight, so 520 matches the site exactly. A failed fetch
// drops that weight instead of failing the build.
async function loadKarla(weight: (typeof WEIGHTS)[number], text: string) {
  const url = `https://fonts.googleapis.com/css2?family=Karla:wght@${weight.fetch}&text=${encodeURIComponent(text)}`;
  try {
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!src) return null;
    const data = await (await fetch(src)).arrayBuffer();
    return { name: "Karla", data, weight: weight.as, style: "normal" as const };
  } catch {
    return null;
  }
}

async function loadFonts(text: string) {
  const loaded = await Promise.all(WEIGHTS.map((w) => loadKarla(w, text)));
  return loaded.filter((f): f is NonNullable<typeof f> => f !== null);
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  // Prefer ending on a whole sentence when one lands late enough.
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (sentenceEnd > max * 0.55) return cut.slice(0, sentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.—-]+$/, "")}…`;
}

function titleSize(title: string): number {
  const len = title.length;
  if (len <= 20) return 96;
  if (len <= 36) return 80;
  if (len <= 60) return 66;
  if (len <= 90) return 56;
  return 48;
}

const strong = (size: number) => ({
  fontFamily: "Karla",
  fontWeight: 500,
  fontSize: size,
  letterSpacing: size * TRACKING,
  color: INK,
});

const quiet = (size: number) => ({
  fontFamily: "Karla",
  fontWeight: 400,
  fontSize: size,
  letterSpacing: size * -0.01,
  color: MUTED,
});

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 84px 80px",
        background: "#ffffff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", ...strong(30) }}>{NAME}</div>
        <div style={{ display: "flex", ...quiet(24) }}>{SITE_HOST}</div>
      </div>
      {children}
    </div>
  );
}

export type ArticleCardInput = {
  /** Muted line above the title, e.g. "Essay · September 16, 2025". */
  kicker?: string;
  title: string;
  /** Muted line under the title. Truncated to fit. */
  subtitle?: string;
};

/** Card for a single page: blog posts, notes, and section landing pages. */
export async function renderArticleCard({ kicker, title, subtitle }: ArticleCardInput) {
  const sub = subtitle ? truncate(subtitle, title.length > 60 ? 110 : 150) : "";
  const fonts = await loadFonts(`${NAME}${SITE_HOST}${kicker ?? ""}${title}${sub}…`);
  const size = titleSize(title);

  return new ImageResponse(
    (
      <Card>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {kicker && <div style={{ display: "flex", ...quiet(28), marginBottom: 20 }}>{kicker}</div>}
          <div style={{ display: "flex", ...strong(size), lineHeight: 1.04, maxWidth: 1032, textWrap: "balance" }}>{title}</div>
          {sub && (
            <div style={{ display: "flex", ...quiet(30), lineHeight: 1.4, maxWidth: 940, marginTop: 24 }}>{sub}</div>
          )}
        </div>
      </Card>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** The site-wide card: used for the home page and anything without its own. */
export async function renderHomeCard({ line }: { line: string }) {
  const fonts = await loadFonts(`${NAME}${SITE_HOST}${line}`);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "72px 84px 84px",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", ...strong(112), lineHeight: 1 }}>{NAME}</div>
        <div style={{ display: "flex", ...quiet(34), lineHeight: 1.4, maxWidth: 900, marginTop: 28 }}>{line}</div>
        <div style={{ display: "flex", ...quiet(24), marginTop: 56 }}>{SITE_HOST}</div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
