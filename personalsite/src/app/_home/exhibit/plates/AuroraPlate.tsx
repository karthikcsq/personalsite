"use client";

// Samsung Research America: Aurora, the agent runtime.
// Left, a catalog that keeps growing: tools, skills and modes are registered
// by different hands, and MCP tools nobody on the team wrote slide in through
// a plug on the same shelf. Right, one engraved Aurora core. On each request it
// reaches into the catalog and pulls only the two or three cards it needs into
// context; everything else stays on the shelf. The same core docks into one
// host device after another (glasses, phone, robot, home) and a mode card sets
// what it is for there. No product numbers: the counters count the drawing.
import { useMemo, type ReactNode } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, easeOut, hatch, lerp, quad, r1, rng, roundRectPath, seg, sphereLines, window01 } from "../engrave";
import { Caption } from "../glyphs";

const LOOP = 14;
const CARD = { w: 22, h: 30 };
const SLOT = 29;
const SHELF_X = 122;
const BOARDS = [176, 256, 336, 416];
const ROWS = ["tools", "skills", "modes", "mcp"] as const;
type Kind = 0 | 1 | 2 | 3;

// arrival times per shelf; the first few pop in as the loop opens
const ARRIVALS: number[][] = [
  [0.1, 0.35, 0.6, 0.85, 2.6, 5.1, 7.9, 10.6, 12.2],
  [0.2, 0.45, 0.7, 1.9, 4.4, 6.8, 9.3, 11.7],
  [0.3, 0.55, 0.8, 1.05, 3.8, 8.6, 12.6],
  [0.4, 0.9, 3.1, 6.1, 9.0, 11.2],
];

const C = { x: 742, y: 258, r: 48 };
const TRAY = { x: 520, ys: [196, 258, 320], s: 1.35 };
const EP0 = 1.8;
const EP = 2.9;

type Device = "glasses" | "phone" | "robot" | "home";
const EPISODES: { device: Device; name: string; mode: string | null; pulls: [Kind, number][] }[] = [
  { device: "glasses", name: "xr glasses", mode: "museum", pulls: [[2, 0], [1, 1], [0, 1]] },
  { device: "phone", name: "phone", mode: "running", pulls: [[2, 1], [0, 4], [3, 2]] },
  { device: "robot", name: "robot", mode: "logistics", pulls: [[2, 2], [1, 4], [0, 2]] },
  { device: "home", name: "home", mode: null, pulls: [[0, 6], [3, 4]] },
];

const LIGHT = "#fbf8f1";
const BODY = "#f6f2e8";

const slotX = (i: number) => SHELF_X + i * SLOT + CARD.w / 2;
const cardY = (row: number) => BOARDS[row] - CARD.h / 2 - 1;

/** Shelf position of card `idx` on row `row` at time t (MCP cards push in from the plug). */
function shelfPos(row: number, idx: number, t: number): { x: number; y: number; on: number } {
  const arr = ARRIVALS[row];
  const a = arr[idx];
  const e = ease(seg(t, a, a + 0.5));
  if (row === 3) {
    let p = -1 + e;
    for (let k = idx + 1; k < arr.length; k++) p += ease(seg(t, arr[k], arr[k] + 0.5));
    return { x: slotX(p), y: cardY(row), on: seg(t, a, a + 0.25) };
  }
  return { x: slotX(idx), y: cardY(row) - (1 - easeOut(seg(t, a, a + 0.45))) * 30, on: seg(t, a, a + 0.3) };
}

function CardFace({ kind, color, mark }: { kind: Kind; color: string; mark: number }) {
  const hw = CARD.w / 2;
  const hh = CARD.h / 2;
  // a small owner's mark in a different corner/angle per card: different hands
  const corner = mark % 4;
  const mx = corner % 2 ? hw - 6 : -hw + 1;
  const my = corner < 2 ? -hh + 1 : hh - 6;
  return (
    <>
      <rect x={-hw + 2.5} y={-hh + 3} width={CARD.w} height={CARD.h} fill={INK} opacity={0.12} />
      <rect x={-hw} y={-hh} width={CARD.w} height={CARD.h} fill={LIGHT} stroke={color} strokeWidth={1.1} />
      <path d={`M${mx} ${my}h5v5h-5z`} fill={color} opacity={0.55} />
      <g fill="none" stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
        {kind === 0 || kind === 3 ? (
          <>
            <path d="M-5 7L1.6 0.4" />
            <path d="M2 -6.2a4 4 0 1 0 4.2 4.2l-2.6 0.2-1.8-1.8z" />
          </>
        ) : null}
        {kind === 1 ? <path d="M-5.5 -5H5.5M-5.5 -1H5.5M-5.5 3H5.5M-5.5 7H2" /> : null}
        {kind === 2 ? (
          <>
            <path d="M0 -7.5L5 0L0 7.5L-5 0Z" />
            <circle cx={0} cy={0} r={1.3} fill={color} />
          </>
        ) : null}
        {kind === 3 ? <path d={`M-4 ${-hh}v-4M4 ${-hh}v-4`} strokeWidth={1.4} /> : null}
      </g>
    </>
  );
}

function DeviceArt({ device, act }: { device: Device; act: number }) {
  const s = INK;
  if (device === "glasses") {
    return (
      <g fill="none" stroke={s}>
        <path d="M-56 -34Q0 -66 56 -34" strokeWidth={6} opacity={0.9} />
        <path d="M-56 -34Q0 -62 56 -34" strokeWidth={1} stroke={LIGHT} />
        <path d="M-183 -38H-206L-214 -30M183 -38H206L214 -30" strokeWidth={2} />
        {[-1, 1].map((d) => {
          const x = d * 120 - 66;
          return (
            <g key={d}>
              <path d={roundRectPath(x + 4, -46, 132, 94, 30)} fill={INK} opacity={0.1} stroke="none" />
              <path d={roundRectPath(x, -50, 132, 94, 30)} fill={BODY} strokeWidth={2.2} />
              <path d={roundRectPath(x + 7, -43, 118, 80, 24)} strokeWidth={0.6} opacity={0.6} />
              <path d={hatch(x + 24, -34, x + 70, 10, 6, 60)} strokeWidth={0.45} opacity={0.3} />
            </g>
          );
        })}
        {/* a surface drawn in the right lens */}
        <g opacity={act}>
          <path d={roundRectPath(84, -18, 70, 40, 5)} fill={LIGHT} stroke={ACCENT} strokeWidth={1.3} />
          <path d="M94 -7H142M94 2H130M94 11H122" stroke={ACCENT} strokeWidth={1} />
        </g>
      </g>
    );
  }
  if (device === "phone") {
    return (
      <g fill="none" stroke={s}>
        <path d={roundRectPath(-73, -145, 156, 300, 24)} fill={INK} opacity={0.12} stroke="none" />
        <path d={roundRectPath(-78, -150, 156, 300, 24)} fill={BODY} strokeWidth={1.8} />
        <path d={roundRectPath(-70, -142, 140, 284, 17)} strokeWidth={0.6} opacity={0.6} />
        <path d={hatch(-62, -120, 62, 128, 7, 45)} strokeWidth={0.35} opacity={0.2} />
        <rect x={-16} y={-136} width={32} height={7} rx={3.5} fill={INK} opacity={0.75} stroke="none" />
        <g opacity={act}>
          <path d={roundRectPath(-54, 70, 108, 54, 6)} fill={LIGHT} stroke={ACCENT} strokeWidth={1.3} />
          <path d="M-42 84H40M-42 96H24M-42 108H10" stroke={ACCENT} strokeWidth={1} />
        </g>
      </g>
    );
  }
  if (device === "robot") {
    return (
      <g fill="none" stroke={s} strokeLinejoin="round">
        <path d="M0 -160V-180" strokeWidth={1.4} />
        <circle cx={0} cy={-185} r={5} fill={act > 0.5 ? ACCENT : BODY} strokeWidth={1.3} />
        <path d="M-88 -48L-128 -12V34M88 -48L128 -12V34" strokeWidth={3.2} />
        <path d="M-139 34v6a11 11 0 0 0 22 0v-6M117 34v6a11 11 0 0 0 22 0v-6" strokeWidth={1.8} strokeLinecap="round" />
        <path d={roundRectPath(-75, 84, 160, 42, 21)} fill={INK} opacity={0.12} stroke="none" />
        <path d={roundRectPath(-80, 80, 160, 42, 21)} fill={BODY} strokeWidth={1.6} />
        {[-50, 0, 50].map((x) => (
          <g key={x}>
            <circle cx={x} cy={101} r={13} strokeWidth={1.1} />
            <circle cx={x} cy={101} r={4} fill={INK} stroke="none" />
          </g>
        ))}
        <rect x={-22} y={-92} width={44} height={14} fill={BODY} strokeWidth={1.2} />
        <path d={roundRectPath(-83, -75, 176, 158, 18)} fill={INK} opacity={0.12} stroke="none" />
        <path d={roundRectPath(-88, -80, 176, 158, 18)} fill={BODY} strokeWidth={1.8} />
        <path d={hatch(-80, 50, 80, 72, 4, 0)} strokeWidth={0.5} opacity={0.4} />
        <path d={roundRectPath(-56, -160, 112, 70, 14)} fill={BODY} strokeWidth={1.8} />
        {[-22, 22].map((x) => (
          <g key={x}>
            <circle cx={x} cy={-126} r={10} fill={LIGHT} strokeWidth={1.3} />
            <circle cx={x} cy={-126} r={4} fill={act > 0.5 ? ACCENT : INK} stroke="none" />
          </g>
        ))}
      </g>
    );
  }
  // home
  return (
    <g fill="none" stroke={s} strokeLinejoin="round">
      <rect x={96} y={-176} width={26} height={60} fill={BODY} strokeWidth={1.4} />
      <path d="M-150 -86V112H150V-86" fill={BODY} strokeWidth={1.8} />
      <path d={hatch(-146, -84, 146, 108, 9, 0)} strokeWidth={0.3} opacity={0.18} />
      <path d="M-184 -78L0 -196L184 -78Z" fill={BODY} stroke="none" />
      <path d="M-184 -78L0 -196L184 -78" strokeWidth={2.2} />
      <path d="M-170 -80L0 -186L170 -80" strokeWidth={0.6} opacity={0.6} />
      <path d={roundRectPath(76, 22, 46, 90, 3)} fill={LIGHT} strokeWidth={1.3} />
      <circle cx={112} cy={70} r={2.4} fill={INK} stroke="none" />
      <rect x={-132} y={30} width={56} height={46} fill={LIGHT} strokeWidth={1.3} />
      <path d="M-104 30V76M-132 53H-76" strokeWidth={0.8} />
      <path d="M-186 112H186" strokeWidth={1} opacity={0.6} />
      {/* the lights tool, working */}
      <path d="M-100 -86V-50" strokeWidth={1} />
      <circle cx={-100} cy={-38} r={11} fill={act > 0.5 ? ACCENT : LIGHT} stroke={act > 0.5 ? ACCENT : INK} strokeWidth={1.3} />
      <path d="M-106 -50h12" strokeWidth={2} />
      <g stroke={ACCENT} strokeWidth={1.3} strokeLinecap="round" opacity={act}>
        {[0, 1, 2, 3, 4, 5, 6].map((k) => {
          const a = ((200 + k * 23) * Math.PI) / 180;
          return <path key={k} d={`M${r1(-100 - Math.cos(a) * 18)} ${r1(-38 - Math.sin(a) * 18)}L${r1(-100 - Math.cos(a) * 27)} ${r1(-38 - Math.sin(a) * 27)}`} />;
        })}
      </g>
    </g>
  );
}

export default function AuroraPlate() {
  const coreLines = useMemo(() => sphereLines(C.x, C.y, C.r, 4.6), []);
  const marks = useMemo(() => {
    const rand = rng(29);
    return ARRIVALS.map((row) => row.map(() => Math.floor(rand() * 4)));
  }, []);
  const ticks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, k) => {
        const a = (k / 24) * Math.PI * 2;
        const r0 = C.r + 9;
        const r = r0 + (k % 2 ? 4 : 8);
        return `M${r1(C.x + Math.cos(a) * r0)} ${r1(C.y + Math.sin(a) * r0)}L${r1(C.x + Math.cos(a) * r)} ${r1(C.y + Math.sin(a) * r)}`;
      }).join(""),
    [],
  );

  return (
    <Plate
      loop={LOOP}
      still={3.7}
      label="Aurora, an agent runtime: a catalog of tools, skills, modes and MCP tools keeps growing on a shelf; for each request the Aurora core pulls only the two or three cards it needs into context, while the same core docks into XR glasses, a phone, a robot and a home in turn."
    >
      {(t) => {
        const fade = 1 - seg(t, 13.4, 14);
        const k = Math.min(EPISODES.length - 1, Math.max(0, Math.floor((t - EP0) / EP)));
        const ep = EPISODES[k];
        const s = EP0 + k * EP;
        const live = t >= EP0;
        const dockIn = ease(seg(t, s, s + 0.5));
        const dockOut = ease(seg(t, s + 2.4, s + 2.9));
        const devOp = live ? dockIn * (1 - dockOut) : 0;
        const docked = live ? seg(t, s + 0.4, s + 0.55) * (1 - seg(t, s + 0.6, s + 0.95)) : 0;
        const request = live ? seg(t, s + 0.45, s + 0.95) : 0;
        const act = live ? window01(t, s + 1.55, s + 2.35, 0.2) : 0;
        const busy = live ? window01(t, s + 0.5, s + 2.3, 0.3) : 0;

        // which shelf cards are picked right now, and where they are
        const picked = new Map<string, { i: number; reach: number; fly: number; back: number }>();
        if (live) {
          ep.pulls.forEach(([row, idx], i) => {
            const r0 = s + 0.62 + i * 0.22;
            const b0 = s + 2.1 + i * 0.07;
            if (t >= r0 && t < b0 + 0.4) {
              picked.set(`${row}:${idx}`, { i, reach: seg(t, r0, r0 + 0.2), fly: ease(seg(t, r0 + 0.2, r0 + 0.56)), back: ease(seg(t, b0, b0 + 0.4)) });
            }
          });
        }

        let catalog = 0;
        let inContext = 0;
        const shelfCards: ReactNode[] = [];
        const ghosts: ReactNode[] = [];
        const flying: ReactNode[] = [];
        const reaches: ReactNode[] = [];
        ARRIVALS.forEach((arr, row) => {
          arr.forEach((a, idx) => {
            if (t < a) return;
            const p = shelfPos(row, idx, t);
            if (p.on >= 1) catalog++;
            const key = `${row}:${idx}`;
            const pk = picked.get(key);
            const kind = row as Kind;
            if (!pk || pk.fly <= 0) {
              const hl = pk ? pk.reach : 0;
              shelfCards.push(
                <g key={key} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} opacity={p.on}>
                  <CardFace kind={kind} color={hl > 0.9 ? ACCENT : INK} mark={marks[row][idx]} />
                </g>,
              );
            }
            if (pk) {
              const tray = { x: TRAY.x, y: TRAY.ys[pk.i] };
              if (pk.fly > 0) {
                ghosts.push(<rect key={key} x={r1(p.x - CARD.w / 2)} y={r1(p.y - CARD.h / 2)} width={CARD.w} height={CARD.h} fill="none" stroke={INK} strokeWidth={0.7} strokeDasharray="2 2.5" opacity={0.5} />);
              }
              // the reach: a dashed accent line from the core out to the card
              const from: [number, number] = [C.x - C.r - 4, C.y];
              const ctrl: [number, number] = [(from[0] + p.x) / 2, Math.min(from[1], p.y) - 70];
              const reachK = pk.reach * (1 - pk.fly);
              if (reachK > 0.02) {
                const pts: string[] = [];
                for (let j = 0; j <= 20; j++) {
                  const [x, y] = quad(from, ctrl, [p.x, p.y - CARD.h / 2 - 3], (reachK * j) / 20);
                  pts.push(`${j ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
                }
                reaches.push(<path key={key} d={pts.join("")} fill="none" stroke={ACCENT} strokeWidth={1.1} strokeDasharray="2 3.5" opacity={1 - pk.fly} />);
              }
              if (pk.fly > 0) {
                const out = pk.back <= 0;
                const k2 = out ? pk.fly : 1 - pk.back;
                const [x, y] = quad([p.x, p.y], [lerp(p.x, tray.x, 0.5), Math.min(p.y, tray.y) - 60], [tray.x, tray.y], k2);
                const sc = lerp(1, TRAY.s, k2);
                if (k2 >= 0.98) inContext++;
                flying.push(
                  <g key={key} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(3)})`}>
                    <CardFace kind={kind} color={ACCENT} mark={marks[row][idx]} />
                  </g>,
                );
              }
            }
          });
        });

        const modeK = live && ep.mode ? (() => {
          const r0 = s + 0.62;
          return seg(t, r0 + 0.5, r0 + 0.75) * (1 - seg(t, s + 2.3, s + 2.6));
        })() : 0;
        const orbitRot = -14 + busy * Math.sin((t - s) * 2.2) * 10;
        const orbitA = (t - s) * 3.4;
        const ox = Math.cos(orbitA) * C.r * 1.45;
        const oy = Math.sin(orbitA) * C.r * 0.3;
        const rot = (orbitRot * Math.PI) / 180;

        return (
          <g opacity={fade}>
            {/* shelves */}
            {BOARDS.map((y, row) => (
              <g key={y}>
                <path d={`M${SHELF_X - 10} ${y}H448`} stroke={INK} strokeWidth={1.4} />
                <path d={hatch(SHELF_X - 10, y + 1, 448, y + 7, 3.2, 70)} stroke={INK} strokeWidth={0.45} opacity={0.45} />
                <path d={`M${SHELF_X - 10} ${y + 7}H448`} stroke={INK} strokeWidth={0.5} opacity={0.5} />
                <Caption x={44} y={y - 11} color={INK} anchor="start">{ROWS[row]}</Caption>
              </g>
            ))}
            {/* the MCP plug: tools from outside come in on the same shelf */}
            <g fill="none" stroke={INK} strokeLinejoin="round">
              <path d={`M20 ${cardY(3)}H92`} strokeWidth={0.8} strokeDasharray="1 4" opacity={0.55} />
              <rect x={92} y={cardY(3) - 13} width={14} height={26} fill={BODY} strokeWidth={1.3} />
              <path d={`M106 ${cardY(3) - 6}h6M106 ${cardY(3) + 6}h6`} strokeWidth={1.6} />
            </g>
            {ghosts}
            {shelfCards}

            {/* context tray */}
            <g fill="none" stroke={INK}>
              {TRAY.ys.map((y) => (
                <g key={y}>
                  <rect x={r1(TRAY.x - (CARD.w * TRAY.s) / 2 - 4)} y={r1(y - (CARD.h * TRAY.s) / 2 - 4)} width={r1(CARD.w * TRAY.s + 8)} height={r1(CARD.h * TRAY.s + 8)} strokeWidth={0.7} strokeDasharray="2 3" opacity={0.45} />
                  <path d={`M${TRAY.x + 20} ${y}Q${TRAY.x + 90} ${y} ${C.x - C.r - 12} ${C.y}`} strokeWidth={0.6} opacity={0.3} />
                </g>
              ))}
              <path d={`M${TRAY.x - 26} 160V356M${TRAY.x - 26} 160h6M${TRAY.x - 26} 356h6`} strokeWidth={0.8} opacity={0.55} />
              <path d={`M${TRAY.x + 26} 160V356M${TRAY.x + 26} 160h-6M${TRAY.x + 26} 356h-6`} strokeWidth={0.8} opacity={0.55} />
            </g>
            <Caption x={TRAY.x} y={378} color={INK}>context</Caption>

            {/* host device, docked behind the core */}
            {devOp > 0 ? (
              <g transform={`translate(${(C.x + (1 - dockIn) * 70).toFixed(1)} ${(C.y + dockOut * 22).toFixed(1)})`} opacity={devOp}>
                <DeviceArt device={ep.device} act={act} />
              </g>
            ) : null}

            {/* Aurora core: an engraved sphere in a dock ring */}
            <g>
              <circle cx={C.x} cy={C.y} r={C.r + 21} fill={BODY} stroke={INK} strokeWidth={0.6} opacity={0.9} />
              <path d={ticks} stroke={INK} strokeWidth={0.8} opacity={0.7} />
              {coreLines.map((l, i) => (
                <path key={i} d={l.d} stroke={INK} strokeWidth={l.w} opacity={0.85} />
              ))}
              <circle cx={C.x} cy={C.y} r={C.r} fill="none" stroke={INK} strokeWidth={1.4} />
              <ellipse cx={C.x} cy={C.y} rx={r1(C.r * 1.45)} ry={r1(C.r * 0.3)} fill="none" stroke={INK} strokeWidth={0.8} opacity={0.55} transform={`rotate(${orbitRot.toFixed(1)} ${C.x} ${C.y})`} />
              {busy > 0 ? (
                <circle cx={r1(C.x + ox * Math.cos(rot) - oy * Math.sin(rot))} cy={r1(C.y + ox * Math.sin(rot) + oy * Math.cos(rot))} r={3.4} fill={ACCENT} opacity={busy} />
              ) : null}
              {docked > 0 ? <circle cx={C.x} cy={C.y} r={C.r + 21} fill="none" stroke={ACCENT} strokeWidth={2.2} opacity={docked} /> : null}
              {request > 0 && request < 1 ? (
                <circle cx={C.x} cy={C.y} r={r1(C.r + 6 + request * 44)} fill="none" stroke={ACCENT} strokeWidth={1.4} opacity={1 - request} />
              ) : null}
            </g>

            {reaches}
            {flying}

            {/* device + mode */}
            <Caption x={C.x} y={466} color={INK} opacity={0.62 * devOp}>aurora · {ep.name}</Caption>
            {ep.mode ? (
              <text x={C.x} y={488} textAnchor="middle" fill={ACCENT} className="exCaption" opacity={modeK}>
                mode · {ep.mode}
              </text>
            ) : null}
            <Caption x={C.x} y={C.y - C.r - 32} color={INK} opacity={0.62 * (1 - devOp)}>aurora</Caption>

            {/* tally: counts of the drawing itself */}
            <text x={40} y={60} fill={INK} className="exCaption" opacity={0.75}>
              in catalog <tspan className="exNum">{String(catalog).padStart(2, "0")}</tspan>
            </text>
            <text x={40} y={86} fill={ACCENT} className="exCaption">
              in context <tspan className="exNum">{inContext}</tspan>
            </text>
          </g>
        );
      }}
    </Plate>
  );
}
