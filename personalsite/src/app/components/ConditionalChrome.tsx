"use client";

import Achievements from "./Achievements";

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Achievements />
      {children}
    </>
  );
}
