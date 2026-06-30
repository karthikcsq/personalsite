// ImageResponse uses Satori, whose OKLCH support is less reliable than the
// browser's. These are sRGB equivalents of the canonical tokens in globals.css.
export const OG_COLORS = {
  surface: "#f6ead4",
  surfaceRaised: "#faf0e0",
  ink: "#251710",
  inkMuted: "#5c4c43",
  hairline: "#d0bea6",
  accent: "#a8471b",
  leaf: "#375b2b",
  leafMid: "#607f4b",
  leafSoft: "#99ad81",
} as const;

// A restrained version of the botanical frame used on the homepage. Keeping
// it shared gives every social card the same visual signature.
export function OgBotanicalFrame() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 210 190"
        width="250"
        height="226"
        style={{
          position: "absolute",
          right: -34,
          top: -20,
          opacity: 0.52,
        }}
        fill="none"
      >
        <path
          d="M209 11C171 25 144 47 123 74C99 104 71 125 23 141"
          stroke={OG_COLORS.leaf}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M164 34C169 17 181 8 198 8C193 25 182 34 164 34Z" fill={OG_COLORS.leafMid} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
        <path d="M131 68C117 58 112 44 117 29C132 38 137 52 131 68Z" fill={OG_COLORS.leafSoft} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
        <path d="M99 100C103 83 114 73 131 71C128 88 117 98 99 100Z" fill={OG_COLORS.leafMid} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
        <path d="M62 124C49 113 46 99 52 84C66 94 70 108 62 124Z" fill={OG_COLORS.leafSoft} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 205 170"
        width="238"
        height="198"
        style={{
          position: "absolute",
          left: -46,
          bottom: -32,
          opacity: 0.4,
        }}
        fill="none"
      >
        <path
          d="M2 162C29 132 57 111 89 97C124 82 151 60 180 18"
          stroke={OG_COLORS.leaf}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M38 128C22 124 12 114 10 98C27 101 37 111 38 128Z" fill={OG_COLORS.leafMid} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
        <path d="M79 101C69 88 68 74 77 61C89 74 90 87 79 101Z" fill={OG_COLORS.leafSoft} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
        <path d="M115 83C119 66 130 56 147 54C144 71 133 81 115 83Z" fill={OG_COLORS.leafMid} stroke={OG_COLORS.leaf} strokeWidth="1.2" />
      </svg>
    </>
  );
}
