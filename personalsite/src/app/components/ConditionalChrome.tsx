"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/app/components/navbar";
import { ChatModeProvider, useChatMode } from "@/app/components/ChatModeContext";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { inChat } = useChatMode();
  const isHome = pathname === "/";
  // Hide the global navbar on the unscrolled home: the hero rail carries
  // section nav, and showing both creates a duplicated navigation system on
  // a page whose only job is to surface the chat input.
  const hideNavbar = isHome && !inChat;
  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={isHome ? "" : "min-h-screen"}>{children}</main>
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
