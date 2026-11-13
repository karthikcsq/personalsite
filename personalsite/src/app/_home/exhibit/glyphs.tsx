// Line glyphs drawn on a 24-unit box centred on the origin. Stroke only, so
// they sit inside the engraved plates without introducing a new ink.
import type { ReactNode } from "react";

export type GlyphName =
  | "mail"
  | "bell"
  | "pin"
  | "heart"
  | "calendar"
  | "chat"
  | "doc"
  | "sheet"
  | "slide"
  | "drive"
  | "form"
  | "music"
  | "step";

const PATHS: Record<GlyphName, ReactNode> = {
  mail: (
    <>
      <rect x="-10" y="-7" width="20" height="14" rx="1.5" />
      <path d="M-10 -6 L0 2 L10 -6" />
    </>
  ),
  bell: (
    <>
      <path d="M-7 5 C-7 -1 -6.5 -7.5 0 -7.5 C6.5 -7.5 7 -1 7 5 L9 7.5 H-9 Z" />
      <path d="M-2.4 9.6 a2.4 2.4 0 0 0 4.8 0" />
      <path d="M0 -7.5 V-9.6" />
    </>
  ),
  pin: (
    <>
      <path d="M0 10 C-5 4 -8 0.5 -8 -3 a8 8 0 0 1 16 0 C8 0.5 5 4 0 10 Z" />
      <circle cx="0" cy="-3" r="2.8" />
    </>
  ),
  heart: <path d="M0 8.5 C-12 0 -9 -9.5 -3.6 -8.4 C-1.6 -8 -0.6 -6.6 0 -5.2 C0.6 -6.6 1.6 -8 3.6 -8.4 C9 -9.5 12 0 0 8.5 Z" />,
  calendar: (
    <>
      <rect x="-9.5" y="-7.5" width="19" height="16.5" rx="1.5" />
      <path d="M-9.5 -2.5 H9.5 M-5 -10 V-5.5 M5 -10 V-5.5" />
      <path d="M-5 2 h2 M-1 2 h2 M3 2 h2 M-5 5.5 h2 M-1 5.5 h2" />
    </>
  ),
  chat: (
    <>
      <path d="M-9.5 -7 H9.5 V4.5 H-2 L-6.5 8.5 V4.5 H-9.5 Z" />
      <path d="M-5.5 -2.6 H5.5 M-5.5 0.6 H2" />
    </>
  ),
  doc: (
    <>
      <path d="M-7 -10 H3 L8 -5 V10 H-7 Z" />
      <path d="M3 -10 V-5 H8" />
      <path d="M-3.6 -1 H4.6 M-3.6 2.6 H4.6 M-3.6 6.2 H1.6" />
    </>
  ),
  sheet: (
    <>
      <rect x="-9" y="-9" width="18" height="18" rx="1" />
      <path d="M-9 -3 H9 M-9 3 H9 M-3 -9 V9 M3 -9 V9" />
    </>
  ),
  slide: (
    <>
      <rect x="-10" y="-7.5" width="20" height="15" rx="1" />
      <rect x="-5.5" y="-3.5" width="11" height="7" />
    </>
  ),
  drive: <path d="M-3.5 -9 H3.5 L10.5 3.2 L7 9 H-7 L-10.5 3.2 Z M-3.5 -9 L3.6 3.2 H10.5 M-7 9 L0 -3 M3.5 -9 L-3.6 3.2 H-10.5" />,
  form: (
    <>
      <rect x="-8.5" y="-10" width="17" height="20" rx="1" />
      <rect x="-5" y="-6" width="3" height="3" />
      <rect x="-5" y="-0.5" width="3" height="3" />
      <rect x="-5" y="5" width="3" height="3" />
      <path d="M0 -4.5 H5 M0 1 H5 M0 6.5 H4" />
    </>
  ),
  music: (
    <>
      <path d="M-3 6 V-8 L8 -10 V4" />
      <circle cx="-5.5" cy="6.4" r="2.6" />
      <circle cx="5.5" cy="4.4" r="2.6" />
    </>
  ),
  step: (
    <>
      <path d="M-6 9 C-8 4 -7 -2 -4 -6 C-2 -9 2 -9 2 -5 C2 -1 -1 3 -1 9 Z" />
      <path d="M5 -9 h3 M5 -5 h4 M5 -1 h3" />
    </>
  ),
};

export function Glyph({
  name,
  x,
  y,
  s = 1,
  color,
  width = 1.4,
  opacity = 1,
  fill = "none",
}: {
  name: GlyphName;
  x: number;
  y: number;
  s?: number;
  color: string;
  width?: number;
  opacity?: number;
  fill?: string;
}) {
  return (
    <g
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`}
      fill={fill}
      stroke={color}
      strokeWidth={width / s}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={opacity}
    >
      {PATHS[name]}
    </g>
  );
}

/** The double-ruled border every plate shares, echoing the book covers. */
export function PlateFrame({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <g fill="none" stroke={color} pointerEvents="none">
      <rect x="10" y="10" width={w - 20} height={h - 20} strokeWidth="0.8" opacity="0.6" />
      <rect x="15" y="15" width={w - 30} height={h - 30} strokeWidth="0.4" opacity="0.45" />
    </g>
  );
}

/** Small mono caption inside a plate. */
export function Caption({ x, y, children, color, anchor = "middle", opacity = 0.62 }: { x: number; y: number; children: ReactNode; color: string; anchor?: "start" | "middle" | "end"; opacity?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={color} opacity={opacity} className="exCaption">
      {children}
    </text>
  );
}
