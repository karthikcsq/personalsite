export const OG_COLORS = {
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  ink: "#202124",
  inkMuted: "#7b808b",
  hairline: "#e2e4e7",
  accent: "#f14b29",
  leaf: "#929aa7",
  leafMid: "#a6abb4",
  leafSoft: "#cbd0d9",
} as const;

export function OgCorpusFrame() {
  return (
    <>
      <div style={{ position: "absolute", top: 56, left: 56, width: 48, height: 48, borderRadius: "50%", background: OG_COLORS.accent, display: "flex" }} />
      <svg viewBox="0 0 500 360" width="480" height="346" style={{ position: "absolute", left: -50, bottom: -110, opacity: 0.12 }} fill="none">
        <path d="M10 350C125 290 215 200 375 90M155 270L122 180M240 195L340 230M304 141L286 68M372 91L430 60" stroke={OG_COLORS.leaf} strokeWidth="7" strokeLinecap="round" />
      </svg>
    </>
  );
}
