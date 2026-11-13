"use client";

// Samsung Research America: an on-device signal router.
// A stream of device signals flows into the phone. The on-device model quietly
// drops almost all of them; 4 of every 80 (the 95% suppression in his bullet)
// are routed up across the device/cloud line to the large model.
import { useMemo } from "react";
import Plate from "../Plate";
import { ACCENT, INK, clamp, ease, hatch, quad, rng, roundRectPath, sphereLines } from "../engrave";
import { Caption, Glyph, type GlyphName } from "../glyphs";

const LOOP = 12;
const N = 80;
const DT = LOOP / N;
const ROUTED = new Set([9, 31, 50, 71]); // 4 of 80 → 95% stay on the phone
const TRAVEL = 2.3;
const GLYPHS: GlyphName[] = ["mail", "bell", "pin", "chat", "heart", "calendar", "music", "step"];

const PHONE = { x: 372, y: 150, w: 132, h: 270 };
const CHIP = { x: 438, y: 300 };
const ORB = { x: 772, y: 236, r: 112 };

export default function RouterPlate() {
  const signals = useMemo(() => {
    const rand = rng(21);
    return Array.from({ length: N }, (_, i) => ({
      i,
      y0: 120 + rand() * 330,
      glyph: GLYPHS[Math.floor(rand() * GLYPHS.length)],
      routed: ROUTED.has(i),
      spawn: i * DT,
    }));
  }, []);
  const orbLines = useMemo(() => sphereLines(ORB.x, ORB.y, ORB.r, 6.2), []);
  const screenHatch = useMemo(() => hatch(PHONE.x + 10, PHONE.y + 22, PHONE.x + PHONE.w - 10, PHONE.y + PHONE.h - 22, 7, 45), []);
  const groundHatch = useMemo(() => hatch(20, 470, 940, 520, 5, 0), []);

  return (
    <Plate loop={LOOP} still={8.25} label="A stream of device signals enters a phone; nearly all are filtered on the phone and only a few are routed to a large model.">
      {(t) => {
        let seen = 0;
        let routed = 0;
        let orbHit = 0; // most recent arrival pulse 0..1
        let chipPulse = 0;
        const items = signals.map((s) => {
          const age = (((t - s.spawn) % LOOP) + LOOP) % LOOP;
          // counters restart each loop pass: count arrivals that happened earlier in this pass
          if ((s.spawn + TRAVEL) % LOOP <= t) seen++;
          if (s.routed && (s.spawn + TRAVEL + 1.9) % LOOP <= t) routed++;
          if (age < TRAVEL) {
            const k = ease(age / TRAVEL);
            const [x, y] = quad([-30, s.y0], [250, s.y0], [CHIP.x, CHIP.y], k);
            const fadeIn = clamp(age / 0.4);
            const sc = 1.3 - k * 0.6;
            return <Glyph key={s.i} name={s.glyph} x={x} y={y} s={sc} color={INK} width={1.3} opacity={fadeIn * (k > 0.86 ? 1 - (k - 0.86) / 0.14 : 1) * 0.86} />;
          }
          const after = age - TRAVEL;
          if (!s.routed) {
            if (after < 0.45) chipPulse = Math.max(chipPulse, 1 - after / 0.45);
            if (after < 1.1) {
              // dropped on-device: it sinks to the bottom of the phone and fades out
              const k = after / 1.1;
              const y = CHIP.y + 30 + k * 76;
              const x = CHIP.x + ((s.i * 37) % 60) - 30;
              return <circle key={s.i} cx={x} cy={y} r={2.4} fill={INK} opacity={0.5 * (1 - k)} />;
            }
            return null;
          }
          // routed: accent, held for a beat, then carried up to the large model
          if (after < 0.5) {
            chipPulse = 1;
            return (
              <g key={s.i}>
                <circle cx={CHIP.x} cy={CHIP.y} r={14 + after * 30} fill="none" stroke={ACCENT} strokeWidth={1.2} opacity={1 - after * 1.6} />
                <Glyph name={s.glyph} x={CHIP.x} y={CHIP.y} s={0.6 + after * 0.8} color={ACCENT} width={1.6} />
              </g>
            );
          }
          if (after < 1.9) {
            const k = ease((after - 0.5) / 1.4);
            const [x, y] = quad([CHIP.x, PHONE.y + 20], [600, 40], [ORB.x - 70, ORB.y - 40], k);
            const trail: string[] = [];
            for (let j = 0; j <= 24; j++) {
              const [tx, ty] = quad([CHIP.x, PHONE.y + 20], [600, 40], [ORB.x - 70, ORB.y - 40], (k * j) / 24);
              trail.push(`${j ? "L" : "M"}${tx.toFixed(1)} ${ty.toFixed(1)}`);
            }
            return (
              <g key={s.i}>
                <path d={trail.join("")} fill="none" stroke={ACCENT} strokeWidth={1.1} strokeDasharray="2 4" />
                <Glyph name={s.glyph} x={x} y={y} s={1.05} color={ACCENT} width={1.7} />
              </g>
            );
          }
          if (after < 3.4) orbHit = Math.max(orbHit, 1 - (after - 1.9) / 1.5);
          return null;
        });

        return (
          <>
            {/* the stream: engraved flow lines converging on the phone */}
            {[130, 180, 230, 280, 330, 380, 430].map((y0) => (
              <path key={y0} d={`M24 ${y0}Q250 ${y0} ${PHONE.x - 2} ${CHIP.y + (y0 - 290) * 0.08}`} fill="none" stroke={INK} strokeWidth={0.5} opacity={0.22} />
            ))}
            {/* device / cloud boundary */}
            <path d="M600 40 V460" stroke={INK} strokeWidth={0.8} strokeDasharray="1 6" opacity={0.5} />
            <Caption x={584} y={448} color={INK} anchor="end">on device</Caption>
            <Caption x={616} y={448} color={INK} anchor="start">cloud</Caption>

            {/* ground */}
            <path d={groundHatch} stroke={INK} strokeWidth={0.35} opacity={0.18} />
            <path d="M20 470 H940" stroke={INK} strokeWidth={0.8} opacity={0.5} />

            {/* large model: an engraved sphere with an orbit */}
            <g>
              {orbLines.map((l, i) => (
                <path key={i} d={l.d} stroke={INK} strokeWidth={l.w} opacity={0.82} />
              ))}
              <circle cx={ORB.x} cy={ORB.y} r={ORB.r} fill="none" stroke={INK} strokeWidth={1.4} />
              <ellipse cx={ORB.x} cy={ORB.y} rx={ORB.r * 1.38} ry={ORB.r * 0.3} fill="none" stroke={INK} strokeWidth={0.8} opacity={0.55} transform={`rotate(-14 ${ORB.x} ${ORB.y})`} />
              {orbHit > 0 ? (
                <>
                  <circle cx={ORB.x} cy={ORB.y} r={ORB.r + 6 + (1 - orbHit) * 40} fill="none" stroke={ACCENT} strokeWidth={1.6} opacity={orbHit} />
                  <circle cx={ORB.x} cy={ORB.y} r={ORB.r + 2} fill="none" stroke={ACCENT} strokeWidth={2.4} opacity={orbHit} />
                </>
              ) : null}
              <Caption x={ORB.x} y={ORB.y + ORB.r + 62} color={INK}>large model</Caption>
            </g>

            {/* phone */}
            <g>
              <path d={roundRectPath(PHONE.x + 5, PHONE.y + 5, PHONE.w, PHONE.h, 20)} fill={INK} opacity={0.12} />
              <path d={roundRectPath(PHONE.x, PHONE.y, PHONE.w, PHONE.h, 20)} fill="#f6f2e8" stroke={INK} strokeWidth={1.6} />
              <path d={roundRectPath(PHONE.x + 7, PHONE.y + 7, PHONE.w - 14, PHONE.h - 14, 14)} fill="none" stroke={INK} strokeWidth={0.6} opacity={0.6} />
              <path d={screenHatch} stroke={INK} strokeWidth={0.35} opacity={0.22} />
              <rect x={PHONE.x + PHONE.w / 2 - 16} y={PHONE.y + 13} width={32} height={7} rx={3.5} fill={INK} opacity={0.75} />
              {/* on-device model: a chip with pins */}
              <g>
                <rect x={CHIP.x - 22} y={CHIP.y - 22} width={44} height={44} rx={3} fill="#f6f2e8" stroke={INK} strokeWidth={1.3} />
                <rect x={CHIP.x - 13} y={CHIP.y - 13} width={26} height={26} fill="none" stroke={INK} strokeWidth={0.7} />
                {[-14, -7, 0, 7, 14].map((o) => (
                  <path key={o} d={`M${CHIP.x + o} ${CHIP.y - 22}v-6M${CHIP.x + o} ${CHIP.y + 22}v6M${CHIP.x - 22} ${CHIP.y + o}h-6M${CHIP.x + 22} ${CHIP.y + o}h6`} stroke={INK} strokeWidth={1} />
                ))}
                <circle cx={CHIP.x} cy={CHIP.y} r={4 + chipPulse * 3} fill={INK} opacity={0.25 + chipPulse * 0.6} />
              </g>
              <Caption x={PHONE.x + PHONE.w / 2} y={PHONE.y - 14} color={INK}>phone</Caption>
            </g>

            {items}

            {/* tally: derived from the animation itself (2 of 40) */}
            <g className="exTally">
              <text x={40} y={500} fill={INK} className="exCaption" opacity={0.75}>
                signals seen <tspan className="exNum">{String(seen).padStart(2, "0")}</tspan>
              </text>
              <text x={250} y={500} fill={ACCENT} className="exCaption">
                sent to large model <tspan className="exNum">{routed}</tspan>
              </text>
            </g>
          </>
        );
      }}
    </Plate>
  );
}

