"use client";

import PlayerProvider from "@/app/_home/player/Player";
import BackFade from "@/app/_home/player/BackFade";

// Site-wide chrome. The music player lives here so it keeps playing between
// pages.
export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <BackFade />
      {children}
    </PlayerProvider>
  );
}
