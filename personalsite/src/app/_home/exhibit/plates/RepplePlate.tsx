"use client";

// Repple: the real app screens in drawn device frames, turning like a carousel,
// beside a weekly leaderboard where friends overtake each other as their
// workout points climb. Bars only, no invented scores.
import { useId } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, hatch, lerp, roundRectPath, seg } from "../engrave";
import { Caption } from "../glyphs";

const HOLD = 3.6;
const LOOP = HOLD * 3;
const PW = 164;
const PH = 340;

const SLOTS = [
  { x: 330, y: 270, s: 1, r: 0, o: 1, z: 2 }, // centre
  { x: 506, y: 286, s: 0.7, r: 8, o: 0.85, z: 1 }, // right
  { x: 154, y: 286, s: 0.7, r: -8, o: 0.85, z: 1 }, // left
];

const ROWS = [
  { base: 40, rate: 9, you: false, pattern: 0 },
  { base: 70, rate: 4, you: false, pattern: 1 },
  { base: 20, rate: 12, you: false, pattern: 2 },
  { base: 55, rate: 8.5, you: true, pattern: 3 },
];
const BOARD = { x: 640, y: 146, rowH: 74, barMax: 180 };

function Phone({ uid, k, src, x, y, s, r, o }: { uid: string; k: number; src: string; x: number; y: number; s: number; r: number; o: number }) {
  const sw = PW - 14;
  const sh = PH - 16;
  const clip = `${uid}-scr-${k}`;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(3)}) translate(${-PW / 2} ${-PH / 2})`} opacity={o.toFixed(3)}>
      <defs>
        <clipPath id={clip}>
          <path d={roundRectPath(7, 8, sw, sh, 20)} />
        </clipPath>
      </defs>
      <path d={roundRectPath(8, 10, PW, PH, 28)} fill={INK} opacity={0.14} />
      <path d={hatch(PW - 4, 30, PW + 10, PH, 3.2, 60)} stroke={INK} strokeWidth={0.5} opacity={0.35} />
      <path d={roundRectPath(0, 0, PW, PH, 28)} fill="#f7f3ea" stroke={INK} strokeWidth={1.8} />
      <path d={`M-2 82v26M-2 118v40M${PW + 2} 104v48`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <image href={src} x={7} y={8} width={sw} height={sh} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${clip})`} />
      <path d={roundRectPath(7, 8, sw, sh, 20)} fill="none" stroke={INK} strokeWidth={0.8} />
      <rect x={PW / 2 - 22} y={16} width={44} height={11} rx={5.5} fill={INK} />
    </g>
  );
}

export default function RepplePlate({ screens }: { screens: { src: string; alt: string }[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shots = screens.slice(0, 3);
  return (
    <Plate loop={LOOP} still={2.2} label={`Repple app screens in phone frames (${shots.map((s) => s.alt).join(", ")}), beside a weekly leaderboard where friends overtake each other.`}>
      {(t) => {
        const step = Math.floor(t / HOLD);
        const f = ease(seg(t - step * HOLD, HOLD - 0.85, HOLD));
        const fade = 1 - seg(t, LOOP - 0.5, LOOP);

        const phones = shots.map((shot, k) => {
          const from = (((k - step) % 3) + 3) % 3;
          const to = (from + 2) % 3; // right→centre, centre→left, left→right (behind)
          const A = SLOTS[from];
          const B = SLOTS[to];
          const behind = from === 2 && to === 1;
          const p = {
            x: lerp(A.x, B.x, f),
            y: lerp(A.y, B.y, f) - (behind ? Math.sin(f * Math.PI) * 18 : 0),
            s: lerp(A.s, B.s, f) * (behind ? 1 - Math.sin(f * Math.PI) * 0.12 : 1),
            r: lerp(A.r, B.r, f),
            o: behind ? lerp(A.o, B.o, f) * (1 - Math.sin(f * Math.PI) * 0.7) : lerp(A.o, B.o, f),
            z: behind ? 0 : lerp(A.z, B.z, f),
          };
          return { k, shot, ...p };
        });
        phones.sort((a, b) => a.z - b.z);

        // leaderboard
        const pts = ROWS.map((r) => r.base + r.rate * t);
        const max = Math.max(...pts, 1);
        const order = pts.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p).map((o) => o.i);
        const rank = pts.map((p, i) => pts.reduce((acc, q, j) => (j === i ? acc : acc + 1 / (1 + Math.exp(-(q - p) / 2.2))), 0));

        return (
          <g opacity={fade}>
            {phones.map((p) => (
              <Phone key={p.k} uid={uid} k={p.k} src={p.shot.src} x={p.x} y={p.y} s={p.s} r={p.r} o={p.o} />
            ))}

            {/* leaderboard */}
            <g>
              <defs>
                <clipPath id={`${uid}-av`}>
                  <circle cx={BOARD.x + 38} cy={2} r={16} />
                </clipPath>
              </defs>
              <path d={`M${BOARD.x - 14} 72V478`} stroke={INK} strokeWidth={0.6} opacity={0.4} />
              <g transform={`translate(${BOARD.x + 12} 104)`} fill="none" stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
                <path d="M-11 -14 H11 V-4 C11 6 4 10 0 10 C-4 10 -11 6 -11 -4 Z" fill="#f7f3ea" />
                <path d="M-11 -10 C-20 -10 -19 2 -9 3 M11 -10 C20 -10 19 2 9 3" />
                <path d="M0 10 V16 M-7 19 H7" />
              </g>
              <Caption x={BOARD.x + 34} y={109} color={INK} anchor="start">this week</Caption>
              {ROWS.map((r, i) => {
                const y = BOARD.y + rank[i] * BOARD.rowH;
                const w = (pts[i] / max) * BOARD.barMax;
                const col = r.you ? ACCENT : INK;
                const place = order.indexOf(i) + 1;
                return (
                  <g key={i} transform={`translate(0 ${y.toFixed(1)})`}>
                    <text x={BOARD.x} y={8} fill={col} className="exCaption exNum" opacity={0.85}>{place}</text>
                    <circle cx={BOARD.x + 38} cy={2} r={16} fill="#f7f3ea" stroke={col} strokeWidth={1.3} />
                    <path d={hatch(BOARD.x + 22, -14, BOARD.x + 54, 18, 3.4, [20, 70, 120, 160][r.pattern])} stroke={col} strokeWidth={0.5} opacity={0.55} clipPath={`url(#${uid}-av)`} />
                    <circle cx={BOARD.x + 38} cy={-3} r={5.5} fill="#f7f3ea" stroke={col} strokeWidth={1} />
                    <path d={`M${BOARD.x + 29} 13 C${BOARD.x + 31} 6 ${BOARD.x + 45} 6 ${BOARD.x + 47} 13`} fill="#f7f3ea" stroke={col} strokeWidth={1} />
                    <rect x={BOARD.x + 66} y={-8} width={w.toFixed(1)} height={18} fill="none" stroke={col} strokeWidth={1.2} />
                    <path d={hatch(BOARD.x + 66, -8, BOARD.x + 66 + w, 10, 3, 45)} stroke={col} strokeWidth={0.7} opacity={0.75} />
                    {r.you ? <Caption x={BOARD.x + 72 + w} y={6} color={ACCENT} anchor="start" opacity={1}>you</Caption> : null}
                  </g>
                );
              })}
            </g>
          </g>
        );
      }}
    </Plate>
  );
}
