"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Artifact } from "@/app/components/ChatArtifact";

// Kinetic-thread system. Hovering a citation chip in the chat reply causes
// the artifact panel to smoothly scroll the matching card into view and
// brighten it (which expands its quote inline). The "connection" between the
// two panels is interaction-only: no SVG line, just synchronized motion.
//
// The provider exposes registerCard so each artifact card can advertise its
// element under its id. A small hover-enter debounce prevents whip-scrolling
// when the cursor passes through a row of chips, and a hover-leave delay
// keeps the activation alive briefly so brief excursions don't collapse it.

type Ctx = {
  activeId: string | null;
  setActive: React.Dispatch<React.SetStateAction<string | null>>;
  registerCard: (id: string, el: HTMLElement | null) => void;
  getCard: (id: string) => HTMLElement | null;
};

const ChatThreadCtx = createContext<Ctx | null>(null);

export function useChatThread(): Ctx | null {
  return useContext(ChatThreadCtx);
}

export function ChatThreadProvider({ children }: { children: ReactNode }) {
  const [activeId, setActive] = useState<string | null>(null);
  const cards = useRef<Map<string, HTMLElement>>(new Map());

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cards.current.set(id, el);
    else cards.current.delete(id);
  }, []);

  const getCard = useCallback((id: string) => cards.current.get(id) ?? null, []);

  return (
    <ChatThreadCtx.Provider value={{ activeId, setActive, registerCard, getCard }}>
      {children}
    </ChatThreadCtx.Provider>
  );
}

// Helper for chip labels.
export function artifactLabel(a: Artifact): string {
  if (a.kind === "work") return a.data.company;
  return a.data.title;
}

const ENTER_DELAY_MS = 110;
const LEAVE_DELAY_MS = 200;
// Fallback in case `scrollend` doesn't fire (older browsers, edge cases).
// Hard upper bound on how long we'll wait between scroll start and wing
// reveal before giving up and opening anyway.
const SCROLL_FALLBACK_MS = 800;

// Walk up to find the nearest scrollable ancestor.
function getScrollParent(el: HTMLElement): HTMLElement {
  let p: HTMLElement | null = el.parentElement;
  while (p) {
    const cs = getComputedStyle(p);
    if (/auto|scroll|overlay/.test(cs.overflowY)) return p;
    p = p.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

// True if at least half the card is already visible inside its scroll
// container — in which case scrollIntoView would either be a no-op or a
// trivial nudge, and we should open the wing immediately.
function alreadyVisible(card: HTMLElement, scroller: HTMLElement): boolean {
  const c = card.getBoundingClientRect();
  const r = scroller.getBoundingClientRect();
  const top = Math.max(c.top, r.top);
  const bottom = Math.min(c.bottom, r.bottom);
  const visible = Math.max(0, bottom - top);
  return c.height > 0 && visible / c.height >= 0.5;
}

// Citation chip rendered inside the assistant message. Hovering scrolls the
// matching card into view in the artifact panel and, after the scroll
// settles, activates it (which brightens the border and unfolds the wing
// with the quote).
//
// Each chip owns three timers: enter (debounce on hover-in), open (delay
// between scroll start and wing reveal), and leave (debounce on hover-out).
// The leave handler uses a functional setActive so it only clears activation
// if THIS chip is still the active one — otherwise rapid hover across chips
// would let one chip's leave timer cancel another's activation.
export function CitationChip({ id, label }: { id: string; label: string }) {
  const ctx = useChatThread();
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the cleanup for an in-flight "wait for scrollend" subscription.
  // Set when a scroll begins, cleared (by the cleanup itself) when the
  // wing opens or another activation supersedes.
  const pendingScroll = useRef<(() => void) | null>(null);

  const cancelPendingScroll = () => {
    if (pendingScroll.current) {
      pendingScroll.current();
      pendingScroll.current = null;
    }
  };

  const clearTimers = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = null;
    leaveTimer.current = null;
    cancelPendingScroll();
  };

  useEffect(() => () => clearTimers(), []);

  const beginActivate = () => {
    if (!ctx) return;
    cancelPendingScroll();
    const card = ctx.getCard(id);
    if (!card) {
      ctx.setActive(id);
      return;
    }
    const scroller = getScrollParent(card);
    if (alreadyVisible(card, scroller)) {
      // Card is already in view — open the wing instantly, no scroll.
      ctx.setActive(id);
      return;
    }
    // Card is off-screen: scroll it in, then open the wing the moment the
    // smooth scroll settles. `scrollend` is the right signal here; the
    // timeout is just a safety net for browsers/edge cases that don't fire it.
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    const ac = new AbortController();
    const fire = () => {
      cancelPendingScroll();
      ctx.setActive(id);
    };
    scroller.addEventListener("scrollend", fire, { signal: ac.signal });
    const fallback = setTimeout(fire, SCROLL_FALLBACK_MS);
    pendingScroll.current = () => {
      ac.abort();
      clearTimeout(fallback);
    };
  };

  const onEnter = () => {
    if (!ctx) return;
    // Cancel any pending leave from this chip — we're back.
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (enterTimer.current) clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(beginActivate, ENTER_DELAY_MS);
  };

  const onLeave = () => {
    if (!ctx) return;
    // Abort scheduled activation if hover never crossed the threshold.
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    // Abort any in-flight scroll subscription so the wing doesn't pop
    // open after the user has already moved off this chip.
    cancelPendingScroll();
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      // Only clear if WE'RE still the active one. Prevents a stale leave
      // timer from a previously hovered chip from killing the activation
      // a sibling chip just won.
      ctx.setActive((prev) => (prev === id ? null : prev));
    }, LEAVE_DELAY_MS);
  };

  // Click pins activation immediately and bypasses the hover debounce.
  const onClick = () => {
    clearTimers();
    beginActivate();
  };

  const isActive = ctx?.activeId === id;

  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      className={`group/cite inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
        isActive
          ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      }`}
    >
      <span
        className={`h-[5px] w-[5px] rounded-full transition-colors ${
          isActive
            ? "bg-[var(--color-accent)]"
            : "bg-[var(--color-hairline-strong)] group-hover/cite:bg-[var(--color-accent)]"
        }`}
      />
      {label}
    </button>
  );
}
