"use client";

// Tavi: a standup seen from above. Each person has one big task they own on the
// table in front of them. As people talk, small follow-ups (15, the number in
// his description) pop up beside them; Tavi, at the centre of the table, pulls
// each one in and clears it during the meeting. People leave with only the big
// task.
import { useMemo } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, hatch, lerp, rng, seg } from "../engrave";
import { Caption } from "../glyphs";

const LOOP = 14;
const C = { x: 480, y: 282 };
const TABLE = { rx: 232, ry: 116 };
const SEAT = { rx: 330, ry: 196 };
const ANGLES = [-90, -22, 46, 134, 202];
const SPEAKERS = [0, 2, 1, 4, 3, 0, 1, 3, 2, 4, 0, 2, 4, 1, 3];
const SMALL = SPEAKERS.length; // 15

type P = { x: number; y: number; a: number };

function seat(i: number): P {
  const a = (ANGLES[i] * Math.PI) / 180;
  return { x: C.x + Math.cos(a) * SEAT.rx, y: C.y + Math.sin(a) * SEAT.ry, a };
}

function Person({ p, talking, out }: { p: P; talking: number; out: number }) {
  const deg = (Math.atan2(C.y - p.y, C.x - p.x) * 180) / Math.PI - 90;
  const ox = Math.cos(p.a) * out;
  const oy = Math.sin(p.a) * out;
  return (
    <g transform={`translate(${(p.x + ox).toFixed(1)} ${(p.y + oy).toFixed(1)}) rotate(${deg.toFixed(1)})`}>
      <ellipse cx="0" cy="-4" rx="31" ry="14" fill="#f6f1e6" stroke={INK} strokeWidth={1.3} />
      <path d="M-24 -10 C-14 -16 14 -16 24 -10" fill="none" stroke={INK} strokeWidth={0.6} opacity={0.6} />
      <circle cx="0" cy="0" r="13" fill="#f6f1e6" stroke={INK} strokeWidth={1.3} />
      <path d="M-10 -5 C-6 -12 6 -12 10 -5" fill="none" stroke={INK} strokeWidth={0.8} opacity={0.65} transform="rotate(180)" />
      {talking > 0 ? (
        <>
          <circle cx="0" cy="0" r={19 + talking * 6} fill="none" stroke={INK} strokeWidth={0.8} opacity={0.55 * talking} />
          <circle cx="0" cy="0" r={27 + talking * 9} fill="none" stroke={INK} strokeWidth={0.5} opacity={0.35 * talking} />
        </>
      ) : null}
    </g>
  );
}

export default function TaviPlate() {
  const grain = useMemo(() => {
    const rand = rng(4);
    return Array.from({ length: 13 }, (_, k) => {
      const f = 0.16 + k * 0.065;
      return { cx: C.x + (rand() - 0.5) * 18, cy: C.y + (rand() - 0.5) * 6, rx: TABLE.rx * f, ry: TABLE.ry * f * (0.9 + rand() * 0.2) };
    });
  }, []);
  const floor = useMemo(() => hatch(20, 20, 940, 520, 9, 30), []);
  const bigHatch = useMemo(() => hatch(-31, -11, 31, 21, 4, 45), []);

  const items = useMemo(() => {
    const rand = rng(17);
    const perSpeaker = [0, 0, 0, 0, 0];
    return SPEAKERS.map((sp, i) => {
      const slot = perSpeaker[sp]++;
      const p = seat(sp);
      // sit on the table rim beside the speaker, fanning out
      const tang = p.a + Math.PI / 2;
      const side = [-1, 1, 0][slot % 3];
      const rim = { x: lerp(C.x, p.x, 0.7), y: lerp(C.y, p.y, 0.7) };
      const appear = 0.7 + i * 0.42;
      return {
        i,
        sp,
        x: rim.x + Math.cos(tang) * side * 52,
        y: rim.y + Math.sin(tang) * side * 34,
        rot: (rand() - 0.5) * 24,
        appear,
        clear: appear + 2.4 + rand() * 1.4 + (i > 9 ? -0.6 : 0),
      };
    });
  }, []);

  const bigs = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((i) => {
        const p = seat(i);
        return { i, x: lerp(C.x, p.x, 0.42), y: lerp(C.y, p.y, 0.42), rot: ((p.a * 180) / Math.PI + 90) % 360 };
      }),
    [],
  );

  return (
    <Plate loop={LOOP} still={6.4} label="A standup seen from above: small follow-up notes pop up beside each speaker and are pulled into Tavi at the centre of the table and cleared, leaving each person with one big task.">
      {(t) => {
        const fade = 1 - seg(t, 13.4, 14);
        const leave = ease(seg(t, 11.6, 13.2)) * 34;
        const owned = seg(t, 10.6, 11.4);
        let open = 0;
        let cleared = 0;
        let puckHit = 0;
        const talking = [0, 0, 0, 0, 0];

        const notes = items.map((it) => {
          const tl = seg(t, it.appear - 0.5, it.appear) * (1 - seg(t, it.appear + 0.5, it.appear + 1.1));
          talking[it.sp] = Math.max(talking[it.sp], tl);
          if (t < it.appear) return null;
          if (t < it.clear + 0.8) open += t < it.clear + 0.5 ? 1 : 0;
          if (t >= it.clear + 0.5) cleared++;
          const pop = ease(seg(t, it.appear, it.appear + 0.25));
          const reach = seg(t, it.clear - 0.35, it.clear);
          const pull = ease(seg(t, it.clear, it.clear + 0.5));
          if (pull >= 1) {
            puckHit = Math.max(puckHit, 1 - seg(t, it.clear + 0.5, it.clear + 1.1));
            return null;
          }
          const x = lerp(it.x, C.x, pull);
          const y = lerp(it.y, C.y, pull);
          const sc = pop * (1 - pull * 0.7);
          return (
            <g key={it.i}>
              {reach > 0 ? (
                <path d={`M${C.x} ${C.y}L${lerp(C.x, it.x, reach).toFixed(1)} ${lerp(C.y, it.y, reach).toFixed(1)}`} stroke={ACCENT} strokeWidth={1} strokeDasharray="2 3" opacity={1 - pull} />
              ) : null}
              <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${it.rot.toFixed(1)}) scale(${sc.toFixed(3)})`}>
                <rect x={-16} y={-12} width={32} height={24} fill="#fbf8f1" stroke={ACCENT} strokeWidth={1.3} />
                <path d="M-16 -12h7l-7 7z" fill={ACCENT} opacity={0.85} />
                <path d="M-8 -2H10M-8 4H5" stroke={ACCENT} strokeWidth={1} opacity={0.75} />
              </g>
            </g>
          );
        });

        return (
          <g opacity={fade}>
            <path d={floor} stroke={INK} strokeWidth={0.3} opacity={0.1} />
            {/* table */}
            <ellipse cx={C.x + 6} cy={C.y + 8} rx={TABLE.rx} ry={TABLE.ry} fill={INK} opacity={0.1} />
            <ellipse cx={C.x} cy={C.y} rx={TABLE.rx} ry={TABLE.ry} fill="#efe7d6" stroke={INK} strokeWidth={1.5} />
            <ellipse cx={C.x} cy={C.y} rx={TABLE.rx - 7} ry={TABLE.ry - 6} fill="none" stroke={INK} strokeWidth={0.5} opacity={0.5} />
            {grain.map((g, k) => (
              <ellipse key={k} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill="none" stroke={INK} strokeWidth={0.4} opacity={0.18} />
            ))}

            {/* big owned tasks */}
            {bigs.map((b) => {
              const p = seat(b.i);
              const ox = Math.cos(p.a) * leave * 1.6;
              const oy = Math.sin(p.a) * leave * 1.6;
              return (
                <g key={b.i} transform={`translate(${(b.x + ox).toFixed(1)} ${(b.y + oy).toFixed(1)}) rotate(${b.rot.toFixed(1)})`}>
                  <rect x={-31} y={-21} width={62} height={42} fill={INK} opacity={0.14} transform="translate(3 4)" />
                  <rect x={-31} y={-21} width={62} height={42} fill="#fbf8f1" stroke={INK} strokeWidth={1.8 + owned * 0.6} />
                  <path d={bigHatch} stroke={INK} strokeWidth={0.6} opacity={0.5} />
                  <rect x={-31} y={-21} width={62} height={10} fill={INK} />
                </g>
              );
            })}

            {notes}

            {/* Tavi: a puck at the centre, listening */}
            <g>
              <circle cx={C.x} cy={C.y} r={28} fill="#fbf8f1" stroke={INK} strokeWidth={1.5} />
              <circle cx={C.x} cy={C.y} r={23} fill="none" stroke={INK} strokeWidth={0.5} opacity={0.6} />
              {[-10, -5, 0, 5, 10].map((o, k) => {
                const h = Math.round((4 + Math.abs(Math.sin(t * 5.3 + k * 1.3)) * (6 + (k % 2) * 4) * (1 - owned * 0.7)) * 10) / 10;
                return <path key={o} d={`M${C.x + o} ${C.y - h}V${C.y + h}`} stroke={INK} strokeWidth={2} strokeLinecap="round" />;
              })}
              {puckHit > 0 ? (
                <>
                  <circle cx={C.x} cy={C.y} r={30 + (1 - puckHit) * 16} fill="none" stroke={ACCENT} strokeWidth={1.6} opacity={puckHit} />
                  <path d={`M${C.x + 18} ${C.y - 40}l5 5 10-11`} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={puckHit} />
                </>
              ) : null}
              <Caption x={C.x} y={C.y + 48} color={INK}>tavi</Caption>
            </g>

            {[0, 1, 2, 3, 4].map((i) => (
              <Person key={i} p={seat(i)} talking={talking[i]} out={leave * 1.6} />
            ))}

            {/* tally */}
            <text x={40} y={60} fill={INK} className="exCaption" opacity={0.75}>
              follow-ups open <tspan className="exNum">{String(open).padStart(2, "0")}</tspan>
            </text>
            <text x={40} y={86} fill={ACCENT} className="exCaption">
              cleared in the meeting <tspan className="exNum">{String(cleared).padStart(2, "0")}</tspan>/{SMALL}
            </text>
          </g>
        );
      }}
    </Plate>
  );
}
