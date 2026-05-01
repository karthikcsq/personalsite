"use client";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  MessageSquarePlus,
  Pencil,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { ChatArtifact, type Artifact } from "@/app/components/ChatArtifact";
import { ChatThreadProvider, CitationChip } from "@/app/components/ChatThread";
import { ArtifactOverlay } from "@/app/components/ArtifactOverlay";
import { useChatMode } from "@/app/components/ChatModeContext";

// Error markers stored in assistant content. Tag with a variant so the
// renderer can show class-appropriate copy (network vs. generic 5xx).
type ErrorVariant = "network" | "generic";
const ERROR_PREFIX = "__error__";
const errorContent = (v: ErrorVariant) => `${ERROR_PREFIX}:${v}`;
const parseErrorContent = (content: string): ErrorVariant | null => {
  if (!content.startsWith(ERROR_PREFIX)) return null;
  const tail = content.slice(ERROR_PREFIX.length);
  if (tail === "") return "generic";
  if (tail.startsWith(":")) {
    const v = tail.slice(1);
    if (v === "network" || v === "generic") return v;
  }
  return "generic";
};

interface Message {
  role: "user" | "assistant";
  content: string;
  artifacts?: Artifact[];
}

// Bank of suggested questions that rotate through the UI. The pre-chat hero
// shows 3 at a time (one per category, see pickChips below) and the in-chat
// rail shows 3 — both draw from this bank. Each entry is tagged with one or
// more categories so the rotation drifts toward a visitor's interest as they
// click chips. Keep entries short (≤ ~50 chars) and conversational (third
// person, no em dashes).
type Category = "work" | "opinions" | "life";
type Question = { text: string; tags: readonly Category[] };

const QUESTION_BANK: readonly Question[] = [
  // Work — what he's built, where he's worked, what he's researching.
  { text: "What is Karthik building right now?", tags: ["work"] },
  { text: "Where has he worked?", tags: ["work"] },
  { text: "Show me his research.", tags: ["work"] },
  { text: "Tell me about Repple.", tags: ["work"] },
  { text: "What is google-tools-mcp?", tags: ["work"] },
  { text: "Which hackathons has he won?", tags: ["work"] },
  { text: "Tell me about buildpurdue.", tags: ["work"] },
  { text: "What did he do at Peraton Labs?", tags: ["work"] },
  { text: "What's Veritas?", tags: ["work"] },
  { text: "What's Caladrius?", tags: ["work"] },
  { text: "What did he build at the Naval Research Lab?", tags: ["work"] },
  { text: "Has he done quantum computing research?", tags: ["work"] },
  { text: "What tools does he use to build?", tags: ["work"] },
  { text: "Show me his favorite project.", tags: ["work", "opinions"] },

  // Opinions — takes, philosophy, why-he-thinks-what-he-thinks.
  { text: "What's his take on MCP?", tags: ["opinions"] },
  { text: "What does he write about?", tags: ["opinions"] },
  { text: "What's his view on the future of AI work?", tags: ["opinions"] },
  { text: "Does he think AGI is close?", tags: ["opinions"] },
  { text: "What AI company would he start?", tags: ["opinions"] },
  { text: "What makes a great engineer in his view?", tags: ["opinions"] },
  { text: "What does he think about quantum computing?", tags: ["opinions"] },
  { text: "Why did he co-found buildpurdue?", tags: ["opinions", "work"] },
  { text: "What does he do at buildpurdue?", tags: ["opinions", "work"] },
  { text: "Why can't agents book a restaurant yet?", tags: ["opinions"] },

  // Life — story, background, what he's like outside the resume.
  { text: "How did he get into AI?", tags: ["life"] },
  { text: "Where did he grow up?", tags: ["life"] },
  { text: "Tell me about his time at TJHSST.", tags: ["life"] },
  { text: "What's he studying at Purdue?", tags: ["life"] },
  { text: "Tell me something surprising about him.", tags: ["life"] },
  { text: "Does he play any instruments?", tags: ["life"] },
  { text: "Show me his photography.", tags: ["life"] },
  { text: "What does he do outside of code?", tags: ["life"] },
  { text: "Where is he based?", tags: ["life"] },
];

const CATEGORIES: readonly Category[] = ["work", "opinions", "life"];

function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Allocate `count` slots across categories using max-min fair share by weight.
// Each iteration picks the category with the highest weight/(slots+1) ratio,
// which keeps minority categories visible until weights really diverge.
function allocateSlots(
  count: number,
  weights: Record<Category, number>,
  capacity: Record<Category, number>,
): Record<Category, number> {
  const slots: Record<Category, number> = { work: 0, opinions: 0, life: 0 };
  for (let i = 0; i < count; i++) {
    let best: Category | null = null;
    let bestScore = -Infinity;
    for (const c of CATEGORIES) {
      if (slots[c] >= capacity[c]) continue;
      const score = weights[c] / (slots[c] + 1);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) break;
    slots[best]++;
  }
  return slots;
}

function linkifyUrls(text: string): string {
  return text.replace(
    /(?<!\]\()(?<!\()(https?:\/\/[^\s)<>]+)/g,
    (url) => `[${url}](${url})`,
  );
}

// Repair markdown links that arrived split across line breaks. CommonMark
// requires `[text](url)` with no whitespace between `]` and `(`, so the LLM
// (or a soft-wrap upstream) emitting `[text]\n(url)` would render as plain
// text. Three passes:
//   1. Collapse any whitespace+newlines between `]` and `(` into nothing.
//   2. Replace newlines INSIDE the link text `[ ... ]` with a single space,
//      so a wrapped label still parses as one link.
//   3. URL-encode any whitespace inside the URL portion of `[text](url)`.
//      CommonMark's bare-form link destination forbids spaces, so a model
//      emitting `[Quantum Racer](.../projects#Quantum Racer)` would render
//      as plain text. Encoding the space lets it parse as a real link
//      without changing where it points.
function repairMarkdownLinks(text: string): string {
  return text
    .replace(/\]\s*\n+\s*\(/g, "](")
    .replace(/\[([^\]\n]*?)\n+([^\]]*?)\]/g, (_m, a, b) => `[${a} ${b}]`)
    .replace(/\]\(([^)]*?)\)/g, (_m, url) => `](${url.replace(/\s+/g, "%20")})`);
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [queueNavIndex, setQueueNavIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState("");
  // Per-category queues, frozen for the session so order stays stable as the
  // user chats. The shuffle uses Math.random() and can't run during SSR (it
  // would mismatch the client render), so we start with the deterministic bank
  // order and shuffle once on mount via useEffect below. We pull from these in
  // `pickChips` according to category weights, which drift as the user clicks
  // chips.
  const [rotatedByCategory, setRotatedByCategory] = useState<Record<Category, Question[]>>(() => {
    const buckets: Record<Category, Question[]> = { work: [], opinions: [], life: [] };
    for (const q of QUESTION_BANK) for (const t of q.tags) buckets[t].push(q);
    return buckets;
  });
  useEffect(() => {
    setRotatedByCategory((prev) => {
      const next: Record<Category, Question[]> = { work: [], opinions: [], life: [] };
      for (const c of CATEGORIES) next[c] = shuffled(prev[c]);
      return next;
    });
  }, []);
  const [chipCursor, setChipCursor] = useState(0);
  // Category weights start equal so the first hero shows a balanced mix
  // (~2 work + 1 opinions + 1 life). Each chip click bumps its tags, so
  // subsequent rotations drift toward whatever the visitor seems curious about.
  const [categoryWeights, setCategoryWeights] = useState<Record<Category, number>>({
    work: 1,
    opinions: 1,
    life: 1,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isProcessingRef = useRef(false);
  const messagesRef = useRef(messages);
  const abortRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesInnerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [resetSnapshot, setResetSnapshot] = useState<{
    messages: Message[];
    queue: string[];
    weights: Record<Category, number>;
    cursor: number;
  } | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Track whether the user is parked near the bottom of the scroll viewport.
  // Auto-scroll only fires when they are; otherwise the jump-to-latest pill
  // reveals so they can opt back in. Threshold chosen so a single line of
  // overshoot still counts as "at bottom."
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsAtBottom(distance < 80);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
    // Re-attach when the in-chat layout mounts (messages.length first becomes >0).
  }, [messages.length === 0]);

  // Keep a ref of isAtBottom so the ResizeObserver below sees the latest
  // value without re-subscribing on every state flip.
  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  // User turns smooth-scroll once when the new bubble lands. Streaming and
  // the rAF tail drain are followed by a ResizeObserver below, since the
  // bubble's content reveals itself outside React's render cycle.
  const lastMessageRole = messages[messages.length - 1]?.role;
  useEffect(() => {
    if (!isAtBottom) return;
    if (lastMessageRole !== "user") return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isAtBottom, lastMessageRole]);

  // Follow the assistant bubble as it grows. The bubble paces its own reveal
  // via requestAnimationFrame, so the messages container's height changes
  // independently of `messages` state. ResizeObserver catches every growth
  // step and snaps the viewport to the bottom while the user is parked there.
  // Tiny per-frame deltas read as smooth motion without a CSS animation.
  useEffect(() => {
    const inner = messagesInnerRef.current;
    if (!inner) return;
    const ro = new ResizeObserver(() => {
      if (!isAtBottomRef.current) return;
      chatEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [messages.length === 0]);

  // When the stream fully ends, settle with one smooth scroll so any final
  // overshoot from the rAF follow resolves gracefully.
  useEffect(() => {
    if (isProcessing) return;
    if (!isAtBottomRef.current) return;
    if (lastMessageRole !== "assistant") return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isProcessing, lastMessageRole]);

  const jumpToLatest = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const processMessage = useCallback(
    async (messageText: string, options?: { skipUserAppend?: boolean }) => {
    setIsProcessing(true);
    const skipUserAppend = options?.skipUserAppend === true;
    const userMessage: Message = { role: "user", content: messageText };
    if (!skipUserAppend) {
      setMessages((prev) => [...prev, userMessage]);
    }
    const baseLength = skipUserAppend
      ? messagesRef.current.length
      : messagesRef.current.length + 1;
    const assistantIndex = baseLength;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Abort any in-flight request and start a fresh controller for this turn.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const baseMessages = skipUserAppend
        ? messagesRef.current
        : [...messagesRef.current, userMessage];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, messages: baseMessages }),
        signal: controller.signal,
      });
      if (response.status === 429) {
        let msg = "You're sending messages too quickly. Try again in a minute.";
        try {
          const data = await response.json();
          if (data?.error) msg = data.error;
        } catch {
          // keep default
        }
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIndex] = { role: "assistant", content: msg };
          return next;
        });
        return;
      }
      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.artifacts) {
              setMessages((prev) => {
                const next = [...prev];
                const current = next[assistantIndex].artifacts ?? [];
                const existingIds = new Set(current.map((a) => a.id));
                const additions = (parsed.artifacts as Artifact[]).filter(
                  (a) => !existingIds.has(a.id),
                );
                if (additions.length === 0) return prev;
                next[assistantIndex] = {
                  ...next[assistantIndex],
                  artifacts: [...current, ...additions],
                };
                return next;
              });
            } else if (parsed.content) {
              accumulated += parsed.content;
              setMessages((prev) => {
                const next = [...prev];
                next[assistantIndex] = {
                  ...next[assistantIndex],
                  content: accumulated,
                };
                return next;
              });
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err) {
      // User-initiated stop: keep whatever streamed in (no error toast).
      if ((err as Error)?.name === "AbortError") {
        return;
      }
      // `fetch` raises TypeError on connection failure (offline, DNS, CORS
      // rejection). Everything else falls through to the generic 5xx copy.
      const e = err as Error | undefined;
      const isNetwork =
        e?.name === "TypeError" || /failed to fetch/i.test(e?.message ?? "");
      const variant: ErrorVariant = isNetwork ? "network" : "generic";
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = {
          role: "assistant",
          content: errorContent(variant),
        };
        return next;
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsProcessing(false);
    }
  },
  [],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
  }, []);

  const regenerateLast = useCallback(() => {
    const msgs = messagesRef.current;
    // Walk back to the last user turn; drop everything after it.
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;
    const userText = msgs[lastUserIdx].content;
    const truncated = msgs.slice(0, lastUserIdx + 1);
    setMessages(truncated);
    messagesRef.current = truncated;
    processMessage(userText, { skipUserAppend: true });
  }, [processMessage]);

  const editUserMessage = useCallback((index: number) => {
    const msgs = messagesRef.current;
    const target = msgs[index];
    if (!target || target.role !== "user") return;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
    const truncated = msgs.slice(0, index);
    setMessages(truncated);
    messagesRef.current = truncated;
    setInput(target.content);
    setQueueNavIndex(-1);
    setSavedInput("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  useEffect(() => {
    if (!isProcessing && queue.length > 0 && queueNavIndex === -1) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      processMessage(next);
    }
  }, [isProcessing, queue, queueNavIndex, processMessage]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (queueNavIndex >= 0) {
      setQueue((prev) => {
        const updated = [...prev];
        updated[queueNavIndex] = trimmed;
        return updated;
      });
      setQueueNavIndex(-1);
      setSavedInput("");
      setInput("");
      inputRef.current?.focus();
      return;
    }
    if (isProcessingRef.current) {
      setQueue((prev) => [...prev, trimmed]);
      setInput("");
      setChipCursor((prev) => prev + 4);
      inputRef.current?.focus();
      return;
    }
    processMessage(trimmed);
    setInput("");
    setChipCursor((prev) => prev + 4);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
      return;
    }
    if (queue.length === 0) return;

    if (e.key === "ArrowUp" && !e.shiftKey) {
      e.preventDefault();
      if (queueNavIndex === -1) {
        setSavedInput(input);
        const newIndex = queue.length - 1;
        setQueueNavIndex(newIndex);
        setInput(queue[newIndex]);
      } else if (queueNavIndex > 0) {
        setQueue((prev) => {
          const updated = [...prev];
          updated[queueNavIndex] = input;
          return updated;
        });
        const newIndex = queueNavIndex - 1;
        setQueueNavIndex(newIndex);
        setInput(queue[newIndex]);
      }
    } else if (e.key === "ArrowDown" && !e.shiftKey) {
      e.preventDefault();
      if (queueNavIndex === -1) return;
      setQueue((prev) => {
        const updated = [...prev];
        updated[queueNavIndex] = input;
        return updated;
      });
      if (queueNavIndex < queue.length - 1) {
        const newIndex = queueNavIndex + 1;
        setQueueNavIndex(newIndex);
        setInput(queue[newIndex]);
      } else {
        setQueueNavIndex(-1);
        setInput(savedInput);
        setSavedInput("");
      }
    } else if (e.key === "Escape" && queueNavIndex >= 0) {
      e.preventDefault();
      setQueue((prev) => {
        const updated = [...prev];
        updated[queueNavIndex] = input;
        return updated;
      });
      setQueueNavIndex(-1);
      setInput(savedInput);
      setSavedInput("");
    }
  };

  const startEditQueue = (index: number) => {
    if (queueNavIndex === index) return;
    if (queueNavIndex === -1) {
      setSavedInput(input);
      setInput(queue[index]);
    } else {
      setQueue((prev) => {
        const updated = [...prev];
        updated[queueNavIndex] = input;
        return updated;
      });
      setInput(queue[index]);
    }
    setQueueNavIndex(index);
    inputRef.current?.focus();
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (queueNavIndex >= 0) {
      if (index === queueNavIndex) {
        setQueueNavIndex(-1);
        setInput(savedInput);
        setSavedInput("");
      } else if (index < queueNavIndex) {
        setQueueNavIndex((prev) => prev - 1);
      }
    }
  };

  const resetChat = () => {
    if (messagesRef.current.length === 0) return;
    // Snapshot for the undo affordance. Aborting any in-flight stream first
    // so the snapshot reflects what the user actually saw.
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
    setResetSnapshot({
      messages: messagesRef.current,
      queue,
      weights: categoryWeights,
      cursor: chipCursor,
    });
    setMessages([]);
    setQueue([]);
    setQueueNavIndex(-1);
    setInput("");
    setSavedInput("");
    setChipCursor(0);
    setCategoryWeights({ work: 1, opinions: 1, life: 1 });
  };

  const undoReset = () => {
    if (!resetSnapshot) return;
    setMessages(resetSnapshot.messages);
    setQueue(resetSnapshot.queue);
    setCategoryWeights(resetSnapshot.weights);
    setChipCursor(resetSnapshot.cursor);
    setResetSnapshot(null);
  };

  // Auto-dismiss the undo toast after 6s.
  useEffect(() => {
    if (!resetSnapshot) return;
    const t = setTimeout(() => setResetSnapshot(null), 6000);
    return () => clearTimeout(t);
  }, [resetSnapshot]);

  const inChat = messages.length > 0;
  // Publish chat mode so ConditionalChrome can hide the global navbar on the
  // unscrolled home (item 9 in chat-ux-deferred).
  const { setInChat } = useChatMode();
  useEffect(() => {
    setInChat(inChat);
  }, [inChat, setInChat]);
  // Walk assistant turns newest-first and collect artifacts, deduplicating
  // across turns by artifact.id so the same card never appears twice in the
  // receipts panel. First (newest) sighting wins its spot.
  const allArtifacts: Artifact[] = (() => {
    const seen = new Set<string>();
    const out: Artifact[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant" || !m.artifacts) continue;
      for (const a of m.artifacts) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        out.push(a);
      }
    }
    return out;
  })();

  // Surface suggested-question chips that rotate per turn, skipping anything
  // the user already asked (or queued) in this session.
  const askedSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of messages) if (m.role === "user") s.add(m.content.trim());
    for (const q of queue) s.add(q.trim());
    return s;
  }, [messages, queue]);

  const pickChips = (count: number): string[] => {
    // Available chips per category, in stable shuffled order, minus anything
    // already asked or queued this session.
    const available: Record<Category, Question[]> = { work: [], opinions: [], life: [] };
    for (const c of CATEGORIES) {
      available[c] = rotatedByCategory[c].filter((q) => !askedSet.has(q.text));
    }

    // Allocate slots across categories by weight (max-min fair). The cursor
    // rotates which chip we pull from each category's queue per turn. With
    // the default equal weights {1,1,1} and count=3 this produces exactly
    // one chip per category — that's the hero's "one from each area" promise.
    // As the visitor clicks chips, the matching category's weight grows and
    // future rotations skew toward whatever they keep asking about.
    const capacity: Record<Category, number> = {
      work: available.work.length,
      opinions: available.opinions.length,
      life: available.life.length,
    };
    const slots = allocateSlots(count, categoryWeights, capacity);

    const out: string[] = [];
    const used = new Set<string>();
    for (const c of CATEGORIES) {
      const queue = available[c];
      if (queue.length === 0) continue;
      let picked = 0;
      for (let i = 0; i < queue.length && picked < slots[c]; i++) {
        const q = queue[(chipCursor + i) % queue.length];
        if (used.has(q.text)) continue;
        out.push(q.text);
        used.add(q.text);
        picked++;
      }
    }
    return out;
  };

  // Click-handler for chip buttons. Looks up the chip's tags in the bank and
  // bumps each one's weight, so the next rotation leans toward the visitor's
  // demonstrated interest. Typed (non-chip) questions don't bump weights.
  const submitChip = (text: string) => {
    const entry = QUESTION_BANK.find((q) => q.text === text);
    if (entry) {
      setCategoryWeights((prev) => {
        const next = { ...prev };
        for (const t of entry.tags) next[t] = next[t] + 1;
        return next;
      });
    }
    submit(text);
  };

  const heroChips = pickChips(3);
  const inChatChips = pickChips(3);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      {/* PRE-CHAT HERO */}
      {!inChat && (
        <section className="mx-auto flex w-full max-w-[680px] flex-col px-7 pt-12 pb-16 md:min-h-screen md:justify-center md:px-6 md:pt-0 md:pb-8">
          <div className="rise" style={{ animationDelay: "80ms" }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
              Portfolio · conversational
            </p>
            <h1 className="mt-5 text-[clamp(2.5rem,6.5vw,4.25rem)] font-medium leading-[0.96] tracking-[-0.02em] text-[var(--color-ink)]">
              Karthik Thyagarajan.
            </h1>
            <p className="mt-6 max-w-[560px] font-serif text-[clamp(1.1rem,2vw,1.4rem)] italic leading-snug text-[var(--color-ink-muted)]">
              Founder, engineer, and student, happiest with a hard problem.
            </p>
          </div>

          <div className="rise mt-3" style={{ animationDelay: "200ms" }}>
            <form onSubmit={handleSubmit} className="relative">
              <div
                className={`flex items-end gap-2 rounded-[14px] border bg-[var(--color-surface-raised)] px-4 py-3 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[var(--shadow-lift)] ${
                  queueNavIndex >= 0
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-hairline)]"
                }`}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    queueNavIndex >= 0
                      ? "Editing queued message…"
                      : "Ask anything about Karthik"
                  }
                  className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="group/btn flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-surface)] transition-all hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>

            {heroChips.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {heroChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => submitChip(chip)}
                    className="group rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-3.5 py-1.5 text-[13px] text-[var(--color-ink-muted)] transition-all hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav
            className="rise mt-12 grid grid-cols-3 gap-x-5 gap-y-3 text-xs text-[var(--color-ink-subtle)] sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 md:mt-16"
            style={{ animationDelay: "360ms" }}
            aria-label="Sections"
          >
            {[
              { href: "/work", label: "Work" },
              { href: "/projects", label: "Projects" },
              { href: "/involvement", label: "Involvement" },
              { href: "/blog", label: "Writing" },
              { href: "/gallery", label: "Photography" },
              { href: "/about", label: "About" },
            ].map((item, i, arr) => (
              <span
                key={item.href}
                className="inline-flex items-center gap-x-5"
              >
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[var(--color-ink)]"
                >
                  {item.label}
                </Link>
                {i < arr.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden h-3 w-px bg-[var(--color-hairline)] sm:inline-block"
                  />
                )}
              </span>
            ))}
          </nav>

          <div
            className="rise mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-ink-subtle)]"
            style={{ animationDelay: "440ms" }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Connect
            </span>
            {[
              { label: "LinkedIn", href: "https://www.linkedin.com/in/karthikthyagarajan06" },
              { label: "GitHub", href: "https://github.com/karthikcsq" },
              { label: "Email", href: "mailto:karthik6002@gmail.com" },
              { label: "Resume", href: "/resume.pdf" },
            ].map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group inline-flex items-baseline gap-1 transition-colors hover:text-[var(--color-ink)]"
              >
                <span>{c.label}</span>
                <span className="text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-accent)]">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* IN-CHAT SPLIT */}
      {inChat && (
        <ChatThreadProvider>
        <ArtifactOverlay />
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          {/* Chat column */}
          <div className="relative flex h-[calc(100dvh-68px)] flex-col">
            {/* Top blur band: messages scrolling up pass behind a soft blur
                instead of fading to the surface color. The band itself fades
                out at its bottom edge so the transition is gradual. */}
            <div
              aria-hidden="true"
              className="chat-blur-top pointer-events-none absolute inset-x-0 top-0 z-10 h-10"
            />
            <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto pt-8 pb-6 quiet-scroll">
              <div ref={messagesInnerRef} className="mx-auto max-w-[620px] space-y-8 pr-1">
                {messages.map((msg, i) => {
                  const isLastAssistant =
                    msg.role === "assistant" && i === messages.length - 1;
                  return (
                    <div key={i} className="rise">
                      {msg.role === "user" ? (
                        <UserBubble
                          content={msg.content}
                          onEdit={() => editUserMessage(i)}
                        />
                      ) : (
                        <AssistantBubble
                          content={msg.content}
                          artifacts={msg.artifacts}
                          isStreaming={isLastAssistant && isProcessing}
                          onRegenerate={
                            isLastAssistant && !isProcessing
                              ? regenerateLast
                              : undefined
                          }
                        />
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} className="h-px" />
              </div>
            </div>


            {/* Rail block: queue + Try chips. Always reserves a min-height so
                the input doesn't slide up/down as queue or chip rows appear
                and disappear. */}
            <div className="relative mx-auto w-full max-w-[620px]" style={{ minHeight: 72 }}>
              {/* Jump-to-latest: 32px arrow circle anchored to the top edge
                  of the rail block, so it floats just above the Try chips
                  (and just below the scroll viewport's bottom edge). */}
              {!isAtBottom && messages.length > 0 && (
                <button
                  type="button"
                  onClick={jumpToLatest}
                  aria-label="Jump to latest"
                  title="Jump to latest"
                  className="absolute -top-11 left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] shadow-[var(--shadow-soft)] transition-colors hover:text-[var(--color-ink)]"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}

              {/* Queue strip */}
              {queue.length > 0 && (
                <div className="flex w-full flex-wrap items-center gap-1.5 pb-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-subtle)]">
                    Queued
                  </span>
                  {queue.map((item, index) => (
                    <div
                      key={index}
                      className={`group flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                        queueNavIndex === index
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-accent-hover)]"
                          : "border-[var(--color-hairline)] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => startEditQueue(index)}
                        className="max-w-[160px] truncate text-left hover:text-[var(--color-ink)]"
                        aria-label="Edit queued message"
                      >
                        {item}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(index);
                        }}
                        className="text-[var(--color-ink-subtle)] opacity-0 transition-opacity hover:text-[var(--color-ink)] group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <span className="ml-1 font-mono text-[10px] text-[var(--color-ink-faint)]">
                    ↑↓ to edit
                  </span>
                </div>
              )}

              {/* Try chips share a row with the new-conversation icon so the
                  bottom of the wrapped chip stack aligns with the icon's Y.
                  When chips wrap to multiple lines, items-end keeps the icon
                  pinned to the bottom-right corner of that row. */}
              <div className="flex w-full items-end gap-2 pb-1">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {inChatChips.length > 0 && (
                    <>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-subtle)]">
                        Try
                      </span>
                      {inChatChips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => submitChip(chip)}
                          className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-3 py-1 text-[12px] text-[var(--color-ink-muted)] transition-all hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                        >
                          {chip}
                        </button>
                      ))}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={resetChat}
                  aria-label="New conversation"
                  title="New conversation"
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-accent)]"
                >
                  <MessageSquarePlus className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Input (docked) */}
            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[620px] pb-8">
              <div
                className={`flex items-end gap-2 rounded-[14px] border bg-[var(--color-surface-raised)] px-4 py-3 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[var(--shadow-lift)] ${
                  queueNavIndex >= 0
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-hairline)]"
                }`}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    queueNavIndex >= 0 ? "Editing queued message…" : "Ask a follow-up"
                  }
                  className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
                />
                {isProcessing ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    aria-label="Stop generating"
                    title="Stop generating"
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-surface)] transition-all hover:bg-[var(--color-accent-hover)]"
                  >
                    <Square className="h-3 w-3" fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-surface)] transition-all hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Undo toast: surfaces after a New-conversation reset. */}
            {resetSnapshot && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[120px] z-30 flex justify-center">
                <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-4 py-2 shadow-[var(--shadow-lift)]">
                  <span className="text-[13px] text-[var(--color-ink-muted)]">
                    Conversation cleared.
                  </span>
                  <button
                    type="button"
                    onClick={undoReset}
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetSnapshot(null)}
                    aria-label="Dismiss"
                    className="text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Artifact panel (desktop only; mobile uses pill → overlay) */}
          <aside className="hidden h-[calc(100dvh-68px)] overflow-y-auto border-l border-[var(--color-hairline)] pl-12 pr-2 pt-8 pb-8 quiet-scroll lg:block">
            {allArtifacts.length === 0 ? (
              <ArtifactEmpty />
            ) : (
              <div>
                {allArtifacts.map((art, i) => (
                  <ChatArtifact key={art.id + "-" + i} artifact={art} index={i} />
                ))}
              </div>
            )}
          </aside>
        </div>
        </ChatThreadProvider>
      )}
    </div>
  );
}

function UserBubble({
  content,
  onEdit,
}: {
  content: string;
  onEdit?: () => void;
}) {
  return (
    <div className="group flex items-start justify-end gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit and resend"
          title="Edit and resend"
          className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full text-[var(--color-ink-faint)] opacity-0 transition-all hover:text-[var(--color-accent)] group-hover:opacity-100 focus:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
      <div className="max-w-[85%] rounded-[14px] rounded-tr-[4px] bg-[var(--color-ink)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--color-surface)]">
        {content}
      </div>
    </div>
  );
}

type AssistantBubbleProps = {
  content: string;
  artifacts?: Artifact[];
  isStreaming?: boolean;
  onRegenerate?: () => void;
};

// Cap on words revealed per animation frame. With 60fps this gives a
// max throughput of ~60 atoms/sec, which is faster than typical LLM
// emission (50–100 tokens/sec ≈ 25–50 words/sec) so the rAF naturally
// pauses when the buffer is empty. Bursts of cached content drain at
// most this fast, smoothing them into a paced reveal.
const MAX_ATOMS_PER_FRAME = 1;

// Minimum wall-clock gap between atom reveals. rAF alone hands us up
// to 60 atoms/sec, which causes burst chunks (cached content, fast
// network emission) to drain in a visible run of pop-ins. Pinning the
// cadence at ~22ms (~45 atoms/sec) spaces words evenly across the
// stream so the bubble reads as paced speech rather than chunked
// arrival. When streaming ends with buffer remaining, the rAF logic
// snaps to the final target, so this throttle never causes a
// perceptible lag at end-of-message.
const MIN_ATOM_INTERVAL_MS = 30;

// Furthest index we can safely reveal without showing a partial markdown
// link. Without this, `[text](url` would render as plain text mid-stream and
// then "snap back" into a link once `)` arrived, which reads as a glitch.
// We hold at the opening `[` of any in-flight link until its closing `)`
// has been received. Plain bracketed text without a following `(` is treated
// as not-a-link and skipped.
function markdownSafeIndex(target: string): number {
  let i = 0;
  while (i < target.length) {
    const open = target.indexOf("[", i);
    if (open === -1) return target.length;
    const close = target.indexOf("]", open + 1);
    if (close === -1) return open;
    if (target[close + 1] !== "(") {
      i = close + 1;
      continue;
    }
    const endParen = target.indexOf(")", close + 2);
    if (endParen === -1) return open;
    i = endParen + 1;
  }
  return target.length;
}

// Word-aware reveal. Returns the index of the next atom boundary at or
// after `from`, capped at `mdSafe`. An "atom" is one of:
//   • a whitespace-bounded word ("hello ", "world.\n")
//   • a complete markdown link (`[text](url)`) revealed as a unit since
//     partial markdown renders as plain text and then "snaps" into a
//     styled link, which is the flicker we're avoiding.
// Returns `from` when no complete atom is available yet (mid-word at the
// trailing edge of the buffer). Whitespace runs that span an atom's tail
// are absorbed so the next call starts cleanly on a non-whitespace char.
function nextAtomBoundary(target: string, from: number, mdSafe: number): number {
  if (from >= mdSafe) return from;
  let i = from;
  while (i < mdSafe && /\s/.test(target[i])) i++;
  let consumed = false;
  while (i < mdSafe) {
    const ch = target[i];
    if (/\s/.test(ch)) break;
    if (ch === "[") {
      const cb = target.indexOf("]", i + 1);
      if (cb !== -1 && cb < mdSafe && target[cb + 1] === "(") {
        const cp = target.indexOf(")", cb + 2);
        if (cp !== -1 && cp < mdSafe) {
          i = cp + 1;
          consumed = true;
          continue;
        }
      }
      break;
    }
    consumed = true;
    i++;
  }
  if (!consumed) return from;
  while (i < mdSafe && /\s/.test(target[i])) i++;
  return i;
}

function AssistantBubbleInner({
  content,
  artifacts,
  isStreaming = false,
  onRegenerate,
}: AssistantBubbleProps) {
  const errorVariant = parseErrorContent(content);
  const isError = errorVariant !== null;
  const showCitations = !isError && content !== "" && artifacts && artifacts.length > 0;
  const showActions = !isStreaming && !isError && content.length > 0;

  // Decouple displayed content from received content. Network chunks land in
  // `content` (the target); a rAF loop advances `displayed` toward it at a
  // steady pace, so the answer reads as smooth speech instead of bursty token
  // clumps. When `prefers-reduced-motion: reduce` is set, the loop is skipped
  // and content is rendered directly.
  const [displayed, setDisplayed] = useState(content);
  const targetRef = useRef(content);
  const displayedRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const lastAtomAtRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    targetRef.current = content;

    const snap = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      displayedRef.current = content;
      setDisplayed(content);
    };

    // Regenerate / new turn shrinks content. Don't try to rewind through rAF.
    if (content.length < displayedRef.current.length) {
      snap();
      return;
    }
    if (content === displayedRef.current) return;
    if (reduceMotionRef.current) {
      snap();
      return;
    }

    // Word-aware reveal. Each frame, advance `displayed` to the next atom
    // boundary (whole word, or whole markdown link). Partial words at the
    // trailing edge stay invisible until whitespace lands, so each token
    // mounts with its final text and fades in once instead of morphing.
    // When the stream ends, drain any remaining buffer to the final target
    // (the last word may have no trailing whitespace).
    if (rafRef.current != null) return;
    const tick = () => {
      const target = targetRef.current;
      const shown = displayedRef.current;
      const streaming = isStreamingRef.current;

      if (!streaming && shown.length < target.length) {
        displayedRef.current = target;
        setDisplayed(target);
        rafRef.current = null;
        return;
      }

      // Hold the cadence steady. If we revealed an atom less than
      // MIN_ATOM_INTERVAL_MS ago, ride this frame and try again next.
      const now = performance.now();
      if (now - lastAtomAtRef.current < MIN_ATOM_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const mdSafe = markdownSafeIndex(target);
      let cursor = shown.length;
      for (let i = 0; i < MAX_ATOMS_PER_FRAME; i++) {
        const next = nextAtomBoundary(target, cursor, mdSafe);
        if (next <= cursor) break;
        cursor = next;
      }

      if (cursor === shown.length) {
        // No complete atom available yet (mid-word, mid-link, or fully
        // drained). Keep ticking while content is still arriving; stop
        // once everything that can be revealed has been.
        if (!streaming && shown.length >= target.length) {
          rafRef.current = null;
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const next = target.slice(0, cursor);
      displayedRef.current = next;
      setDisplayed(next);
      lastAtomAtRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [content]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const renderedContent = isError ? "" : displayed;

  // Memoize markdown components with empty deps. ReactMarkdown reconciles
  // by component identity — passing fresh inline functions each render
  // makes it tear down and rebuild the whole tree. Stable identity lets
  // React reconcile text content in place as the streamed buffer grows.
  const markdownComponents = useMemo(
    () => ({
      a: (props: ComponentPropsWithoutRef<"a">) => (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent)] underline decoration-1 underline-offset-[3px] transition-colors hover:text-[var(--color-accent-hover)]"
        />
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: ({ inline, ...props }: any) =>
        inline ? (
          <code
            {...props}
            className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--color-ink)]"
          />
        ) : (
          <code
            {...props}
            className="block overflow-x-auto rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] p-4 font-mono text-[13px] text-[var(--color-ink)]"
          />
        ),
      p: (props: ComponentPropsWithoutRef<"p">) => (
        <p {...props} className="my-2 first:mt-0 last:mb-0 text-[var(--color-ink)]" />
      ),
      ul: (props: ComponentPropsWithoutRef<"ul">) => (
        <ul {...props} className="my-2 first:mt-0 last:mb-0 list-disc space-y-1 pl-5 marker:text-[var(--color-ink)]" />
      ),
      ol: (props: ComponentPropsWithoutRef<"ol">) => (
        <ol {...props} className="my-2 first:mt-0 last:mb-0 list-decimal space-y-1 pl-5 marker:text-[var(--color-ink)]" />
      ),
    }),
    [],
  );

  return (
    <div className="group/asst flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-[6px] h-[6px] w-[6px] flex-none rounded-full bg-[var(--color-accent)]" />
        <div className="-mt-[4px] min-w-0 flex-1">
          {content === "" ? (
            <TypingIndicator />
          ) : isError ? (
            <ErrorRetry variant={errorVariant} onRetry={onRegenerate} />
          ) : (
            <div className="max-w-none text-[15px] leading-[1.7]">
              <ReactMarkdown components={markdownComponents}>
                {linkifyUrls(repairMarkdownLinks(renderedContent))}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Citation chips row. On desktop, hovering threads to the matching
          card in the aside; on mobile, tapping pushes the card into the
          bottom-sheet overlay (handled inside CitationChip). */}
      {showCitations && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 pl-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
            Pulled from
          </span>
          {artifacts!.map((art) => (
            <CitationChip key={art.id} artifact={art} />
          ))}
          <span
            aria-hidden="true"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)] lg:hidden"
          >
            Tap to read
          </span>
        </div>
      )}

      {/* Action row: copy + (last-turn-only) regenerate. Hover-revealed,
          stays on screen if focused for keyboard users. */}
      {showActions && (
        <div className="flex items-center gap-1 pl-5 opacity-0 transition-opacity duration-150 group-hover/asst:opacity-100 focus-within:opacity-100">
          <CopyMessageButton content={content} />
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              aria-label="Regenerate response"
              title="Regenerate"
              className="flex h-7 items-center gap-1.5 rounded-full px-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-accent)]"
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function artifactsEqual(a?: Artifact[], b?: Artifact[]): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === (b?.length ?? 0);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].id !== b[i].id) return false;
  return true;
}

// Memoize so non-active assistant turns skip re-rendering on every parent
// state update (chip cursor, queue churn, streaming chunks landing in a
// different bubble). The active bubble still re-renders as `content` grows,
// but its markdown parse is debounced inside the component.
const AssistantBubble = memo(AssistantBubbleInner, (prev, next) => {
  return (
    prev.content === next.content &&
    prev.isStreaming === next.isStreaming &&
    prev.onRegenerate === next.onRegenerate &&
    artifactsEqual(prev.artifacts, next.artifacts)
  );
});

function TypingIndicator() {
  return (
    <span className="relative inline-block font-serif italic text-[15px] leading-[1.7] text-[var(--color-ink-muted)]">
      Thinking
      <span className="pointer-events-none absolute bottom-[3px] left-0 right-0 h-[2px] overflow-hidden">
        <span className="underline-scrub block h-full w-[40%] bg-[var(--color-accent)]" />
      </span>
    </span>
  );
}

function ArtifactEmpty() {
  return (
    <div className="flex h-full flex-col justify-center text-center">
      <p className="font-serif text-[17px] italic leading-snug text-[var(--color-ink-muted)]">
        Whatever Karthik&apos;s chat pulls up, it lands here.
      </p>
      <p className="mt-2 text-[13px] text-[var(--color-ink-faint)]">
        Work entries, projects, and writing, materialized as you ask.
      </p>
    </div>
  );
}

// Hairline-separated placeholder rows shown while the first turn is fetching.
// Two rows is enough to suggest "things are coming" without committing to a
// specific count — real artifacts replace the skeleton as they stream in.
function ArtifactSkeleton() {
  return (
    <div>
      <ArtifactSkeletonRow />
      <ArtifactSkeletonRow />
    </div>
  );
}

function ArtifactSkeletonRow() {
  return (
    <div
      className="border-t border-[var(--color-hairline)] py-7"
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-hairline-strong)]" />
        <span className="skeleton-shimmer h-[10px] w-16 rounded" />
      </div>
      <div className="skeleton-shimmer h-[18px] w-3/5 rounded" />
      <div className="mt-3 space-y-2">
        <span className="skeleton-shimmer block h-[12px] w-full rounded" />
        <span className="skeleton-shimmer block h-[12px] w-11/12 rounded" />
        <span className="skeleton-shimmer block h-[12px] w-3/4 rounded" />
      </div>
    </div>
  );
}

// Inline error block with a Retry action. The copy varies by error class
// so the user has a hint about whether to retry now (network) or wait
// (server). `onRetry` ties to regenerateLast so the user's last question
// runs again.
const ERROR_COPY: Record<ErrorVariant, string> = {
  network: "Lost the connection.",
  generic: "Something snapped on the way to the answer.",
};
function ErrorRetry({
  onRetry,
  variant = "generic",
}: {
  onRetry?: () => void;
  variant?: ErrorVariant;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-serif italic text-[15px] leading-[1.7] text-[var(--color-ink-muted)]">
        {ERROR_COPY[variant]}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}

// Copy the rendered markdown answer to clipboard. Two-second confirmation
// state via the icon swap. Falls back silently if clipboard API is missing.
function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard access; silently no-op.
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : "Copy answer"}
      title={copied ? "Copied" : "Copy answer"}
      className="flex h-7 items-center gap-1.5 rounded-full px-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-accent)]"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}
