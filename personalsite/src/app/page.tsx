"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowUp, X } from "lucide-react";
import { ChatArtifact, type Artifact } from "@/app/components/ChatArtifact";

interface Message {
  role: "user" | "assistant";
  content: string;
  artifacts?: Artifact[];
}

// Bank of suggested questions that rotate through the UI. The pre-chat hero
// shows 4 at a time and the in-chat rail shows 3 — both draw from this bank.
// Each entry is tagged with one or more categories so the rotation can drift
// toward a visitor's interest as they click chips. Keep entries short
// (≤ ~50 chars) and conversational (third person, no em dashes).
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

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [queueNavIndex, setQueueNavIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState("");
  // Per-category shuffled queues, frozen for the session so order stays stable
  // as the user chats. We pull from these in `pickChips` according to category
  // weights, which drift as the user clicks chips.
  const [rotatedByCategory] = useState<Record<Category, Question[]>>(() => {
    const buckets: Record<Category, Question[]> = { work: [], opinions: [], life: [] };
    for (const q of QUESTION_BANK) for (const t of q.tags) buckets[t].push(q);
    for (const c of CATEGORIES) buckets[c] = shuffled(buckets[c]);
    return buckets;
  });
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const processMessage = useCallback(async (messageText: string) => {
    setIsProcessing(true);
    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    const assistantIndex = messagesRef.current.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const updated = [...messagesRef.current, userMessage];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, messages: updated }),
      });
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
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = {
          role: "assistant",
          content: "Something snapped. Try again?",
        };
        return next;
      });
    } finally {
      setIsProcessing(false);
    }
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
    setMessages([]);
    setQueue([]);
    setQueueNavIndex(-1);
    setInput("");
    setSavedInput("");
    setChipCursor(0);
    setCategoryWeights({ work: 1, opinions: 1, life: 1 });
    inputRef.current?.focus();
  };

  const inChat = messages.length > 0;
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
    // rotates which chip we pull from each category's queue per turn.
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

  const heroChips = pickChips(4);
  const inChatChips = pickChips(3);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      {/* Top strip (always present, changes density) */}
      <header
        className={`sticky top-0 z-40 border-b border-transparent bg-[var(--color-surface)]/85 backdrop-blur-sm transition-all ${
          inChat ? "border-[var(--color-hairline)]" : ""
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="group flex items-center gap-2">
            <span className="font-serif text-[20px] italic leading-none text-[var(--color-ink)]">
              karthik
            </span>
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-accent)]" />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {inChat && (
              <button
                onClick={resetChat}
                className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
              >
                New conversation
              </button>
            )}
            <Link
              href="/work"
              className="hidden text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] sm:inline"
            >
              See everything
            </Link>
          </nav>
        </div>
      </header>

      {/* PRE-CHAT HERO */}
      {!inChat && (
        <section className="mx-auto flex min-h-[calc(100vh-68px)] w-full max-w-[680px] flex-col justify-center px-5 pb-24 md:px-6">
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

          <div
            className="rise mt-16 flex items-center gap-5 text-xs text-[var(--color-ink-subtle)]"
            style={{ animationDelay: "360ms" }}
          >
            <Link href="/work" className="transition-colors hover:text-[var(--color-ink)]">
              Work
            </Link>
            <span className="h-3 w-px bg-[var(--color-hairline)]" />
            <Link href="/projects" className="transition-colors hover:text-[var(--color-ink)]">
              Projects
            </Link>
            <span className="h-3 w-px bg-[var(--color-hairline)]" />
            <Link href="/involvement" className="transition-colors hover:text-[var(--color-ink)]">
              Involvement
            </Link>
            <span className="h-3 w-px bg-[var(--color-hairline)]" />
            <Link href="/blog" className="transition-colors hover:text-[var(--color-ink)]">
              Writing
            </Link>
            <span className="h-3 w-px bg-[var(--color-hairline)]" />
            <Link href="/gallery" className="transition-colors hover:text-[var(--color-ink)]">
              Photography
            </Link>
            <span className="h-3 w-px bg-[var(--color-hairline)]" />
            <Link href="/about" className="transition-colors hover:text-[var(--color-ink)]">
              About
            </Link>
          </div>
        </section>
      )}

      {/* IN-CHAT SPLIT */}
      {inChat && (
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          {/* Chat column */}
          <div className="flex h-[calc(100vh-68px)] flex-col">
            <div className="ink-mask-top flex-1 overflow-y-auto pt-8 pb-6 quiet-scroll">
              <div className="mx-auto max-w-[620px] space-y-8 pr-1">
                {messages.map((msg, i) => (
                  <div key={i} className="rise">
                    {msg.role === "user" ? (
                      <UserBubble content={msg.content} />
                    ) : (
                      <AssistantBubble content={msg.content} artifacts={msg.artifacts} />
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} className="h-px" />
              </div>
            </div>

            {/* Queue strip */}
            {queue.length > 0 && (
              <div className="mx-auto flex w-full max-w-[620px] flex-wrap items-center gap-1.5 pb-3">
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
                    <span className="max-w-[160px] truncate">{item}</span>
                    <button
                      onClick={() => removeFromQueue(index)}
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

            {/* Suggested question chips (rotate per turn) */}
            {inChatChips.length > 0 && (
              <div className="mx-auto flex w-full max-w-[620px] flex-wrap items-center gap-1.5 pb-3">
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
              </div>
            )}

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
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-surface)] transition-all hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Artifact panel (desktop only; mobile renders inline) */}
          <aside className="hidden h-[calc(100vh-68px)] overflow-y-auto border-l border-[var(--color-hairline)] pl-12 pr-2 pt-8 pb-8 quiet-scroll lg:block">
            {allArtifacts.length === 0 ? (
              <ArtifactEmpty />
            ) : (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
                  Receipts
                </p>
                {allArtifacts.map((art, i) => (
                  <ChatArtifact key={art.id + "-" + i} artifact={art} index={i} />
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[14px] rounded-tr-[4px] bg-[var(--color-ink)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--color-surface)]">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  artifacts,
}: {
  content: string;
  artifacts?: Artifact[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-[6px] h-[6px] w-[6px] flex-none rounded-full bg-[var(--color-accent)]" />
        <div className="min-w-0 flex-1">
          {content === "" ? (
            <TypingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none text-[15px] leading-[1.7]">
              <ReactMarkdown
                components={{
                  a: (props) => (
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
                  p: (props) => <p {...props} className="my-2 text-[var(--color-ink)]" />,
                  ul: (props) => (
                    <ul {...props} className="my-2 list-disc space-y-1 pl-5 marker:text-[var(--color-ink)]" />
                  ),
                  ol: (props) => (
                    <ol {...props} className="my-2 list-decimal space-y-1 pl-5 marker:text-[var(--color-ink)]" />
                  ),
                }}
              >
                {linkifyUrls(content)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: inline artifacts below the assistant message */}
      {artifacts && artifacts.length > 0 && (
        <div className="lg:hidden mt-1 pl-5">
          {artifacts.map((art, i) => (
            <ChatArtifact key={art.id + "-m-" + i} artifact={art} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      <span className="tick h-[6px] w-[6px] rounded-full bg-[var(--color-ink-faint)]" />
      <span
        className="tick h-[6px] w-[6px] rounded-full bg-[var(--color-ink-faint)]"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="tick h-[6px] w-[6px] rounded-full bg-[var(--color-ink-faint)]"
        style={{ animationDelay: "240ms" }}
      />
    </div>
  );
}

function ArtifactEmpty() {
  return (
    <div className="flex h-full flex-col justify-center text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        Receipts panel
      </p>
      <p className="mt-3 font-serif text-[17px] italic leading-snug text-[var(--color-ink-muted)]">
        Whatever Karthik&apos;s chat pulls up, it lands here.
      </p>
      <p className="mt-2 text-[13px] text-[var(--color-ink-faint)]">
        Work entries, projects, and writing, materialized as you ask.
      </p>
    </div>
  );
}
