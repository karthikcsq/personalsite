"use client";

// Peraton Labs: the same network of IoT devices, twice. On the left a
// brute-force scan sweeps device by device. On the right the RL agent moves
// along the links between devices and reaches the dormant malware first.
// Same pace per step on both sides.
import { useMemo } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, hatch, lerp, rng, seg } from "../engrave";
import { Caption } from "../glyphs";

const LOOP = 13;
const STEP = 0.3;
const START = 0.6;
const GW = 360;
const GH = 340;
const PANELS = [
  { ox: 70, oy: 120, label: "brute-force scan" },
  { ox: 530, oy: 120, label: "rl agent" },
];

type Node = { x: number; y: number };

function buildGraph() {
  const rand = rng(8);
  const nodes: Node[] = [];
  const cols = 7;
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.14) continue;
      nodes.push({ x: (c + 0.5) * (GW / cols) + (rand() - 0.5) * 28, y: (r + 0.5) * (GH / rows) + (rand() - 0.5) * 26 });
    }
  }
  const edgeSet = new Set<string>();
  const adj: number[][] = nodes.map(() => []);
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { j } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      adj[i].push(j);
      adj[j].push(i);
    }
  });
  const edges = [...edgeSet].map((k) => k.split("-").map(Number) as [number, number]);
  // start: top-left-most. malware: three devices deep in the network
  const start = nodes.reduce((best, n, i) => (n.x + n.y < nodes[best].x + nodes[best].y ? i : best), 0);
  const byScan = nodes.map((_, i) => i).sort((a, b) => nodes[a].x - nodes[b].x || nodes[a].y - nodes[b].y);
  const malware = [byScan[Math.floor(byScan.length * 0.55)], byScan[Math.floor(byScan.length * 0.78)], byScan[byScan.length - 3]];

  const bfs = (from: number, to: number) => {
    const prev = new Map<number, number>([[from, -1]]);
    const q = [from];
    while (q.length) {
      const u = q.shift()!;
      if (u === to) break;
      for (const v of adj[u]) {
        if (!prev.has(v)) {
          prev.set(v, u);
          q.push(v);
        }
      }
    }
    const path: number[] = [];
    for (let v = to; v !== -1 && v !== undefined; v = prev.get(v)!) path.unshift(v);
    return path;
  };
  // greedy: nearest remaining malware by hops
  const path = [start];
  const left = new Set(malware);
  let cur = start;
  while (left.size) {
    let best: number[] | null = null;
    for (const m of left) {
      const p = bfs(cur, m);
      if (!best || p.length < best.length) best = p;
    }
    path.push(...best!.slice(1));
    cur = best![best!.length - 1];
    left.delete(cur);
  }
  return { nodes, edges, byScan, malware: new Set(malware), path };
}

export default function PeratonPlate() {
  const g = useMemo(() => buildGraph(), []);
  const scanTime = useMemo(() => {
    const m = new Map<number, number>();
    g.byScan.forEach((n, i) => m.set(n, START + i * STEP));
    return m;
  }, [g]);
  const agentTime = useMemo(() => {
    const m = new Map<number, number>();
    g.path.forEach((n, i) => {
      if (!m.has(n)) m.set(n, START + i * STEP);
    });
    return m;
  }, [g]);
  const bgHatch = useMemo(() => hatch(20, 20, 940, 520, 8, -60), []);

  return (
    <Plate loop={LOOP} still={5.2} label="The same IoT network twice: a brute-force scan sweeps device by device on the left; the reinforcement-learning agent moves along links on the right and finds the hidden malware sooner.">
      {(t) => {
        const fade = 1 - seg(t, LOOP - 0.6, LOOP);
        return (
          <g opacity={fade}>
            <path d={bgHatch} stroke={INK} strokeWidth={0.3} opacity={0.08} />
            <path d="M480 60V500" stroke={INK} strokeWidth={0.7} opacity={0.45} />
            {PANELS.map((panel, pi) => {
              const times = pi === 0 ? scanTime : agentTime;
              const found = [...g.malware].filter((m) => (times.get(m) ?? Infinity) <= t).length;
              const X = (n: number) => panel.ox + g.nodes[n].x;
              const Y = (n: number) => panel.oy + g.nodes[n].y;

              // scan: a sweep line across x
              let sweepX = panel.ox;
              if (pi === 0) {
                const k = (t - START) / STEP;
                const i = Math.max(0, Math.min(g.byScan.length - 1, Math.floor(k)));
                const j = Math.min(g.byScan.length - 1, i + 1);
                sweepX = lerp(X(g.byScan[i]), X(g.byScan[j]), ease(Math.max(0, Math.min(1, k - i))));
              }
              // agent: position along its path
              let ax = 0;
              let ay = 0;
              let trail = "";
              if (pi === 1) {
                const k = Math.max(0, (t - START) / STEP);
                const i = Math.min(g.path.length - 1, Math.floor(k));
                const j = Math.min(g.path.length - 1, i + 1);
                const f = ease(Math.min(1, k - i));
                ax = lerp(X(g.path[i]), X(g.path[j]), f);
                ay = lerp(Y(g.path[i]), Y(g.path[j]), f);
                trail = g.path.slice(0, i + 1).map((n, q) => `${q ? "L" : "M"}${X(n).toFixed(1)} ${Y(n).toFixed(1)}`).join("") + `L${ax.toFixed(1)} ${ay.toFixed(1)}`;
              }
              const done = found === g.malware.size;

              return (
                <g key={panel.label}>
                  <Caption x={panel.ox} y={86} color={INK} anchor="start" opacity={0.8}>{panel.label}</Caption>
                  <text x={panel.ox + GW} y={86} textAnchor="end" fill={found ? ACCENT : INK} className="exCaption" opacity={found ? 1 : 0.6}>
                    found <tspan className="exNum">{found}</tspan>/{g.malware.size}
                  </text>
                  {g.edges.map(([a, b]) => (
                    <path key={`${a}-${b}`} d={`M${X(a).toFixed(1)} ${Y(a).toFixed(1)}L${X(b).toFixed(1)} ${Y(b).toFixed(1)}`} stroke={INK} strokeWidth={0.7} opacity={0.32} />
                  ))}
                  {pi === 0 && t > START ? (
                    <>
                      <rect x={panel.ox - 10} y={panel.oy - 10} width={Math.max(0, sweepX - panel.ox + 10)} height={GH + 20} fill={INK} opacity={0.05} />
                      <path d={`M${sweepX.toFixed(1)} ${panel.oy - 14}V${panel.oy + GH + 14}`} stroke={INK} strokeWidth={1.4} />
                    </>
                  ) : null}
                  {pi === 1 && trail ? <path d={trail} fill="none" stroke={ACCENT} strokeWidth={1.8} strokeLinejoin="round" opacity={0.85} /> : null}
                  {g.nodes.map((_, n) => {
                    const vt = times.get(n);
                    const visited = vt !== undefined && vt <= t;
                    const bad = g.malware.has(n);
                    const reveal = bad && visited ? seg(t, vt!, vt! + 0.3) : 0;
                    return (
                      <g key={n} transform={`translate(${X(n).toFixed(1)} ${Y(n).toFixed(1)})`}>
                        <rect x={-6.5} y={-6.5} width={13} height={13} fill={visited ? "#e2d9c6" : "#f7f3ea"} stroke={INK} strokeWidth={visited ? 1.2 : 0.9} />
                        <path d="M-3 -6.5V-10M3 -6.5V-9" stroke={INK} strokeWidth={0.7} />
                        {reveal > 0 ? (
                          <>
                            <circle r={11 + (1 - reveal) * 14} fill="none" stroke={ACCENT} strokeWidth={1.6} opacity={0.4 + reveal * 0.6} />
                            <rect x={-6.5} y={-6.5} width={13} height={13} fill={ACCENT} />
                            <path d="M-10 -3h3M-10 3h3M7 -3h3M7 3h3M-3 -10v3M3 -10v3" stroke={ACCENT} strokeWidth={1.2} />
                          </>
                        ) : (
                          <circle r={1.6} fill={INK} opacity={0.7} />
                        )}
                      </g>
                    );
                  })}
                  {pi === 1 ? (
                    <g transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)})`}>
                      <path d="M0 -13 L7 0 L0 11 L-7 0 Z" fill={INK} />
                      <circle cy="-2.5" r="1.8" fill="#f7f3ea" />
                    </g>
                  ) : null}
                  {done ? <path d={`M${panel.ox + GW - 74} 96 h${74}`} stroke={ACCENT} strokeWidth={1.4} /> : null}
                </g>
              );
            })}
          </g>
        );
      }}
    </Plate>
  );
}
