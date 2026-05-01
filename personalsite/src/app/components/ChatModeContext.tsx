"use client";
import { createContext, useContext, useMemo, useState } from "react";

type ChatModeCtx = {
  inChat: boolean;
  setInChat: (v: boolean) => void;
};

const Ctx = createContext<ChatModeCtx>({ inChat: false, setInChat: () => {} });

export function ChatModeProvider({ children }: { children: React.ReactNode }) {
  const [inChat, setInChat] = useState(false);
  const value = useMemo(() => ({ inChat, setInChat }), [inChat]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatMode() {
  return useContext(Ctx);
}
