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
  // Per-activation quote override. The receipts panel dedupes artifacts by id
  // (newest sighting wins), so the panel card's stored annotation is the
  // most-recent turn's quote. When a citation chip from an OLDER turn
  // activates a card, we stash that turn's quote here so the wing reveals the
  // quote tied to the chat response that was actually clicked. Null means
  // "use the card's own annotation prop" (current default).
  activeAnnotation: string | null;
  setActiveAnnotation: React.Dispatch<React.SetStateAction<string | null>>;
  registerCard: (id: string, el: HTMLElement | null) => void;
  getCard: (id: string) => HTMLElement | null;
  // Mobile uses citation pills as the primary entry to a card. Tapping a pill
  // pushes the matching artifact into `overlay`, which the bottom-sheet
  // component renders. Desktop never sets this; the threading flow takes over.
  overlay: Artifact | null;
  setOverlay: (a: Artifact | null) => void;
};

const ChatThreadCtx = createContext<Ctx | null>(null);

export function useChatThread(): Ctx | null {
  return useContext(ChatThreadCtx);
}

export function ChatThreadProvider({ children }: { children: ReactNode }) {
  const [activeId, setActive] = useState<string | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Artifact | null>(null);
  const cards = useRef<Map<string, HTMLElement>>(new Map());

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cards.current.set(id, el);
    else cards.current.delete(id);
  }, []);

  const getCard = useCallback((id: string) => cards.current.get(id) ?? null, []);

  return (
    <ChatThreadCtx.Provider
      value={{
        activeId,
        setActive,
        activeAnnotation,
        setActiveAnnotation,
        registerCard,
        getCard,
        overlay,
        setOverlay,
      }}
    >
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

// Compute the scrollTop value that would put the card's vertical center on
// the scroller's vertical center. Clamped to the scroller's valid range so
// we don't try to scroll past the ends.
function targetScrollTopForCenter(card: HTMLElement, scroller: HTMLElement): number {
  const c = card.getBoundingClientRect();
  const r = scroller.getBoundingClientRect();
  const cardCenterInScroller = c.top - r.top + scroller.scrollTop + c.height / 2;
  const desired = cardCenterInScroller - scroller.clientHeight / 2;
  const max = scroller.scrollHeight - scroller.clientHeight;
  return Math.max(0, Math.min(max, desired));
}

// Citation chip rendered inside the assistant message. On desktop, hover
// scrolls the matching card into view in the artifact panel and, after the
// scroll settles, activates it (brightening the border and unfolding the
// wing with the quote). On mobile (`< lg`), there is no side panel — tapping
// the chip pushes the artifact into the bottom-sheet overlay instead.
//
// Each chip owns three timers: enter (debounce on hover-in), open (delay
// between scroll start and wing reveal), and leave (debounce on hover-out).
// The leave handler uses a functional setActive so it only clears activation
// if THIS chip is still the active one — otherwise rapid hover across chips
// would let one chip's leave timer cancel another's activation.
export function CitationChip({ artifact }: { artifact: Artifact }) {
  const id = artifact.id;
  const label = artifactLabel(artifact);
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
    // Capture this turn's annotation so the wing reveals the quote tied to
    // the chat response that actually owns this chip — not the most-recent
    // annotation that happens to live on the deduped panel artifact.
    const turnAnnotation = artifact.annotation ?? null;
    const card = ctx.getCard(id);
    if (!card) {
      ctx.setActive(id);
      ctx.setActiveAnnotation(turnAnnotation);
      return;
    }
    const scroller = getScrollParent(card);
    // Always center the card vertically in the panel, even if it's already
    // partially visible. `scrollIntoView({block: "center"})` no-ops in some
    // browsers when the card sits anywhere in the central band, so compute
    // the target scrollTop ourselves and animate the panel to it.
    const target = targetScrollTopForCenter(card, scroller);
    if (Math.abs(target - scroller.scrollTop) < 2) {
      // Already centered (within a pixel). Skip the scroll, open the wing.
      ctx.setActive(id);
      ctx.setActiveAnnotation(turnAnnotation);
      return;
    }
    scroller.scrollTo({ top: target, behavior: "smooth" });
    const ac = new AbortController();
    const fire = () => {
      cancelPendingScroll();
      ctx.setActive(id);
      ctx.setActiveAnnotation(turnAnnotation);
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
      // a sibling chip just won. Annotation override clears in lockstep so
      // we don't leave a stale quote behind for the next activation.
      ctx.setActive((prev) => {
        if (prev === id) {
          ctx.setActiveAnnotation(null);
          return null;
        }
        return prev;
      });
    }, LEAVE_DELAY_MS);
  };

  // Click pins activation immediately and bypasses the hover debounce.
  // On mobile (< lg), there is no side panel — open the artifact overlay
  // instead so tapping a pill is the primary way to read the receipt.
  const onClick = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      ctx?.setOverlay(artifact);
      return;
    }
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
      title={label}
      className={`group/cite inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors lg:min-h-0 lg:px-2.5 lg:py-[3px] lg:text-[10.5px] ${
        isActive
          ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      }`}
    >
      <span
        className={`h-[5px] w-[5px] flex-none rounded-full transition-colors ${
          isActive
            ? "bg-[var(--color-accent)]"
            : "bg-[var(--color-ink-subtle)] group-hover/cite:bg-[var(--color-accent)]"
        }`}
      />
      {label}
    </button>
  );
}
