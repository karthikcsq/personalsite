"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Crosshair,
  Gauge,
  History,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { InteriorBotanicalFrame } from "@/app/components/BotanicalDetails";
import styles from "@/app/a2ui-draft/a2ui-draft.module.css";

type TurnSnapshot = {
  id: string;
  question: string;
};

const INITIAL_HISTORY: TurnSnapshot[] = [
  {
    id: "turn-current-work",
    question: "What is Karthik working on?",
  },
  {
    id: "turn-ai-approach",
    question: "How does Karthik approach AI?",
  },
];

const ACTION_STATES = [
  {
    label: "High-level actions",
    summary: "More predictable, less adaptable.",
    body:
      "A smaller action set makes training easier to reason about, but gives the agent fewer ways to respond when the network changes.",
  },
  {
    label: "Broader action set",
    summary: "More options, a larger learning problem.",
    body:
      "Additional actions help the agent inspect more of the network, while increasing the number of choices it has to learn from.",
  },
  {
    label: "Low-level control",
    summary: "More flexibility, harder learning.",
    body:
      "Low-level control gives the agent the most flexibility to adapt in complex environments, but it requires more exploration to learn effective behavior.",
  },
] as const;

const RESULT_ITEMS = [
  {
    value: "35%",
    label: "lower exploration latency",
    icon: Gauge,
  },
  {
    value: "25%",
    label: "higher detection coverage",
    icon: Crosshair,
  },
  {
    value: "500K+",
    label: "daily device events",
    icon: BarChart3,
  },
] as const;

export default function A2uiDraftClient() {
  const [selectedAction, setSelectedAction] = useState(2);
  const [question, setQuestion] = useState(
    "How did Karthik's work at Peraton Labs shape his views on AI agents?",
  );
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<TurnSnapshot[]>(INITIAL_HISTORY);
  const [historyOpen, setHistoryOpen] = useState(false);

  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuestion = prompt.trim();
    if (!nextQuestion) return;

    setHistory((current) => [
      {
        id: `turn-${Date.now()}`,
        question,
      },
      ...current,
    ]);
    setQuestion(nextQuestion);
    setPrompt("");
    setSelectedAction(2);
  };

  return (
    <div className={styles.shell} data-a2ui-draft>
      <div className={styles.botanicalFrame}>
        <InteriorBotanicalFrame />
      </div>

      <HistoryRail history={history} />

      <button
        type="button"
        className={styles.mobileHistoryButton}
        onClick={() => setHistoryOpen(true)}
        aria-label="Open previous questions"
      >
        <History aria-hidden="true" />
      </button>

      {historyOpen ? (
        <MobileHistory
          history={history}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      <main className={styles.canvas}>
        <section
          key={question}
          className={styles.answerScene}
          aria-live="polite"
        >
          <h1 className={styles.question}>{question}</h1>

          <article className={styles.answerCard}>
            <p className={styles.introduction}>
              At Peraton Labs, Karthik built a reinforcement-learning agent to
              search a large IoT network for malware. The core design question
              was how much control the agent should have over its actions in the
              network.
            </p>

            <ActionSpaceControl
              selected={selectedAction}
              onSelect={setSelectedAction}
            />

            <div className={styles.results}>
              <h2>Measured results</h2>
              <div className={styles.resultList}>
                {RESULT_ITEMS.map((result) => {
                  const Icon = result.icon;
                  return (
                    <div className={styles.resultItem} key={result.value}>
                      <span className={styles.resultIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{result.value}</strong>
                        <small>{result.label}</small>
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link
                href="/work#peraton-labs"
                className={styles.workLink}
              >
                View the Peraton work
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <blockquote className={styles.quoteCard}>
              <span className={styles.quoteMark} aria-hidden="true">
                &ldquo;
              </span>
              <p>The future of agents lies in control.</p>
              <span className={styles.quoteRule} aria-hidden="true" />
            </blockquote>
          </article>
        </section>
      </main>

      <Composer
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={submitPrompt}
      />
    </div>
  );
}

function ActionSpaceControl({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  const selectedState = ACTION_STATES[selected];

  return (
    <fieldset
      className={styles.actionSpace}
      data-selected={selected}
      aria-label="Choose the agent's level of control"
    >
      <div className={styles.actionTrack} aria-hidden="true" />
      <div className={styles.actionOptions}>
        {ACTION_STATES.map((state, index) => (
          <label
            key={state.label}
            className={styles.actionOption}
            data-active={selected === index}
          >
            <span>{state.label}</span>
            <input
              type="radio"
              name="agent-control"
              checked={selected === index}
              onChange={() => onSelect(index)}
            />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>

      <div className={styles.actionDetail}>
        <span className={styles.actionDetailPointer} aria-hidden="true" />
        <span className={styles.actionCheck}>
          <Check aria-hidden="true" />
        </span>
        <div>
          <strong>{selectedState.summary}</strong>
          <p>{selectedState.body}</p>
        </div>
      </div>
    </fieldset>
  );
}

function Composer({
  prompt,
  onPromptChange,
  onSubmit,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className={styles.composer} onSubmit={onSubmit}>
      <MessageCircle aria-hidden="true" className={styles.composerIcon} />
      <span className={styles.composerDivider} aria-hidden="true" />
      <textarea
        rows={1}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Ask another question"
        aria-label="Ask another question"
      />
      <button type="submit" disabled={!prompt.trim()} aria-label="Send question">
        <Send aria-hidden="true" />
      </button>
    </form>
  );
}

function HistoryRail({ history }: { history: TurnSnapshot[] }) {
  return (
    <aside className={styles.historyRail} aria-label="Previous questions">
      <div className={styles.historyList}>
        {history.map((turn) => (
          <div className={styles.historyItem} key={turn.id}>
            <span aria-hidden="true" />
            <p>{turn.question}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MobileHistory({
  history,
  onClose,
}: {
  history: TurnSnapshot[];
  onClose: () => void;
}) {
  return (
    <aside className={styles.mobileHistory} aria-label="Previous questions">
      <button type="button" onClick={onClose} aria-label="Close previous questions">
        <X aria-hidden="true" />
      </button>
      <div>
        {history.map((turn) => (
          <div className={styles.mobileHistoryItem} key={turn.id}>
            <span aria-hidden="true" />
            <p>{turn.question}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
