"use client";

// PARM: an agent works through a task. Partway through, a tool result carries a
// cue (the same mark as one stored memory). With the cue present the agent
// reaches up for that one memory before it acts. Flip the cue off and the same
// run leaves every memory alone.
import { useMemo, useState } from "react";
import Plate from "../Plate";
import { ACCENT, INK, ease, hatch, lerp, roundRectPath, seg } from "../engrave";
import { Caption, Glyph, type GlyphName } from "../glyphs";
import styles from "../exhibit.module.css";

const LOOP = 10.5;
const MEM: GlyphName[] = ["heart", "calendar", "music", "chat", "pin", "step", "mail"];
const TARGET = 4;
const CARD = { y: 70, w: 92, h: 64, x0: 102, step: 112 };
const TRACK_Y = 420;
const STEPS = [120, 290, 450, 650, 830];
const RESULT = { x: 362, y: 214, w: 176, h: 128 };

function cardX(i: number) {
  return CARD.x0 + i * CARD.step;
}

function agentX(t: number) {
  // stop-and-go along the steps
  const legs: [number, number, number, number][] = [
    [0.6, 1.4, STEPS[0], STEPS[1]],
    [1.6, 2.4, STEPS[1], STEPS[2]],
    [5.0, 5.8, STEPS[2], STEPS[3]],
    [6.5, 7.3, STEPS[3], STEPS[4]],
  ];
  let x = STEPS[0];
  for (const [a, b, from, to] of legs) {
    if (t >= a) x = lerp(from, to, ease(seg(t, a, b)));
  }
  return x;
}

function MemoryCard({ x, y, glyph, lit, lift = 0 }: { x: number; y: number; glyph: GlyphName; lit: number; lift?: number }) {
  const c = lit > 0.5 ? ACCENT : INK;
  return (
    <g transform={`translate(${x} ${y - lift})`}>
      <rect x={3} y={3 + lift * 0.4} width={CARD.w} height={CARD.h} fill={INK} opacity={0.08 + lift * 0.01} />
      <rect width={CARD.w} height={CARD.h} fill="#f7f3ea" stroke={c} strokeWidth={1 + lit * 0.8} />
      <Glyph name={glyph} x={22} y={CARD.h / 2} s={0.95} color={c} width={1.3} />
      <path d={`M42 ${CARD.h / 2 - 9}H78M42 ${CARD.h / 2}H72M42 ${CARD.h / 2 + 9}H62`} stroke={INK} strokeWidth={0.8} opacity={0.5} />
    </g>
  );
}

export default function ParmPlate() {
  const [cue, setCue] = useState(true);
  const trackHatch = useMemo(() => hatch(40, TRACK_Y + 30, 920, TRACK_Y + 60, 5, -45), []);

  const extra = (
    <div className={styles.toggle} role="group" aria-label="Cue in the tool result">
      <span className={styles.controlNote}>cue</span>
      <button type="button" aria-pressed={cue} className={cue ? styles.toggleOn : styles.toggleOff} onClick={() => setCue(true)}>
        on
      </button>
      <button type="button" aria-pressed={!cue} className={!cue ? styles.toggleOn : styles.toggleOff} onClick={() => setCue(false)}>
        off
      </button>
    </div>
  );

  return (
    <Plate
      loop={LOOP}
      still={7.9}
      resetKey={cue}
      resetTo={2.2}
      extra={extra}
      label="An agent steps through a task; a tool result carries a cue matching one memory, and the agent recalls that memory before acting. With the cue off it recalls nothing."
    >
      {(t) => {
        const fade = 1 - seg(t, 9.8, 10.4);
        const ax = agentX(t);
        const resultOpen = ease(seg(t, 2.4, 3.0));
        const cueLit = cue ? seg(t, 3.6, 4.0) : 0;
        const thread = cue ? ease(seg(t, 4.0, 4.7)) : 0;
        const lift = cue ? ease(seg(t, 4.6, 5.0)) * 10 : 0;
        const carry = cue ? ease(seg(t, 5.2, 6.3)) : 0;
        const acted = seg(t, 7.3, 7.7);
        const readout = seg(t, 7.6, 8.0);

        // thread endpoints
        const cueY = RESULT.y + 30 + 2 * 20;
        const tx0 = RESULT.x + RESULT.w - 26;
        const tx1 = cardX(TARGET) + CARD.w / 2;
        const ty1 = CARD.y + CARD.h;
        const threadPts: string[] = [];
        for (let j = 0; j <= 30; j++) {
          const k = (thread * j) / 30;
          const x = lerp(tx0, tx1, k);
          const y = lerp(cueY, ty1, k) - Math.sin(k * Math.PI) * 34;
          threadPts.push(`${j ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
        }

        // carried memory: from the shelf down to the agent (which is moving to step 3)
        const cx = lerp(cardX(TARGET) + CARD.w / 2, ax, carry);
        const cy = lerp(CARD.y + CARD.h / 2 - lift, TRACK_Y - 46, carry);

        return (
          <g opacity={fade}>
            {/* shelf */}
            <path d={`M70 ${CARD.y + CARD.h + 16}H890`} stroke={INK} strokeWidth={1} opacity={0.55} />
            <path d={`M70 ${CARD.y + CARD.h + 20}H890`} stroke={INK} strokeWidth={0.4} opacity={0.4} />
            <Caption x={70} y={CARD.y - 16} color={INK} anchor="start">memories</Caption>
            {MEM.map((g, i) => (
              <MemoryCard key={i} x={cardX(i)} y={CARD.y} glyph={g} lit={i === TARGET ? (cue ? seg(t, 4.6, 4.9) : 0) : 0} lift={i === TARGET ? lift : 0} />
            ))}

            {/* track */}
            <path d={trackHatch} stroke={INK} strokeWidth={0.35} opacity={0.16} />
            <path d={`M${STEPS[0]} ${TRACK_Y}H${STEPS[4]}`} stroke={INK} strokeWidth={0.8} opacity={0.4} strokeDasharray="3 4" />
            <path d={`M${STEPS[0]} ${TRACK_Y}H${ax.toFixed(1)}`} stroke={INK} strokeWidth={1.8} />
            {STEPS.map((x, i) => {
              const done = ax >= x - 1;
              const isAct = i === 4;
              return (
                <g key={i}>
                  <circle cx={x} cy={TRACK_Y} r={isAct ? 17 : 9} fill="#f7f3ea" stroke={INK} strokeWidth={done ? 1.5 : 0.9} />
                  {i === 1 ? <path d={`M${x - 4} ${TRACK_Y}h8M${x + 1} ${TRACK_Y - 3}l3 3-3 3`} stroke={INK} strokeWidth={1} fill="none" /> : null}
                </g>
              );
            })}
            <Caption x={STEPS[1]} y={TRACK_Y + 34} color={INK}>tool call</Caption>
            <Caption x={STEPS[2]} y={TRACK_Y + 34} color={INK}>tool result</Caption>
            <Caption x={STEPS[4]} y={TRACK_Y + 42} color={INK}>act</Caption>

            {/* tool result card, unfolding from step 2 */}
            {resultOpen > 0 ? (
              <g transform={`translate(0 ${((1 - resultOpen) * 60).toFixed(1)})`} opacity={resultOpen}>
                <path d={`M${STEPS[2]} ${TRACK_Y - 10}V${RESULT.y + RESULT.h}`} stroke={INK} strokeWidth={0.8} />
                <rect x={RESULT.x + 4} y={RESULT.y + 4} width={RESULT.w} height={RESULT.h} fill={INK} opacity={0.08} />
                <rect x={RESULT.x} y={RESULT.y} width={RESULT.w} height={RESULT.h} fill="#f7f3ea" stroke={INK} strokeWidth={1.2} />
                <rect x={RESULT.x} y={RESULT.y} width={RESULT.w} height={16} fill={INK} opacity={0.85} />
                {[0, 1, 2, 3, 4].map((li) => {
                  const show = seg(t, 3.0 + li * 0.1, 3.2 + li * 0.1);
                  const y = RESULT.y + 30 + li * 20;
                  const isCue = li === 2 && cue;
                  return (
                    <g key={li} opacity={show}>
                      <path d={`M${RESULT.x + 14} ${y}H${RESULT.x + (isCue ? 108 : li % 2 ? 128 : 150)}`} stroke={isCue && cueLit > 0.5 ? ACCENT : INK} strokeWidth={isCue && cueLit > 0.5 ? 1.6 : 0.9} opacity={isCue ? 1 : 0.55} />
                      {isCue ? (
                        <>
                          <Glyph name={MEM[TARGET]} x={RESULT.x + RESULT.w - 26} y={y} s={0.62} color={cueLit > 0.5 ? ACCENT : INK} width={1.4} />
                          {cueLit > 0 ? <circle cx={RESULT.x + RESULT.w - 26} cy={y} r={12 + (1 - cueLit) * 10} fill="none" stroke={ACCENT} strokeWidth={1} opacity={cueLit} /> : null}
                        </>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            ) : null}

            {/* thread from the cue up to the one memory it makes relevant */}
            {thread > 0 ? <path d={threadPts.join("")} fill="none" stroke={ACCENT} strokeWidth={1.2} strokeDasharray="3 3" /> : null}

            {/* carried memory */}
            {carry > 0 ? (
              <g opacity={1 - seg(t, 9.0, 9.6)}>
                <g transform={`translate(${(cx - 24).toFixed(1)} ${(cy - 16).toFixed(1)}) scale(0.52)`}>
                  <rect width={CARD.w} height={CARD.h} fill="#f7f3ea" stroke={ACCENT} strokeWidth={2.6} />
                  <Glyph name={MEM[TARGET]} x={22} y={CARD.h / 2} s={1} color={ACCENT} width={2.2} />
                  <path d={`M42 ${CARD.h / 2 - 9}H78M42 ${CARD.h / 2}H72M42 ${CARD.h / 2 + 9}H62`} stroke={INK} strokeWidth={1.4} opacity={0.5} />
                </g>
              </g>
            ) : null}

            {/* agent: the nib */}
            <g transform={`translate(${ax.toFixed(1)} ${TRACK_Y})`}>
              <path d="M0 -15 L8 0 L0 13 L-8 0 Z" fill={INK} />
              <circle cx="0" cy="-3" r="2" fill="#f7f3ea" />
            </g>

            {/* act: stamped */}
            {acted > 0 ? (
              <g opacity={acted}>
                <circle cx={STEPS[4]} cy={TRACK_Y} r={17 + (1 - acted) * 12} fill="none" stroke={cue ? ACCENT : INK} strokeWidth={2} />
                <path d={`M${STEPS[4] - 7} ${TRACK_Y}l5 5 10-11`} fill="none" stroke={cue ? ACCENT : INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : null}

            {/* readout */}
            <g opacity={readout}>
              <path d={roundRectPath(650, 236, 260, 46, 2)} fill="none" stroke={cue ? ACCENT : INK} strokeWidth={0.9} />
              <text x={780} y={265} textAnchor="middle" fill={cue ? ACCENT : INK} className="exCaption exCaptionLg">
                {cue ? "recalled before acting" : "no cue · stayed silent"}
              </text>
            </g>
          </g>
        );
      }}
    </Plate>
  );
}
