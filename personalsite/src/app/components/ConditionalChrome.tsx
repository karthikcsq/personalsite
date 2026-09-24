"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/app/components/navbar";
import { ChatModeProvider } from "@/app/components/ChatModeContext";
import { InteriorBotanicalFrame } from "@/app/components/BotanicalDetails";
import InteriorEclipse from "@/app/components/InteriorEclipse";
import Achievements from "@/app/components/Achievements";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isA2uiDraft = pathname === "/a2ui-draft";
  const isLivingCorpusDraft = pathname === "/living-corpus-draft";
  const isMinimalInterior = pathname === "/about" || pathname === "/gallery";
  const isImmersive = isHome || isA2uiDraft || isLivingCorpusDraft || isMinimalInterior;
  const showAchievements = isHome || isLivingCorpusDraft || isMinimalInterior;
  // Hide the global navbar on the unscrolled home: the hero rail carries
  // section nav, and showing both creates a duplicated navigation system on
  // a page whose only job is to surface the chat input.
  const hideNavbar = isImmersive;
  return (
    <>
      {!hideNavbar && <Navbar />}
      <InteriorEclipse immersive={isImmersive} pathname={pathname ?? ""} />
      {showAchievements ? <Achievements /> : null}
      <main className={isImmersive ? "" : "relative isolate min-h-screen overflow-hidden"}>
        {!isImmersive && <InteriorBotanicalFrame />}
        <div className={isImmersive ? "" : "relative z-10"}>{children}</div>
      </main>
    </>
  );
}

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  return (
    <ChatModeProvider>
      <ChromeInner>{children}</ChromeInner>
    </ChatModeProvider>
  );
}
