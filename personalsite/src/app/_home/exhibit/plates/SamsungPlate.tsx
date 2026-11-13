"use client";

// Samsung Research America, both pieces of work in one slot: Aurora (the agent
// runtime) first, then the on-device signal router. Each gets one full turn.
import { Fragment, useEffect, useState } from "react";
import AuroraPlate from "./AuroraPlate";
import RouterPlate from "./RouterPlate";

/** Seconds each half is shown. The stage gives this slot twice its usual dwell. */
export const SAMSUNG_HALF_S = 12;

export default function SamsungPlate() {
  const [half, setHalf] = useState<0 | 1>(0);
  useEffect(() => {
    const id = window.setInterval(() => setHalf((h) => (h === 0 ? 1 : 0)), SAMSUNG_HALF_S * 1000);
    return () => window.clearInterval(id);
  }, []);
  return <Fragment key={half}>{half === 0 ? <AuroraPlate /> : <RouterPlate />}</Fragment>;
}
