"use client";

// Memories.ai: a video memory framework for hours-long video.
// Hours of video run past; only a sliver would fit in a model's context.
// Instead, keyframes are pulled out at scene changes, people and objects are
// boxed inside them, and everything lands in one index (a graph of scenes,
// objects and people). A query then walks the graph, person → scene, and
// lands on the exact moment in the footage.
import { useMemo } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, easeOut, hatch, lerp, r1, rng, seg } from "../engrave";
import { Caption } from "../glyphs";

const LOOP = 12;
const STRIP_Y = 92;
const CELL_W = 40;
const CELL_H = 30;
const PITCH = 46;
const SPEED = 34; // px per second while the footage runs
const FREEZE = 8.6; // the strip stops when the answer is found
const N_CELLS = 40;

// Scenes: runs of frames that share a "look" (hatch angle + density).
const SCENES = [0, 4, 9, 12, 18, 23, 27, 33, 36];
const sceneOf = (k: number) => SCENES.filter((s) => s <= k).length - 1;
const LOOKS = [
  { a: 0, step: 4 },
  { a: 45, step: 5 },
  { a: 90, step: 3.5 },
  { a: -30, step: 6 },
  { a: 60, step: 4 },
  { a: 15, step: 7 },
  { a: -60, step: 4.5 },
  { a: 120, step: 5 },
  { a: 30, step: 3.5 },
];

// Five keyframes leave the strip, one per scene change, and land in a row.
const KEYS = [
  { cell: 4, t: 1.6, people: 1, objects: 1 },
  { cell: 9, t: 2.4, people: 0, objects: 2 },
  { cell: 12, t: 3.2, people: 2, objects: 0 },
  { cell: 18, t: 4.0, people: 1, objects: 1 },
  { cell: 23, t: 4.8, people: 0, objects: 1 },
];
const CARD = { w: 112, h: 74, y: 214 };
const cardX = (i: number) => 112 + i * 170;

// The index: scene nodes under each card, entities along the bottom.
const ENTITIES = [
  { id: "p1", kind: "person", x: 196, links: [0, 2, 3] },
  { id: "o1", kind: "object", x: 340, links: [0, 1] },
  { id: "p2", kind: "person", x: 480, links: [2] },
  { id: "o2", kind: "object", x: 620, links: [1, 3, 4] },
  { id: "o3", kind: "object", x: 760, links: [4] },
] as const;
const SCENE_NODE_Y = 356;
const ENTITY_Y = 446;

// The query walks: query → p1 → scene 3 → keyframe 3 → its frame in the strip.
const ANSWER = 3;
const QUERY = { x: 890, y: 446 };

function stripX(k: number, t: number) {
  const run = Math.min(t, FREEZE);
  return 46 + k * PITCH - run * SPEED;
}

function Frame({ x, y, w, h, look, idSeed, ink }: { x: number; y: number; w: number; h: number; look: (typeof LOOKS)[number]; idSeed: number; ink: string }) {
  const d = useMemo(() => hatch(x + 2, y + 2, x + w - 2, y + h - 2, look.step, look.a), [x, y, w, h, look]);
  return (
    <g key={idSeed}>
      <rect x={r1(x)} y={r1(y)} width={w} height={h} fill="#f7f3ea" stroke={ink} strokeWidth={1} />
      <path d={d} stroke={ink} strokeWidth={0.5} opacity={0.55} />
    </g>
  );
}

function Person({ x, y, s = 1, color = INK }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) scale(${s})`} fill="#f7f3ea" stroke={color} strokeWidth={1.3}>
      <circle cx={0} cy={-6} r={5} />
      <path d="M-9 9 C-9 1 -5 -0.5 0 -0.5 C5 -0.5 9 1 9 9 Z" />
    </g>
  );
}

function ObjectMark({ x, y, s = 1, color = INK }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) scale(${s})`} fill="#f7f3ea" stroke={color} strokeWidth={1.3}>
      <path d="M0 -9 L9 0 L0 9 L-9 0 Z" />
      <path d="M-4.5 -4.5 L4.5 4.5" strokeWidth={0.6} />
    </g>
  );
}

export default function MemoriesPlate() {
  const grain = useMemo(() => {
    const rand = rng(7);
    return Array.from({ length: N_CELLS }, () => rand());
  }, []);

  return (
    <Plate
      loop={LOOP}
      still={10.2}
      label="Hours of video run past; keyframes are pulled out at scene changes, people and objects are boxed inside them and indexed as a graph, and a query walks the graph to the exact moment in the footage."
    >
      {(t) => {
        const fade = 1 - seg(t, 11.4, 12);
        const sampled = Math.floor(Math.min(t, FREEZE) * 61);
        const kept = KEYS.filter((k) => t > k.t + 0.7).length;
        const q = seg(t, 7.2, 7.6);
        // query path progress across its four hops
        const hop = (i: number) => ease(seg(t, 7.6 + i * 0.42, 7.6 + (i + 1) * 0.42));
        const found = seg(t, 9.3, 9.6);
        const answerCellX = stripX(KEYS[ANSWER].cell, t);
        const answerEntity = ENTITIES[0];

        return (
          <g opacity={fade}>
            {/* ── the footage ───────────────────────────── */}
            <path d={`M30 ${STRIP_Y - 12}H930M30 ${STRIP_Y + CELL_H + 12}H930`} stroke={INK} strokeWidth={1.1} />
            {Array.from({ length: N_CELLS }, (_, k) => {
              const x = stripX(k, t);
              if (x < 20 || x > 920) return null;
              const look = LOOKS[sceneOf(k) % LOOKS.length];
              const isAnswer = k === KEYS[ANSWER].cell && found > 0;
              return (
                <g key={k}>
                  <rect x={r1(x + 14)} y={STRIP_Y - 9} width={8} height={4} fill={INK} opacity={0.5} />
                  <rect x={r1(x + 14)} y={STRIP_Y + CELL_H + 5} width={8} height={4} fill={INK} opacity={0.5} />
                  <Frame x={x} y={STRIP_Y} w={CELL_W} h={CELL_H} look={look} idSeed={k} ink={isAnswer ? ACCENT : INK} />
                  {SCENES.includes(k) && k > 0 ? <path d={`M${r1(x - 3)} ${STRIP_Y - 16}V${STRIP_Y + CELL_H + 16}`} stroke={INK} strokeWidth={0.7} strokeDasharray="2 2" opacity={0.6} /> : null}
                  {grain[k] > 0.8 ? <circle cx={r1(x + CELL_W - 6)} cy={STRIP_Y + 6} r={1.2} fill={INK} opacity={0.4} /> : null}
                </g>
              );
            })}
            {/* what would fit in a model's context: a sliver */}
            <g opacity={1 - seg(t, 1.2, 1.8)}>
              <path d={`M46 ${STRIP_Y - 24}V${STRIP_Y - 30}H${46 + PITCH * 2 - 6}V${STRIP_Y - 24}`} fill="none" stroke={ACCENT} strokeWidth={1.3} />
              <Caption x={46} y={STRIP_Y - 38} color={ACCENT} anchor="start" opacity={0.9}>
                fits in context
              </Caption>
            </g>
            <Caption x={930} y={STRIP_Y - 24} color={INK} anchor="end">
              hours of video →
            </Caption>

            {/* ── keyframes leave the strip ──────────────── */}
            {KEYS.map((key, i) => {
              const fly = easeOut(seg(t, key.t, key.t + 0.7));
              if (fly <= 0) return null;
              const fromX = stripX(key.cell, key.t);
              const x = lerp(fromX, cardX(i), fly);
              const y = lerp(STRIP_Y, CARD.y, fly);
              const w = lerp(CELL_W, CARD.w, fly);
              const h = lerp(CELL_H, CARD.h, fly);
              const look = LOOKS[sceneOf(key.cell) % LOOKS.length];
              const boxes = seg(t, key.t + 0.8, key.t + 1.3);
              const isAnswer = i === ANSWER && found > 0;
              const ink = isAnswer ? ACCENT : INK;
              return (
                <g key={i}>
                  {fly < 1 ? <path d={`M${r1(fromX + CELL_W / 2)} ${STRIP_Y + CELL_H}L${r1(x + w / 2)} ${r1(y)}`} stroke={INK} strokeWidth={0.6} strokeDasharray="1 4" opacity={0.5} /> : null}
                  <rect x={r1(x + 4)} y={r1(y + 4)} width={r1(w)} height={r1(h)} fill={INK} opacity={0.08} />
                  <Frame x={x} y={y} w={w} h={h} look={look} idSeed={100 + i} ink={ink} />
                  {/* detections drawn into the landed frame */}
                  {fly >= 1 ? (
                    <g opacity={boxes}>
                      {Array.from({ length: key.people }, (_, p) => {
                        const px = x + 26 + p * 40;
                        return (
                          <g key={`p${p}`}>
                            <rect x={r1(px - 14)} y={r1(y + 14)} width={28} height={36} fill="#f7f3ea" stroke={ink} strokeWidth={1.2} strokeDasharray={boxes < 1 ? "3 2" : undefined} />
                            <Person x={px} y={y + 34} s={0.9} color={ink} />
                          </g>
                        );
                      })}
                      {Array.from({ length: key.objects }, (_, o) => {
                        const ox = x + w - 26 - o * 34;
                        return (
                          <g key={`o${o}`}>
                            <rect x={r1(ox - 13)} y={r1(y + h - 36)} width={26} height={26} fill="#f7f3ea" stroke={ink} strokeWidth={1.2} strokeDasharray={boxes < 1 ? "3 2" : undefined} />
                            <ObjectMark x={ox} y={y + h - 23} s={0.8} color={ink} />
                          </g>
                        );
                      })}
                    </g>
                  ) : null}
                </g>
              );
            })}
            <Caption x={40} y={CARD.y + CARD.h / 2 + 4} color={INK} anchor="start" opacity={0.55 * seg(t, 1.8, 2.3)}>
              keyframes
            </Caption>

            {/* ── the index ──────────────────────────────── */}
            {KEYS.map((key, i) => {
              const on = seg(t, key.t + 1.2, key.t + 1.6);
              const cx = cardX(i) + CARD.w / 2;
              const lit = i === ANSWER && hop(1) > 0;
              return (
                <g key={`s${i}`} opacity={on}>
                  <path d={`M${cx} ${CARD.y + CARD.h + 4}V${SCENE_NODE_Y - 9}`} stroke={lit && hop(2) > 0 ? ACCENT : INK} strokeWidth={lit && hop(2) > 0 ? 1.6 : 0.6} opacity={lit ? 1 : 0.4} />
                  <rect x={cx - 9} y={SCENE_NODE_Y - 9} width={18} height={18} fill={lit ? ACCENT : "#f7f3ea"} stroke={lit ? ACCENT : INK} strokeWidth={1.3} />
                </g>
              );
            })}
            {ENTITIES.map((e) => {
              const first = Math.min(...e.links.map((l) => KEYS[l].t));
              const on = seg(t, first + 1.4, first + 1.9);
              const isAnswer = e === answerEntity && hop(0) > 0;
              return (
                <g key={e.id} opacity={on}>
                  {e.links.map((l) => {
                    const sx = cardX(l) + CARD.w / 2;
                    const linkOn = seg(t, KEYS[l].t + 1.5, KEYS[l].t + 2.0);
                    const onPath = isAnswer && l === ANSWER;
                    const k = onPath ? hop(1) : 1;
                    return (
                      <g key={l} opacity={linkOn}>
                        <path d={`M${sx} ${SCENE_NODE_Y + 9}L${e.x} ${ENTITY_Y - 12}`} stroke={INK} strokeWidth={0.7} opacity={0.35} />
                        {onPath && k > 0 ? (
                          <path d={`M${e.x} ${ENTITY_Y - 12}L${r1(lerp(e.x, sx, k))} ${r1(lerp(ENTITY_Y - 12, SCENE_NODE_Y + 9, k))}`} stroke={ACCENT} strokeWidth={1.8} />
                        ) : null}
                      </g>
                    );
                  })}
                  {e.kind === "person" ? <Person x={e.x} y={ENTITY_Y} color={isAnswer ? ACCENT : INK} /> : <ObjectMark x={e.x} y={ENTITY_Y} color={INK} />}
                </g>
              );
            })}
            <Caption x={40} y={SCENE_NODE_Y + 4} color={INK} anchor="start" opacity={0.55 * seg(t, 2.8, 3.3)}>
              scenes
            </Caption>
            <Caption x={40} y={ENTITY_Y + 4} color={INK} anchor="start" opacity={0.55 * seg(t, 3.0, 3.5)}>
              people · objects
            </Caption>

            {/* ── the query ──────────────────────────────── */}
            <g opacity={q}>
              <circle cx={QUERY.x - 4} cy={QUERY.y - 4} r={11} fill="#f7f3ea" stroke={ACCENT} strokeWidth={1.8} />
              <path d={`M${QUERY.x + 4} ${QUERY.y + 4}L${QUERY.x + 13} ${QUERY.y + 13}`} stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round" />
              <Caption x={QUERY.x} y={QUERY.y + 38} color={ACCENT} opacity={0.9}>
                query
              </Caption>
              {hop(0) > 0 ? (
                <path
                  d={`M${QUERY.x - 18} ${QUERY.y - 4}Q ${r1((QUERY.x + answerEntity.x) / 2)} ${ENTITY_Y + 70} ${r1(lerp(QUERY.x - 18, answerEntity.x + 12, hop(0)))} ${r1(lerp(QUERY.y - 4, ENTITY_Y + 4, hop(0)))}`}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                />
              ) : null}
            </g>
            {/* scene → keyframe → the moment in the footage */}
            {hop(3) > 0 ? (
              <path
                d={`M${cardX(ANSWER) + CARD.w / 2} ${CARD.y}L${r1(lerp(cardX(ANSWER) + CARD.w / 2, answerCellX + CELL_W / 2, hop(3)))} ${r1(lerp(CARD.y, STRIP_Y + CELL_H + 2, hop(3)))}`}
                stroke={ACCENT}
                strokeWidth={1.8}
              />
            ) : null}
            {found > 0 ? (
              <g opacity={found}>
                <rect x={r1(answerCellX - 5)} y={STRIP_Y - 5} width={CELL_W + 10} height={CELL_H + 10} fill="none" stroke={ACCENT} strokeWidth={2} />
                <text x={r1(answerCellX + CELL_W / 2)} y={STRIP_Y + CELL_H + 34} textAnchor="middle" fill={ACCENT} className="exCaption">
                  <tspan className="exNum">3:42:10</tspan>
                </text>
              </g>
            ) : null}

            {/* counters */}
            <text x={40} y={500} fill={INK} className="exCaption" opacity={0.75}>
              frames sampled <tspan className="exNum">{String(sampled).padStart(3, "0")}</tspan>
            </text>
            <text x={250} y={500} fill={ACCENT} className="exCaption">
              kept <tspan className="exNum">{kept}</tspan>
            </text>
          </g>
        );
      }}
    </Plate>
  );
}
