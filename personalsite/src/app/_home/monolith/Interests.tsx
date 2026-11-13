"use client";

// What Karthik is into right now. Each topic opens in place to the full
// section of his note. Every line is his, verbatim, from
// python-rag/rag-docs/corpus/topic_what-im-looking-for.md.
import { useState, type ReactNode } from "react";
import s from "./interests.module.css";

const TOPICS = [
  {
    id: "live-ai",
    label: "Live AI",
    line: "I’m interested in AI you can speak to while showing it what you’re doing.",
  },
  {
    id: "invisible-wearables",
    label: "Invisible wearables",
    line: "I'm looking for an AI-first wearable that can do something useful with what it learns about you, without you having to ask every time.",
  },
  {
    id: "internet-infrastructure-for-ai-agents",
    label: "Internet infrastructure for AI agents",
    line: "My agent should be able to book a table at a restaurant without someone having built an integration for that specific booking platform.",
  },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

/** Render his paragraph text with its markdown links as real links. */
function withLinks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a key={m.index} href={m[2]} className={s.inline}>
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The full section of his note, opened in place. */
function Detail({ id, paras, open }: { id: TopicId; paras: string[]; open: boolean }) {
  return (
    <div className={s.detail} data-open={open} id={`now-${id}`} aria-hidden={!open}>
      <div className={s.detailInner}>
        {paras.map((p, i) =>
          /^\s*- /m.test(p) ? (
            <ul key={i} className={s.list}>
              {p
                .split("\n")
                .filter((l) => l.trim().startsWith("- "))
                .map((l, j) => (
                  <li key={j}>{withLinks(l.trim().slice(2))}</li>
                ))}
            </ul>
          ) : (
            <p key={i}>{withLinks(p)}</p>
          ),
        )}
      </div>
    </div>
  );
}

export default function Interests({ sections, building }: { sections: Record<string, string[]>; building?: { title: string; href: string } }) {
  const [open, setOpen] = useState<TopicId | null>(null);
  const toggle = (id: TopicId) => setOpen((o) => (o === id ? null : id));
  // the first paragraph is shown as the row's teaser; opening shows the rest
  const rest = (id: TopicId) => (sections[id] ?? []).slice(1);

  return (
    <section id="interests" className={s.root} aria-labelledby="mo-now">
      <h2 id="mo-now" data-seclabel>
        Interests
      </h2>
      <ol className={s.topics}>
        {TOPICS.map((t) => {
          const isOpen = open === t.id;
          return (
            <li key={t.id} className={s.topic} data-open={isOpen}>
              <button type="button" className={s.topicRow} aria-expanded={isOpen} aria-controls={`now-${t.id}`} onClick={() => toggle(t.id)}>
                <span className={s.topicText}>
                  <span className={s.topicTitle}>{t.label}</span>
                  <span className={s.teaser}>{t.line}</span>
                </span>
                <span className={s.toggle} aria-hidden>
                  <span className={s.plus} />
                </span>
              </button>
              <Detail id={t.id} paras={rest(t.id)} open={isOpen} />
            </li>
          );
        })}
      </ol>

      {building ? (
        <p className={s.building}>
          <span>Currently building</span>
          <a href={building.href}>{building.title}</a>
        </p>
      ) : null}
    </section>
  );
}
