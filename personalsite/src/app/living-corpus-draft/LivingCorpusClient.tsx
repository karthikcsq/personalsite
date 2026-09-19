"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import type {
  JourneyBootstrap,
  JourneyEntry,
  JourneyNextResponse,
  JourneyNode,
  JourneyOption,
} from "@/lib/living-corpus/types";
import styles from "./living-corpus.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

interface PathChapter {
  node: JourneyNode;
  chosenDirection?: string;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `journey-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
    >
      <path
        d={diagonal ? "M4 12 12 4M6 4h6v6" : "M2.5 8h10M9 4.5 12.5 8 9 11.5"}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Environment({ depth }: { depth: number }) {
  const reducedMotion = useReducedMotion();
  const progress = Math.min(depth, 6);
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 1.15, ease: EASE };

  return (
    <div className={styles.environment} aria-hidden="true">
      <motion.span
        className={styles.sun}
        animate={{
          x: progress * 18,
          y: progress * 9,
          scale: 1 - progress * 0.018,
        }}
        transition={transition}
      />
      <motion.div
        className={styles.branch}
        animate={{
          rotate: progress * 0.75,
          x: progress * 15,
          y: progress * 4,
          scale: 1 + progress * 0.035,
          opacity: 0.43 - progress * 0.01,
        }}
        transition={transition}
      >
        <Image
          src="/living-corpus/solar-branch-shadow.webp"
          alt=""
          width={1536}
          height={1024}
          preload
          unoptimized
          sizes="(max-width: 700px) 88vw, 58vw"
        />
      </motion.div>
    </div>
  );
}

function Identity({ onHome, active }: { onHome: () => void; active: boolean }) {
  return (
    <motion.header
      className={styles.identity}
      animate={active ? "journey" : "home"}
      variants={{
        home: { x: 0, y: 0 },
        journey: { x: 0, y: 0 },
      }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <button type="button" onClick={onHome} className={styles.identityButton}>
        Karthik Thyagarajan
      </button>
      <p>researcher · builder · writer</p>
    </motion.header>
  );
}

function EntryIndex({
  entries,
  onChoose,
}: {
  entries: JourneyEntry[];
  onChoose: (entry: JourneyEntry) => void;
}) {
  return (
    <motion.nav
      className={styles.entryIndex}
      aria-label="Choose a topic"
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.38, ease: EASE }}
    >
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={styles.entryButton}
          onClick={() => onChoose(entry)}
          data-testid={`journey-entry-${entry.id}`}
        >
          <span>{entry.label}</span>
          <ArrowIcon />
        </button>
      ))}
    </motion.nav>
  );
}

function NoteDisclosure({ node }: { node: JourneyNode }) {
  const isWriting = node.category === "writing";
  const remainingSections = node.sections.filter(
    (section) => section.id !== node.sectionId,
  );
  if (!remainingSections.length) return null;
  return (
    <details className={styles.noteDisclosure}>
      <summary>
        <span>{isWriting ? "preview the rest of the essay" : "read the rest of the note"}</span>
        <span className={styles.disclosureMark} aria-hidden="true" />
      </summary>
      <div className={styles.noteBody}>
        {remainingSections.map((section) => (
          <section key={section.id} className={styles.noteSection}>
            <h3>{section.heading}</h3>
            <p>{section.text}</p>
          </section>
        ))}
        <a href={node.href} className={styles.sourceLink}>
          <span>{isWriting ? "read full essay" : "open source"}</span>
          <ArrowIcon diagonal />
        </a>
      </div>
    </details>
  );
}

const REFERENCE_LABELS = {
  work: "work",
  projects: "project",
  writing: "writing",
  ideas: "note",
  involvement: "involvement",
  personal: "personal",
} as const;

function ArtifactReference({ node }: { node: JourneyNode }) {
  const showBullets =
    (node.category === "work" || node.category === "projects") &&
    node.referenceItems.length > 0;
  const showPreview =
    (node.category === "writing" || node.category === "personal") && node.summary;
  const sourceHref = node.href.split("#", 1)[0] || node.href;

  return (
    <aside className={styles.reference} aria-label={`${node.title} reference`}>
      <div className={styles.referenceHeader}>
        <p>
          <span>{REFERENCE_LABELS[node.category]}</span>
          <strong>{node.title}</strong>
        </p>
        <a href={sourceHref}>
          <span>{node.category === "writing" ? "read" : "view"}</span>
          <ArrowIcon diagonal />
        </a>
      </div>
      {showBullets ? (
        <ul>
          {node.referenceItems.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {showPreview ? <p className={styles.referencePreview}>{node.summary}</p> : null}
    </aside>
  );
}

function ChapterMedia({ node }: { node: JourneyNode }) {
  if (!node.media) return null;
  return (
    <figure className={styles.chapterMedia}>
      <Image
        src={node.media.src}
        alt={node.media.alt}
        width={1060}
        height={680}
        sizes="(max-width: 700px) calc(100vw - 48px), 530px"
      />
      <figcaption>{node.media.caption}</figcaption>
    </figure>
  );
}

function Chapter({
  chapter,
  index,
  isCurrent,
  options,
  pending,
  failed,
  onChoose,
  onRetry,
  chapterRef,
}: {
  chapter: PathChapter;
  index: number;
  isCurrent: boolean;
  options: JourneyOption[];
  pending: boolean;
  failed: boolean;
  onChoose: (option: JourneyOption) => void;
  onRetry: () => void;
  chapterRef?: Ref<HTMLElement>;
}) {
  const { node } = chapter;
  return (
    <motion.article
      ref={chapterRef}
      className={styles.chapter}
      data-current={isCurrent ? "true" : "false"}
      data-testid={`journey-chapter-${index + 1}`}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.58, ease: EASE }}
    >
      <p className={styles.chapterMeta}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{node.title}</span>
        {node.meta ? <span>{node.meta}</span> : null}
      </p>
      <p className={styles.noteContext}>{node.context}</p>
      <h2>{node.heading}</h2>
      <p className={styles.chapterText}>{node.text}</p>
      <ChapterMedia node={node} />
      <ArtifactReference node={node} />
      <NoteDisclosure node={node} />

      {chapter.chosenDirection ? (
        <p className={styles.chosenDirection}>
          <ArrowIcon />
          <span>{chapter.chosenDirection}</span>
        </p>
      ) : null}

      {isCurrent ? (
        <div className={styles.nextArea} aria-live="polite">
          {pending ? <span className={styles.thinkingLine} /> : null}
          {!pending && options.length ? (
            <div className={styles.nextOptions} aria-label="Choose what comes next">
              {options.map((option) => (
                <button
                  type="button"
                  key={option.node.id}
                  onClick={() => onChoose(option)}
                  aria-label={`${option.node.title}: ${option.label}`}
                >
                  <span className={styles.optionCopy}>
                    <span className={styles.optionSource}>{option.node.title}</span>
                    <span>{option.label}</span>
                  </span>
                  <ArrowIcon />
                </button>
              ))}
            </div>
          ) : null}
          {!pending && failed ? (
            <button type="button" className={styles.retryButton} onClick={onRetry}>
              try again
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.article>
  );
}

function JourneyCoda({
  chapters,
  onRestart,
}: {
  chapters: PathChapter[];
  onRestart: () => void;
}) {
  return (
    <motion.section
      className={styles.coda}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      data-testid="journey-coda"
    >
      <p className={styles.pathLine}>
        {chapters.map((chapter) => chapter.node.label).join(" / ")}
      </p>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.node.id}>
            <a href={chapter.node.href}>
              <span>{chapter.node.title}</span>
              <span>{chapter.node.heading}</span>
            </a>
          </li>
        ))}
      </ol>
      <button type="button" className={styles.restartButton} onClick={onRestart}>
        start somewhere else
      </button>
    </motion.section>
  );
}

export default function LivingCorpusClient({ data }: { data: JourneyBootstrap }) {
  const [chapters, setChapters] = useState<PathChapter[]>([]);
  const [options, setOptions] = useState<JourneyOption[]>([]);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [failed, setFailed] = useState(false);
  const sessionIdRef = useRef(createSessionId());
  const requestRef = useRef<AbortController | null>(null);
  const lastChapterRef = useRef<HTMLElement | null>(null);

  const loadNext = useCallback(async (node: JourneyNode, trail: string[]) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setFailed(false);
    setOptions([]);

    try {
      const response = await fetch("/api/living-corpus/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentNodeId: node.id,
          trail,
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Journey request failed");
      const result = (await response.json()) as JourneyNextResponse;
      if (result.currentNodeId !== node.id || controller.signal.aborted) return;
      setOptions(result.options);
      setComplete(result.complete);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Could not continue journey", error);
      setFailed(true);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }, []);

  useEffect(() => {
    if (chapters.length <= 1 || !lastChapterRef.current) return;
    lastChapterRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [chapters.length]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  const chooseEntry = (entry: JourneyEntry) => {
    setChapters([{ node: entry.node }]);
    setComplete(false);
    void loadNext(entry.node, [entry.node.id]);
  };

  const chooseOption = (option: JourneyOption) => {
    const nextChapters = [
      ...chapters.slice(0, -1),
      {
        ...chapters.at(-1)!,
        chosenDirection: `${option.node.title} · ${option.label}`,
      },
      { node: option.node },
    ];
    setChapters(nextChapters);
    setComplete(false);
    void loadNext(
      option.node,
      nextChapters.map((chapter) => chapter.node.id),
    );
  };

  const retry = () => {
    const current = chapters.at(-1);
    if (!current) return;
    void loadNext(
      current.node,
      chapters.map((chapter) => chapter.node.id),
    );
  };

  const reset = () => {
    requestRef.current?.abort();
    sessionIdRef.current = createSessionId();
    setChapters([]);
    setOptions([]);
    setPending(false);
    setComplete(false);
    setFailed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const active = chapters.length > 0;

  return (
    <div className={styles.page} data-stage={active ? "journey" : "home"}>
      <Environment depth={chapters.length} />
      <Identity onHome={reset} active={active} />
      <AnimatePresence mode="wait">
        {!active ? (
          <EntryIndex key="entry-index" entries={data.entries} onChoose={chooseEntry} />
        ) : null}
      </AnimatePresence>

      {active ? (
        <main className={styles.journey}>
          {chapters.map((chapter, index) => {
            const isCurrent = index === chapters.length - 1;
            return (
              <Chapter
                key={chapter.node.id}
                chapter={chapter}
                index={index}
                isCurrent={isCurrent}
                options={isCurrent ? options : []}
                pending={isCurrent && pending}
                failed={isCurrent && failed}
                onChoose={chooseOption}
                onRetry={retry}
                chapterRef={isCurrent ? lastChapterRef : undefined}
              />
            );
          })}
          {complete && !pending ? (
            <JourneyCoda chapters={chapters} onRestart={reset} />
          ) : null}
        </main>
      ) : null}
    </div>
  );
}
