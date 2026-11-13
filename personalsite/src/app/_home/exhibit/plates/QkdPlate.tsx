"use client";

// Photonic QKD: polarization-based key exchange on a bench. A laser sends single
// photons; a motor-driven polarizer sets each one's polarization in a random
// basis (+ or ×). They cross the fiber; the receiver's polarizer picks its own
// random basis and one of two detectors clicks. Bases are compared afterwards:
// matches keep their bit and the shared key builds up, mismatches are thrown
// away. In the second half an eavesdropper taps the fiber, re-sends what she
// measured, and the kept bits start disagreeing: the errors give her away.
import { useId, useMemo } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, hatch, lerp, r1, seg } from "../engrave";
import { Caption } from "../glyphs";

const LOOP = 14;
const N = 16;
const GAP = 0.66;
const T0 = 0.5;
const FLY = 0.5; // sender polarizer → receiver polarizer
const HOP = 0.18; // receiver polarizer → detector
const EVE_FROM = 12;
const EVE_ON = 7.6;

// 0 = "+" basis, 1 = "×" basis
const A = [0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0];
const BIT = [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0];
const B = [0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0];
// what the receiver's detectors report (matches agree unless the tap re-sent the photon wrongly)
const MEAS = [1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1];
// polarization the eavesdropper re-sends (deg), photons 12..15
const EVE_POL = [135, 45, 90, 135];

const pol = (basis: number, bit: number) => (basis === 0 ? (bit ? 0 : 90) : bit ? 135 : 45);

const Y = 214; // beam axis
const LASER = { x0: 46, x1: 138 };
const TX = { x: 190, r: 27 };
const FIB = { x0: 240, x1: 690 };
const TAP = 465;
const RX = { x: 740, r: 27 };
const PBS = 812;
const D0 = { x: 892, y: Y };
const D1 = { x: PBS, y: 282 };
const ROW = { sent: 360, meas: 404, key: 466 };
const colX = (i: number) => 262 + i * 36;
const slotX = (k: number) => 262 + k * 30;

const emit = (i: number) => T0 + i * GAP;
const arrive = (i: number) => emit(i) + FLY + HOP;
const sift = (i: number) => arrive(i) + 0.2;

const KEPT: { i: number; slot: number; err: boolean }[] = [];
for (let i = 0; i < N; i++) if (A[i] === B[i]) KEPT.push({ i, slot: KEPT.length, err: MEAS[i] !== BIT[i] });

function circleHatch(cx: number, cy: number, r: number, step: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = -Math.sin(a);
  let d = "";
  for (let o = -r + step / 2; o < r; o += step) {
    const half = Math.sqrt(r * r - o * o);
    const px = cx - dy * o;
    const py = cy + dx * o;
    d += `M${r1(px - dx * half)} ${r1(py - dy * half)}L${r1(px + dx * half)} ${r1(py + dy * half)}`;
  }
  return d;
}

/** Double-headed polarization arrow through (cx, cy). */
function polBar(cx: number, cy: number, deg: number, L: number) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = -Math.sin(a);
  const h = L / 2;
  const head = (s: number) => {
    const tx = cx + dx * h * s;
    const ty = cy + dy * h * s;
    const bx = tx - dx * 5 * s;
    const by = ty - dy * 5 * s;
    return `M${r1(bx - dy * 3)} ${r1(by + dx * 3)}L${r1(tx)} ${r1(ty)}L${r1(bx + dy * 3)} ${r1(by - dx * 3)}`;
  };
  return `M${r1(cx - dx * h)} ${r1(cy - dy * h)}L${r1(cx + dx * h)} ${r1(cy + dy * h)}${head(1)}${head(-1)}`;
}

/** Rotate from `from` to `to` (deg, mod 180) by the short way. */
function turn(from: number, to: number, k: number) {
  const d = ((((to - from + 90) % 180) + 180) % 180) - 90;
  return from + d * ease(k);
}

function Basis({ x, y, b, color, opacity = 1 }: { x: number; y: number; b: number; color: string; opacity?: number }) {
  const d = b === 0 ? `M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}` : `M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}`;
  return <path d={d} stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={opacity} />;
}

function Wheel({ x, ang, hot }: { x: number; ang: number; hot: number }) {
  const r = TX.r;
  return (
    <g>
      {/* post + motor */}
      <path d={`M${x} ${Y + r}V${Y + r + 22}`} stroke={INK} strokeWidth={3} />
      <rect x={x - 17} y={Y + r + 20} width={34} height={22} fill="#f7f3ea" stroke={INK} strokeWidth={1.2} />
      <path d={hatch(x - 17, Y + r + 20, x + 17, Y + r + 42, 3.5, 90)} stroke={INK} strokeWidth={0.4} opacity={0.5} />
      <circle cx={x} cy={Y} r={r + 7} fill="#f7f3ea" stroke={INK} strokeWidth={1.4} />
      {Array.from({ length: 24 }, (_, k) => {
        const a = (k / 24) * Math.PI * 2;
        const l = k % 6 === 0 ? 5 : 2.5;
        return <path key={k} d={`M${r1(x + Math.cos(a) * (r + 7))} ${r1(Y + Math.sin(a) * (r + 7))}L${r1(x + Math.cos(a) * (r + 7 - l))} ${r1(Y + Math.sin(a) * (r + 7 - l))}`} stroke={INK} strokeWidth={0.7} />;
      })}
      <circle cx={x} cy={Y} r={r} fill="#efe8d8" stroke={INK} strokeWidth={0.8} />
      <path d={circleHatch(x, Y, r, 3.6, ang)} stroke={INK} strokeWidth={0.6} opacity={0.55} />
      <path d={polBar(x, Y, ang, 2 * r + 4)} fill="none" stroke={hot > 0 ? ACCENT : INK} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Detector({ x, y, fire, label, vertical }: { x: number; y: number; fire: number; label: string; vertical?: boolean }) {
  const w = vertical ? 34 : 30;
  const h = vertical ? 30 : 38;
  const bx = vertical ? x - w / 2 : x - 6;
  const by = vertical ? y - 6 : y - h / 2;
  return (
    <g>
      {fire > 0 ? <circle cx={bx + w / 2} cy={by + h / 2} r={22 + (1 - fire) * 18} fill="none" stroke={ACCENT} strokeWidth={1.4} opacity={fire} /> : null}
      <rect x={bx + 4} y={by + 4} width={w} height={h} fill={INK} opacity={0.12} />
      <rect x={bx} y={by} width={w} height={h} fill={fire > 0.3 ? ACCENT : "#f7f3ea"} stroke={INK} strokeWidth={1.3} />
      <path d={hatch(bx, by, bx + w, by + h, 4, 45)} stroke={INK} strokeWidth={0.4} opacity={0.35} />
      {vertical ? <path d={`M${x} ${by + h}V${by + h + 14}`} stroke={INK} strokeWidth={1.6} /> : <path d={`M${bx + w} ${y}H${bx + w + 14}`} stroke={INK} strokeWidth={1.6} />}
      <text x={vertical ? x + w / 2 + 10 : bx + w / 2} y={vertical ? by + h / 2 + 5 : by - 9} textAnchor={vertical ? "start" : "middle"} fill={INK} className="exCaption exCaptionLg exNum" opacity={0.8}>
        {label}
      </text>
    </g>
  );
}

export default function QkdPlate() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const holes = useMemo(() => {
    let d = "";
    for (let y = 40; y <= 312; y += 24) for (let x = 36; x <= 930; x += 24) d += `M${x - 1.2} ${y}a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0`;
    return d;
  }, []);
  const laserHatch = useMemo(() => hatch(LASER.x0, Y - 20, LASER.x1, Y + 20, 4, 0), []);
  const groundHatch = useMemo(() => hatch(20, 322, 940, 330, 3, 0), []);

  return (
    <Plate
      loop={LOOP}
      still={12.4}
      label="A laser sends single photons whose polarization is set by a motor-driven polarizer; they cross a fiber, the receiver measures each in a randomly chosen basis, and only bits where both bases match are kept as the shared key. An eavesdropper tapping the fiber shows up as errors in the kept bits."
    >
      {(t) => {
        const fade = 1 - seg(t, LOOP - 0.7, LOOP);
        const eve = seg(t, EVE_ON, EVE_ON + 0.5);

        // which photon is current (latest emitted, or about to be)
        let k = 0;
        for (let i = 0; i < N; i++) if (t >= emit(i) - 0.42) k = i;
        const prevPol = pol(A[(k + N - 1) % N], BIT[(k + N - 1) % N]);
        const txAng = t < emit(0) - 0.42 ? pol(A[0], BIT[0]) : turn(prevPol, pol(A[k], BIT[k]), seg(t, emit(k) - 0.42, emit(k) - 0.1));
        let kr = 0;
        for (let i = 0; i < N; i++) if (t >= emit(i)) kr = i;
        const rxAng = turn(B[(kr + N - 1) % N] * 45, B[kr] * 45, seg(t, emit(kr), emit(kr) + 0.32));

        // the photon in flight
        let photon: { x: number; y: number; ang: number; small: boolean } | null = null;
        let tapHit = 0;
        let fire0 = 0;
        let fire1 = 0;
        let txHot = 0;
        let rxHot = 0;
        for (let i = 0; i < N; i++) {
          const u = t - emit(i);
          if (u >= 0 && u < 0.18) txHot = 1;
          if (u >= 0 && u < FLY) {
            const x = lerp(TX.x, RX.x, u / FLY);
            const tapped = i >= EVE_FROM && x > TAP;
            photon = { x, y: Y, ang: tapped ? EVE_POL[i - EVE_FROM] : pol(A[i], BIT[i]), small: false };
            if (i >= EVE_FROM) {
              const tu = (x - TAP) / 70;
              if (tu > -0.2 && tu < 1) tapHit = 1 - Math.abs(tu - 0.3);
            }
          } else if (u >= FLY && u < FLY + HOP) {
            rxHot = 1;
            const f = (u - FLY) / HOP;
            const ang = B[i] * 45 + (MEAS[i] ? 90 : 0);
            if (MEAS[i] === 0) photon = { x: lerp(RX.x, D0.x - 6, f), y: Y, ang, small: true };
            else photon = f < 0.45 ? { x: lerp(RX.x, PBS, f / 0.45), y: Y, ang, small: true } : { x: PBS, y: lerp(Y, D1.y - 6, (f - 0.45) / 0.55), ang, small: true };
          }
          const da = t - arrive(i);
          if (da >= 0 && da < 0.6) {
            if (MEAS[i] === 0) fire0 = Math.max(fire0, 1 - da / 0.6);
            else fire1 = Math.max(fire1, 1 - da / 0.6);
          }
        }

        const kept = KEPT.filter((q) => sift(q.i) + 0.35 <= t).length;
        const errors = KEPT.filter((q) => q.err && sift(q.i) + 0.35 <= t).length;
        const caught = seg(t, sift(N - 1) + 0.5, sift(N - 1) + 0.9);

        return (
          <g opacity={fade}>
            {/* optical table */}
            <path d={holes} fill={INK} opacity={0.13} />
            <path d={groundHatch} stroke={INK} strokeWidth={0.35} opacity={0.3} />
            <path d="M20 330H940" stroke={INK} strokeWidth={0.8} opacity={0.5} />

            {/* the bench, as it really was */}
            <Print uid={uid} src="/qkd_setup.png" x={742} y={30} w={186} h={128} rot={1.4} />

            {/* laser */}
            <g>
              {[LASER.x0 + 18, LASER.x1 - 18].map((px) => (
                <g key={px}>
                  <path d={`M${px} ${Y + 20}V${Y + 50}`} stroke={INK} strokeWidth={3} />
                  <path d={`M${px - 12} ${Y + 51}H${px + 12}`} stroke={INK} strokeWidth={2} />
                </g>
              ))}
              <rect x={LASER.x0 + 4} y={Y - 16} width={LASER.x1 - LASER.x0} height={40} fill={INK} opacity={0.12} />
              <rect x={LASER.x0} y={Y - 20} width={LASER.x1 - LASER.x0} height={40} fill="#f7f3ea" stroke={INK} strokeWidth={1.5} />
              <path d={laserHatch} stroke={INK} strokeWidth={0.5} opacity={0.45} />
              <rect x={LASER.x1} y={Y - 8} width={12} height={16} fill="#f7f3ea" stroke={INK} strokeWidth={1.2} />
              <path d={`M${LASER.x1 + 12} ${Y}H${TX.x - TX.r - 7}`} stroke={txHot ? ACCENT : INK} strokeWidth={txHot ? 1.6 : 0.6} opacity={txHot ? 1 : 0.4} />
              <Caption x={(LASER.x0 + LASER.x1) / 2} y={Y - 32} color={INK}>laser</Caption>
            </g>

            {/* fiber */}
            <g>
              <path d={`M${TX.x + TX.r + 7} ${Y}H${FIB.x0}M${FIB.x1} ${Y}H${RX.x - RX.r - 7}`} stroke={INK} strokeWidth={0.6} opacity={0.4} />
              <path d={`M${FIB.x0} ${Y - 3}H${FIB.x1}M${FIB.x0} ${Y + 3}H${FIB.x1}`} stroke={INK} strokeWidth={1} />
              <path d={`M${FIB.x0} ${Y}H${FIB.x1}`} stroke={INK} strokeWidth={0.4} strokeDasharray="1 4" opacity={0.6} />
              {[FIB.x0 - 10, FIB.x1].map((cx) => (
                <rect key={cx} x={cx} y={Y - 6} width={10} height={12} fill="#f7f3ea" stroke={INK} strokeWidth={1.1} />
              ))}
              <Caption x={(FIB.x0 + FIB.x1) / 2} y={Y - 26} color={INK}>fiber</Caption>
            </g>

            {/* eavesdropper tap */}
            {eve > 0 ? (
              <g opacity={eve}>
                <path d={`M${TAP - 20} ${Y + 4}Q${TAP} ${Y + 30} ${TAP} ${Y + 44}M${TAP + 20} ${Y + 4}Q${TAP} ${Y + 30} ${TAP} ${Y + 44}`} fill="none" stroke={tapHit > 0 ? ACCENT : INK} strokeWidth={1.2} />
                <rect x={TAP - 26} y={Y + 44} width={52} height={32} fill="#f7f3ea" stroke={tapHit > 0 ? ACCENT : INK} strokeWidth={1.4} />
                <path d={hatch(TAP - 26, Y + 44, TAP + 26, Y + 76, 4, -45)} stroke={INK} strokeWidth={0.4} opacity={0.4} />
                <path d={`M${TAP - 13} ${Y + 60}Q${TAP} ${Y + 50} ${TAP + 13} ${Y + 60}Q${TAP} ${Y + 70} ${TAP - 13} ${Y + 60}Z`} fill="#f7f3ea" stroke={INK} strokeWidth={1.1} />
                <circle cx={TAP} cy={Y + 60} r={3.4} fill={tapHit > 0 ? ACCENT : INK} />
                <Caption x={TAP} y={Y + 96} color={ACCENT} opacity={0.95}>eavesdropper</Caption>
              </g>
            ) : null}

            {/* sender + receiver polarizers on motors */}
            <Wheel x={TX.x} ang={txAng} hot={txHot} />
            <Wheel x={RX.x} ang={rxAng} hot={rxHot} />

            {/* splitter + detectors */}
            <path d={`M${RX.x + RX.r + 7} ${Y}H${D0.x - 6}M${PBS} ${Y}V${D1.y - 6}`} stroke={INK} strokeWidth={0.6} opacity={0.4} />
            <rect x={PBS - 13} y={Y - 13} width={26} height={26} fill="#f7f3ea" stroke={INK} strokeWidth={1.3} />
            <path d={`M${PBS - 13} ${Y - 13}L${PBS + 13} ${Y + 13}`} stroke={INK} strokeWidth={1} />
            <Detector x={D0.x} y={D0.y} fire={fire0} label="0" />
            <Detector x={D1.x} y={D1.y} fire={fire1} label="1" vertical />

            {/* the photon */}
            {photon ? (
              photon.small ? (
                <circle cx={r1(photon.x)} cy={r1(photon.y)} r={4} fill={ACCENT} />
              ) : (
                <g>
                  <path d={`M${r1(Math.max(TX.x + TX.r, photon.x - 60))} ${Y}H${r1(photon.x - 11)}`} stroke={ACCENT} strokeWidth={1.4} strokeDasharray="2 3" opacity={0.8} />
                  <circle cx={r1(photon.x)} cy={Y} r={11} fill="#fbf8f1" stroke={ACCENT} strokeWidth={1.4} />
                  <path d={polBar(photon.x, Y, photon.ang, 18)} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )
            ) : null}

            {/* sifting: bases compared, matches kept */}
            <Caption x={40} y={ROW.sent + 4} color={INK} anchor="start">sent</Caption>
            <Caption x={40} y={ROW.meas + 4} color={INK} anchor="start">measured</Caption>
            <Caption x={40} y={ROW.key + 4} color={ACCENT} anchor="start" opacity={0.95}>shared key</Caption>
            {Array.from({ length: N }, (_, i) => {
              const cx = colX(i);
              const sIn = seg(t, emit(i), emit(i) + 0.2);
              const mIn = seg(t, arrive(i), arrive(i) + 0.2);
              const sf = seg(t, sift(i), sift(i) + 0.3);
              const match = A[i] === B[i];
              const op = match ? 1 : 1 - sf * 0.72;
              const bad = match && MEAS[i] !== BIT[i] && sf > 0;
              return (
                <g key={i}>
                  {sIn > 0 ? (
                    <g opacity={sIn * op}>
                      <Basis x={cx - 7} y={ROW.sent} b={A[i]} color={INK} />
                      <text x={cx + 7} y={ROW.sent + 5} textAnchor="middle" fill={INK} className="exCaption exCaptionLg exNum">{BIT[i]}</text>
                    </g>
                  ) : null}
                  {mIn > 0 ? (
                    <g opacity={mIn * op}>
                      <Basis x={cx - 7} y={ROW.meas} b={B[i]} color={INK} />
                      <text x={cx + 7} y={ROW.meas + 5} textAnchor="middle" fill={bad ? ACCENT : INK} className="exCaption exCaptionLg exNum">{MEAS[i]}</text>
                    </g>
                  ) : null}
                  {sf > 0 && !match ? <path d={`M${cx - 13} ${ROW.meas + 10}L${r1(cx - 13 + 26 * sf)} ${r1(ROW.meas + 10 - (ROW.meas - ROW.sent + 22) * sf)}`} stroke={INK} strokeWidth={1} opacity={0.6} /> : null}
                  {sf > 0 && match ? <path d={`M${cx - 7} ${ROW.sent + 11}V${r1(lerp(ROW.sent + 11, ROW.meas - 11, sf))}`} stroke={ACCENT} strokeWidth={1.3} /> : null}
                  {bad ? <circle cx={cx + 7} cy={ROW.meas - 1} r={8.5} fill="none" stroke={ACCENT} strokeWidth={1.2} opacity={sf} /> : null}
                </g>
              );
            })}
            {KEPT.map((q) => {
              const d = ease(seg(t, sift(q.i), sift(q.i) + 0.35));
              if (d <= 0) return null;
              const x = lerp(colX(q.i) + 7, slotX(q.slot), d);
              const y = lerp(ROW.meas + 5, ROW.key + 5, d);
              const done = d >= 1;
              return (
                <g key={q.i}>
                  {q.err && done ? <circle cx={slotX(q.slot)} cy={ROW.key} r={11.5} fill="none" stroke={ACCENT} strokeWidth={1.4} /> : null}
                  <text x={r1(x)} y={r1(y)} textAnchor="middle" fill={q.err && done ? INK : ACCENT} className="exCaption exCaptionLg exNum">{MEAS[q.i]}</text>
                </g>
              );
            })}
            <path d={`M${slotX(0) - 12} ${ROW.key + 14}H${r1(slotX(Math.max(0, kept - 1)) + 12)}`} stroke={ACCENT} strokeWidth={1.2} opacity={kept ? 0.9 : 0} />
            {caught > 0 ? (
              <Caption x={920} y={ROW.key + 4} color={ACCENT} anchor="end" opacity={caught}>
                eavesdropper detected
              </Caption>
            ) : null}

            <text x={40} y={60} fill={INK} className="exCaption" opacity={0.75}>
              key bits <tspan className="exNum">{String(kept).padStart(2, "0")}</tspan>
            </text>
            {eve > 0 ? (
              <text x={40} y={80} fill={errors ? ACCENT : INK} className="exCaption" opacity={(errors ? 1 : 0.6) * eve}>
                errors <tspan className="exNum">{errors}</tspan>
              </text>
            ) : null}
          </g>
        );
      }}
    </Plate>
  );
}

function Print({ uid, src, x, y, w, h, rot }: { uid: string; src: string; x: number; y: number; w: number; h: number; rot: number }) {
  const id = `${uid}-qkd-pr`;
  const m = 7;
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <defs>
        <clipPath id={id}>
          <rect x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m} />
        </clipPath>
      </defs>
      <rect x={x + 4} y={y + 5} width={w} height={h} fill={INK} opacity={0.14} />
      <rect x={x} y={y} width={w} height={h} fill="#fbf8f1" stroke={INK} strokeWidth={1} />
      <image href={src} x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      <rect x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m} fill="none" stroke={INK} strokeWidth={0.6} />
    </g>
  );
}
