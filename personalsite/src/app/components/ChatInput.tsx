"use client";
import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ArrowUp, Square } from "lucide-react";

type ChatInputProps = {
  variant: "hero" | "docked";
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  queueNavIndex: number;
  isProcessing?: boolean;
  onStop?: () => void;
};

export function ChatInput({
  variant,
  value,
  onChange,
  onSubmit,
  onKeyDown,
  inputRef,
  queueNavIndex,
  isProcessing = false,
  onStop,
}: ChatInputProps) {
  const isHero = variant === "hero";
  const formClass = isHero
    ? "relative"
    : "relative mx-auto w-full max-w-[620px] pb-[env(safe-area-inset-bottom)] md:pb-8";
  const placeholder =
    queueNavIndex >= 0
      ? "Editing queued message…"
      : isHero
        ? "Ask anything about Karthik"
        : "Ask a follow-up";

  return (
    <form onSubmit={onSubmit} className={formClass}>
      {!isHero && <DockedInputVine />}
      <div
        className={`relative z-10 flex items-end gap-2 rounded-[14px] border bg-[var(--color-surface-raised)] px-4 py-3 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[var(--shadow-lift)] ${
          queueNavIndex >= 0
            ? "border-[var(--color-accent)]"
            : "border-[var(--color-hairline)]"
        }`}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          className={`flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none ${
            isHero ? "" : "pl-4"
          }`}
          autoFocus={isHero}
        />
        {isProcessing ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop generating"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-surface)] transition-all hover:bg-[var(--color-accent-hover)]"
          >
            <Square className="h-3 w-3" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Send"
            className="group/btn flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-surface)] transition-all hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}

function DockedInputVine() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 138 88"
      className="pointer-events-none absolute -left-3 -top-4 z-20 h-[88px] w-[138px] -scale-x-100"
      fill="none"
    >
      <path
        d="M14 16C20 14.5 26 14.5 32 16S44 17.5 50 16S62 14.5 68 16S78 17.5 82 16C98 16 106 23 110 34C114 45 113 60 119 70C121 74 123 76 126 77"
        stroke="var(--color-leaf)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M119 70C110 73 103 80 101 88C111 87 118 81 119 70Z"
        fill="var(--color-leaf-soft)"
        stroke="var(--color-leaf)"
        strokeWidth="0.9"
      />
      <path
        d="M82 16C79 8 83 2 93 0C95 8 91 14 82 16Z"
        fill="var(--color-leaf-soft)"
        stroke="var(--color-leaf)"
        strokeWidth="0.9"
      />
      <path
        d="M114 46C103 43 97 35 98 24C109 28 115 36 114 46Z"
        fill="var(--color-leaf-mid)"
        fillOpacity="0.76"
        stroke="var(--color-leaf)"
        strokeWidth="0.9"
      />
      <path
        d="M50 16C44 7 35 3 25 6C31 15 39 19 50 16Z"
        fill="var(--color-leaf-mid)"
        fillOpacity="0.76"
        stroke="var(--color-leaf)"
        strokeWidth="0.9"
      />
      <path
        d="M118 72L103 86M84 14L91 2M112 44L100 26M48 14L27 7"
        stroke="var(--color-leaf)"
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
