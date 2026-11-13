// Small deterministic drawing + timing helpers shared by every exhibit plate.
// Plates are pure functions of time `t`, so these stay side-effect free.

export const INK = "#1c1a16";
export const ACCENT = "#c2462b";
export const PAPER = "#f3eee3";
export const GROUND = "#ebe4d4";
export const FAINT = "rgba(28,26,22,0.28)";

export const VB_W = 960;
export const VB_H = 540;

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** 0→1 progress of t through [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Fade in over [a, a+d], out over [b-d, b]. */
export const window01 = (t: number, a: number, b: number, d = 0.35) => Math.min(seg(t, a, a + d), 1 - seg(t, b - d, b));

export function quad(p0: [number, number], c: [number, number], p1: [number, number], k: number): [number, number] {
  const u = 1 - k;
  return [u * u * p0[0] + 2 * u * k * c[0] + k * k * p1[0], u * u * p0[1] + 2 * u * k * c[1] + k * k * p1[1]];
}

/** Parallel lines at `angle` (deg) clipped to the box, spaced by `step`. */
export function hatch(x0: number, y0: number, x1: number, y1: number, step: number, angle = 0): string {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.hypot(x1 - x0, y1 - y0) / 2 + step;
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let d = "";
  for (let t = -half; t <= half; t += step) {
    const px = cx - dy * t;
    const py = cy + dx * t;
    let u0 = -half;
    let u1 = half;
    const edges: [number, number][] = [
      [-dx, px - x0],
      [dx, x1 - px],
      [-dy, py - y0],
      [dy, y1 - py],
    ];
    let ok = true;
    for (const [p, q] of edges) {
      if (Math.abs(p) < 1e-9) {
        if (q < 0) ok = false;
        continue;
      }
      const r = q / p;
      if (p < 0) u0 = Math.max(u0, r);
      else u1 = Math.min(u1, r);
    }
    if (!ok || u0 >= u1) continue;
    d += `M${r1(px + dx * u0)} ${r1(py + dy * u0)}L${r1(px + dx * u1)} ${r1(py + dy * u1)}`;
  }
  return d;
}

/** Engraved sphere: horizontal chords whose weight grows toward the shadow side. */
export function sphereLines(cx: number, cy: number, r: number, step: number) {
  const lines: { d: string; w: number }[] = [];
  for (let y = -r + step / 2; y < r; y += step) {
    const half = Math.sqrt(r * r - y * y);
    // shadow toward lower-right: shorten the lit left end slightly, thicken lower lines
    const k = (y + r) / (2 * r);
    const x0 = cx - half + (1 - k) * half * 0.35;
    lines.push({ d: `M${r1(x0)} ${r1(cy + y)}H${r1(cx + half)}`, w: 0.45 + k * 1.1 });
  }
  return lines;
}

export function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Find a verbatim clause inside `text`; fall back to `fallback` when missing. */
export function verbatim(text: string, clause: string, fallback: string): string {
  return text.includes(clause) ? clause : fallback;
}
