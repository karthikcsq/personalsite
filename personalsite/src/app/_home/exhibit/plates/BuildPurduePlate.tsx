"use client";

// buildpurdue: density. Founders start scattered across campus, each alone in a
// different building. Night falls, they gather in one room, and conversations
// start passing between them, most often from the few who are further ahead.
// Then the room empties until next week. Beside it, the real photos.
import { useId, useMemo } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, hatch, lerp, r1, rng, seg } from "../engrave";
import { Caption } from "../glyphs";

const LOOP = 14;
const N = 30;
const ROOM = { x: 724, y: 292, w: 196, h: 150 };
const FIELD = { x0: 530, y0: 52, x1: 926, y1: 490 };
const AHEAD = new Set([3, 11, 17, 24, 28]);
const TALK = 44;

export default function BuildPurduePlate({ photos }: { photos: { src: string; alt: string }[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { founders, buildings, talks } = useMemo(() => {
    const rand = rng(33);
    const buildings: { x: number; y: number; w: number; h: number }[] = [];
    let guard = 0;
    while (buildings.length < N && guard++ < 4000) {
      const w = 22 + rand() * 26;
      const h = 16 + rand() * 20;
      const x = FIELD.x0 + rand() * (FIELD.x1 - FIELD.x0 - w);
      const y = FIELD.y0 + rand() * (FIELD.y1 - FIELD.y0 - h);
      const overlapsRoom = x + w > ROOM.x - ROOM.w / 2 - 12 && x < ROOM.x + ROOM.w / 2 + 12 && y + h > ROOM.y - ROOM.h / 2 - 12 && y < ROOM.y + ROOM.h / 2 + 12;
      const overlaps = buildings.some((b) => x < b.x + b.w + 8 && x + w + 8 > b.x && y < b.y + b.h + 8 && y + h + 8 > b.y);
      if (!overlapsRoom && !overlaps) buildings.push({ x, y, w, h });
    }
    const founders = buildings.map((b, i) => {
      // golden-angle packing inside the room
      const a = i * 2.39996;
      const rr = Math.sqrt((i + 0.6) / N);
      return {
        i,
        sx: b.x + b.w / 2,
        sy: b.y + b.h / 2,
        ex: r1(ROOM.x + Math.cos(a) * rr * (ROOM.w / 2 - 16)),
        ey: r1(ROOM.y + Math.sin(a) * rr * (ROOM.h / 2 - 14)),
        delay: rand() * 1.6,
        phase: rand() * Math.PI * 2,
      };
    });
    // The conversations of the night: each founder talks with their two
    // nearest neighbours in the room. They start one at a time across the
    // evening, and each is drawn and counted exactly once, when it starts.
    const seen = new Set<string>();
    const pairs: { a: number; b: number }[] = [];
    founders.forEach((f, a) => {
      founders
        .map((g, b) => ({ b, d: Math.hypot(f.ex - g.ex, f.ey - g.ey) }))
        .filter((x) => x.b !== a)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach(({ b }) => {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push({ a: Math.min(a, b), b: Math.max(a, b) });
          }
        });
    });
    const order = rng(91);
    const talks = pairs
      .map((pr) => ({ ...pr, r: order() }))
      .sort((x, y) => x.r - y.r)
      .map((pr, i, all) => ({ a: pr.a, b: pr.b, start: 5.4 + (i / all.length) * 4.4 }));
    return { founders, buildings, talks };
  }, []);
  const roomHatch = useMemo(() => hatch(ROOM.x - ROOM.w / 2, ROOM.y - ROOM.h / 2, ROOM.x + ROOM.w / 2, ROOM.y + ROOM.h / 2, 6, -35), []);
  const p1 = photos[0];
  const p2 = photos[1];

  return (
    <Plate loop={LOOP} still={7.6} label="Founders scattered across campus gather into one dense room at night and start talking, then disperse; beside it, photos of buildpurdue's night shift and a workshop.">
      {(t) => {
        const night = seg(t, 2.2, 3.6) * (1 - seg(t, 10.6, 12));
        const pos = founders.map((f) => {
          const g = ease(seg(t, 1 + f.delay, 4.4 + f.delay)) * (1 - ease(seg(t, 10.2 + f.delay * 0.6, 12.6 + f.delay * 0.4)));
          const jx = Math.sin(t * 1.3 + f.phase) * 1.6;
          const jy = Math.cos(t * 1.1 + f.phase) * 1.6;
          return { x: r1(lerp(f.sx, f.ex, g) + jx), y: r1(lerp(f.sy, f.ey, g) + jy), g };
        });
        const edges = talks
          .filter((c) => t >= c.start)
          .map((c) => {
            const d = Math.hypot(pos[c.a].x - pos[c.b].x, pos[c.a].y - pos[c.b].y);
            const appear = seg(t, c.start, c.start + 0.35);
            return { a: c.a, b: c.b, o: appear * Math.max(0, 1 - d / (TALK * 1.6)) };
          })
          .filter((e) => e.o > 0.02);
        const said = talks.filter((c) => t >= c.start).length;
        return (
          <>
            {/* photos, mounted */}
            {p1 ? <Print uid={uid} k={1} src={p1.src} x={40} y={58} w={340} h={255} rot={-1.6} /> : null}
            {p2 ? <Print uid={uid} k={2} src={p2.src} x={150} y={262} w={318} h={208} rot={1.4} /> : null}

            {/* campus */}
            <path d={`M${FIELD.x0 - 16} 40V500`} stroke={INK} strokeWidth={0.6} opacity={0.35} />
            {buildings.map((b, i) => (
              <g key={i} opacity={0.55}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={INK} strokeWidth={0.7} />
                <path d={hatch(b.x, b.y, b.x + b.w, b.y + b.h, 3.5, 45)} stroke={INK} strokeWidth={0.3} opacity={0.6} />
              </g>
            ))}

            {/* the room */}
            <rect x={ROOM.x - ROOM.w / 2} y={ROOM.y - ROOM.h / 2} width={ROOM.w} height={ROOM.h} fill="#efe7d6" stroke={INK} strokeWidth={1.6} />
            <path d={roomHatch} stroke={INK} strokeWidth={0.4} opacity={0.12 + night * 0.25} />
            <rect x={ROOM.x - ROOM.w / 2 + 5} y={ROOM.y - ROOM.h / 2 + 5} width={ROOM.w - 10} height={ROOM.h - 10} fill="none" stroke={INK} strokeWidth={0.5} opacity={0.6} />
            {/* moon over the room: night shift */}
            <g opacity={night} transform={`translate(${ROOM.x + ROOM.w / 2 - 18} ${ROOM.y - ROOM.h / 2 - 26 - night * 8})`}>
              <path d="M6 -12 A13 13 0 1 0 6 12 A10 10 0 1 1 6 -12 Z" fill="none" stroke={INK} strokeWidth={1.2} />
            </g>

            {/* conversations */}
            {edges.map((e) => {
              const A = pos[e.a];
              const B = pos[e.b];
              const from = AHEAD.has(e.b) && !AHEAD.has(e.a) ? B : A;
              const to = from === A ? B : A;
              const sourceAhead = AHEAD.has(e.a) || AHEAD.has(e.b);
              const k = (t * 0.9 + (e.a * 7 + e.b * 3) * 0.137) % 1;
              return (
                <g key={`${e.a}-${e.b}`}>
                  <path d={`M${A.x.toFixed(1)} ${A.y.toFixed(1)}L${B.x.toFixed(1)} ${B.y.toFixed(1)}`} stroke={sourceAhead ? ACCENT : INK} strokeWidth={0.9} opacity={e.o * (sourceAhead ? 0.9 : 0.5)} />
                  {sourceAhead && e.o > 0.25 ? <circle cx={r1(lerp(from.x, to.x, k))} cy={r1(lerp(from.y, to.y, k))} r={1.9} fill={ACCENT} opacity={e.o} /> : null}
                </g>
              );
            })}
            {founders.map((f, i) => {
              const p = pos[i];
              const ahead = AHEAD.has(i);
              return (
                <g key={f.i}>
                  <circle cx={p.x} cy={p.y} r={ahead ? 6 : 5} fill={ahead ? ACCENT : "#f7f3ea"} stroke={ahead ? ACCENT : INK} strokeWidth={1.3} />
                </g>
              );
            })}

            <text x={FIELD.x0} y={512} fill={INK} className="exCaption" opacity={0.75}>
              conversations <tspan className="exNum">{String(said).padStart(2, "0")}</tspan>
            </text>
            <Caption x={FIELD.x1} y={512} color={ACCENT} anchor="end" opacity={0.9}>● further along</Caption>
          </>
        );
      }}
    </Plate>
  );
}

function Print({ uid, k, src, x, y, w, h, rot }: { uid: string; k: number; src: string; x: number; y: number; w: number; h: number; rot: number }) {
  const id = `${uid}-pr-${k}`;
  const m = 9;
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <defs>
        <clipPath id={id}>
          <rect x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m} />
        </clipPath>
      </defs>
      <rect x={x + 5} y={y + 6} width={w} height={h} fill={INK} opacity={0.14} />
      <rect x={x} y={y} width={w} height={h} fill="#fbf8f1" stroke={INK} strokeWidth={1} />
      <image href={src} x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      <rect x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m} fill="none" stroke={INK} strokeWidth={0.6} />
    </g>
  );
}
