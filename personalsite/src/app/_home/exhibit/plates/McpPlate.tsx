"use client";

// google-tools-mcp: one server, one OAuth flow. Seven Google apps start locked.
// A single key turns once in the server, the connection fans out, every app
// unlocks and its tools light up (169 in total, the count in his description).
// Then one request hops through the server across several apps in a row.
import Plate from "../Plate";
import { ACCENT, INK, ease, lerp, r1, seg } from "../engrave";
import { Caption, Glyph, type GlyphName } from "../glyphs";

const LOOP = 11;
const HUB = { x: 300, y: 270, w: 120, h: 168 };
const APPS: { name: string; glyph: GlyphName }[] = [
  { name: "Drive", glyph: "drive" },
  { name: "Docs", glyph: "doc" },
  { name: "Sheets", glyph: "sheet" },
  { name: "Slides", glyph: "slide" },
  { name: "Gmail", glyph: "mail" },
  { name: "Calendar", glyph: "calendar" },
  { name: "Forms", glyph: "form" },
];
const TOOLS = [25, 24, 24, 24, 24, 24, 24]; // 169
const TOTAL = TOOLS.reduce((a, b) => a + b, 0);
const NODE_R = 23;
const RING_R = 34;

function appPos(j: number) {
  const a = ((-72 + j * 24) * Math.PI) / 180;
  return { x: r1(HUB.x + 70 + Math.cos(a) * 400), y: r1(HUB.y + Math.sin(a) * 200) };
}

const CHAIN = [0, 1, 2, 3, 4]; // Drive → Docs → Sheets → Slides → Gmail

function Key({ x, y, turn, color }: { x: number; y: number; turn: number; color: string }) {
  // turning about its own axis: the bow is seen edge-on as it rotates
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(1.35 ${(1.35 * (1 - 0.5 * Math.sin(turn * Math.PI / 2))).toFixed(3)})`} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <circle cx={-40} cy={0} r={17} fill="#f7f3ea" />
      <circle cx={-40} cy={0} r={6} />
      <circle cx={-40} cy={0} r={12} strokeWidth={0.5} opacity={0.6} />
      <path d="M-23 -3.5 H22 V3.5 H-23" fill="#f7f3ea" />
      <path d="M6 3.5 V12 H11 V3.5 M14 3.5 V9 H19 V3.5" />
    </g>
  );
}

function Lock({ x, y, open, opacity }: { x: number; y: number; open: number; opacity: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} opacity={opacity} fill="none" stroke={INK} strokeWidth={1.3}>
      <path d={`M-5 ${-2 - open * 6} V${-6 - open * 6} a5 5 0 0 1 10 0 V${-2 - open * 2}`} />
      <rect x={-7.5} y={-2} width={15} height={11} rx={1.5} fill="#f7f3ea" />
      <circle cx={0} cy={3} r={1.4} fill={INK} />
    </g>
  );
}

export default function McpPlate() {
  return (
    <Plate loop={LOOP} still={8.1} label="Seven locked Google apps; one key turns once in a single server, the connection fans out, every app unlocks and its tools light up, then one request hops across Drive, Docs, Sheets, Slides and Gmail.">
      {(t) => {
        const fade = 1 - seg(t, 10.4, 11);
        const slide = ease(seg(t, 0.8, 2.0));
        const turn = ease(seg(t, 2.0, 2.5));
        const keyX = lerp(110, HUB.x - HUB.w / 2 - 20, slide);
        const hubLit = seg(t, 2.4, 2.7);
        let lit = 0;

        // request token through hub → app → hub → app ...
        const hops: [number, number][] = [];
        const hub: [number, number] = [HUB.x + HUB.w / 2, HUB.y];
        let prev = hub;
        for (const j of CHAIN) {
          const p = appPos(j);
          const node: [number, number] = [p.x - NODE_R, p.y];
          hops.push(prev, node);
          prev = node;
          hops.push(node);
          prev = hub;
          hops.push(hub);
        }
        const segs: [[number, number], [number, number]][] = [];
        for (let k = 0; k + 1 < hops.length; k += 2) segs.push([hops[k], hops[k + 1]]);
        const reqStart = 5.3;
        const per = 0.42;
        const reqK = (t - reqStart) / per;
        const activeSeg = Math.floor(reqK);
        let token: [number, number] | null = null;
        const visited = new Set<number>();
        if (reqK >= 0 && activeSeg < segs.length) {
          const [a, b] = segs[activeSeg];
          const f = ease(reqK - activeSeg);
          token = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
        }
        for (let k = 0; k < Math.min(segs.length, Math.max(0, Math.ceil(reqK))); k++) {
          if (k % 2 === 0) visited.add(CHAIN[k / 2]);
        }

        return (
          <g opacity={fade}>
            {/* fan of connections */}
            {APPS.map((app, j) => {
              const p = appPos(j);
              const start = 2.6 + j * 0.22;
              const draw = ease(seg(t, start, start + 0.5));
              const unlocked = seg(t, start + 0.45, start + 0.75);
              const dotsOn = seg(t, start + 0.5, start + 1.3);
              const n = TOOLS[j];
              const nLit = Math.round(dotsOn * n);
              lit += nLit;
              const x0 = HUB.x + HUB.w / 2;
              const ex = lerp(x0, p.x - NODE_R, draw);
              const ey = lerp(HUB.y, p.y, draw);
              const onChain = visited.has(j);
              const isTarget = token !== null && activeSeg % 2 === 0 && CHAIN[activeSeg / 2] === j;
              return (
                <g key={app.name}>
                  <path d={`M${x0} ${HUB.y}L${p.x - NODE_R} ${p.y}`} stroke={INK} strokeWidth={0.6} strokeDasharray="1 5" opacity={0.35} />
                  {draw > 0 ? <path d={`M${x0} ${HUB.y}L${ex.toFixed(1)} ${ey.toFixed(1)}`} stroke={INK} strokeWidth={1.2} /> : null}
                  {Array.from({ length: n }, (_, k) => {
                    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
                    return <circle key={k} cx={(p.x + Math.cos(a) * RING_R).toFixed(1)} cy={(p.y + Math.sin(a) * RING_R).toFixed(1)} r={k < nLit ? 2.1 : 1.1} fill={INK} opacity={k < nLit ? 0.9 : 0.25} />;
                  })}
                  <circle cx={p.x} cy={p.y} r={NODE_R} fill="#f7f3ea" stroke={onChain ? ACCENT : INK} strokeWidth={1.3 + (onChain ? 0.6 : 0)} opacity={0.4 + unlocked * 0.6} />
                  <Glyph name={app.glyph} x={p.x} y={p.y} s={0.92} color={INK} width={1.4} opacity={0.35 + unlocked * 0.65} />
                  {isTarget ? <circle cx={p.x} cy={p.y} r={NODE_R + 6 + (reqK - activeSeg) * 10} fill="none" stroke={ACCENT} strokeWidth={1.4} opacity={1 - (reqK - activeSeg)} /> : null}
                  <Lock x={p.x + 20} y={p.y - 24} open={unlocked} opacity={1 - seg(t, start + 0.75, start + 1.1)} />
                  <Caption x={p.x + RING_R + 14} y={p.y + 4} color={INK} anchor="start" opacity={0.45 + unlocked * 0.3}>
                    {app.name}
                  </Caption>
                </g>
              );
            })}

            {/* request trail */}
            {token ? (
              <>
                <path d={`M${segs[activeSeg][0][0]} ${segs[activeSeg][0][1]}L${token[0].toFixed(1)} ${token[1].toFixed(1)}`} stroke={ACCENT} strokeWidth={2} />
                <circle cx={token[0]} cy={token[1]} r={5.5} fill={ACCENT} />
              </>
            ) : null}

            {/* server */}
            <g>
              <rect x={HUB.x - HUB.w / 2 + 5} y={HUB.y - HUB.h / 2 + 5} width={HUB.w} height={HUB.h} fill={INK} opacity={0.1} />
              <rect x={HUB.x - HUB.w / 2} y={HUB.y - HUB.h / 2} width={HUB.w} height={HUB.h} fill="#f7f3ea" stroke={INK} strokeWidth={1.6} />
              {[0, 1, 2, 3].map((r) => (
                <g key={r}>
                  <rect x={HUB.x - HUB.w / 2 + 12} y={HUB.y - HUB.h / 2 + 14 + r * 38} width={HUB.w - 24} height={28} fill="none" stroke={INK} strokeWidth={0.8} />
                  {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                    <path key={v} d={`M${HUB.x - HUB.w / 2 + 22 + v * 8} ${HUB.y - HUB.h / 2 + 20 + r * 38}v16`} stroke={INK} strokeWidth={0.6} opacity={0.5} />
                  ))}
                  <circle cx={HUB.x + HUB.w / 2 - 22} cy={HUB.y - HUB.h / 2 + 28 + r * 38} r={3} fill={hubLit > 0.5 ? ACCENT : "none"} stroke={INK} strokeWidth={0.8} />
                </g>
              ))}
              <Caption x={HUB.x} y={HUB.y + HUB.h / 2 + 26} color={INK}>one server</Caption>
            </g>

            <Key x={keyX} y={HUB.y} turn={turn} color={turn > 0.95 ? ACCENT : INK} />
            <Caption x={keyX - 40} y={HUB.y + 46} color={INK} opacity={0.62 * (1 - slide)}>
              one sign-in
            </Caption>

            <text x={40} y={60} fill={INK} className="exCaption" opacity={0.75}>
              tools available <tspan className="exNum">{String(lit).padStart(3, "0")}</tspan>/{TOTAL}
            </text>
          </g>
        );
      }}
    </Plate>
  );
}
