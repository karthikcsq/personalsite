"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Copy,
  History,
  Quote as QuoteIcon,
  X,
} from "lucide-react";
import type { Artifact } from "@/app/components/ChatArtifact";
import {
  A2UI_VISUAL_ASSETS,
  type A2UIVisualAssetId,
} from "@/a2ui/assetCatalog";
import {
  artifactPath,
  componentNavigationPath,
  normalizeA2UIPath,
  type A2UIAction,
  type A2UIComponent,
  type A2UIComposition,
  type A2UIDocument,
} from "@/a2ui/protocol";
import { InteriorBotanicalFrame } from "@/app/components/BotanicalDetails";
import styles from "@/app/components/a2ui/a2ui.module.css";

export type A2UITurn = {
  id: string;
  question: string;
  content: string;
  document?: A2UIDocument;
  artifacts: Artifact[];
  isLoading: boolean;
};

type Props = {
  turns: A2UITurn[];
  onAsk: (prompt: string) => void;
  onNewConversation: () => void;
  suggestions: string[];
  footer: ReactNode;
};

export function A2UIExperience({
  turns,
  onAsk,
  onNewConversation,
  suggestions,
  footer,
}: Props) {
  const [activeId, setActiveId] = useState(turns.at(-1)?.id ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const latest = turns.at(-1);
    if (latest) setActiveId(latest.id);
  }, [turns.length]);

  const active = turns.find((turn) => turn.id === activeId) ?? turns.at(-1);
  if (!active) return null;
  const activeTurnIndex = Math.max(
    0,
    turns.findIndex((turn) => turn.id === active.id),
  );

  return (
    <div className={styles.shell}>
      <div className={styles.botanicalFrame} aria-hidden="true">
        <InteriorBotanicalFrame />
      </div>

      <HistoryRail
        turns={turns}
        activeId={active.id}
        onSelect={setActiveId}
        onNewConversation={onNewConversation}
        suggestions={suggestions}
        onAsk={onAsk}
      />

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
          turns={turns}
          activeId={active.id}
          onSelect={(id) => {
            setActiveId(id);
            setHistoryOpen(false);
          }}
          onClose={() => setHistoryOpen(false)}
          onNewConversation={onNewConversation}
          suggestions={suggestions}
          onAsk={(prompt) => {
            setHistoryOpen(false);
            onAsk(prompt);
          }}
        />
      ) : null}

      <main className={styles.canvas}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={`${active.id}:${active.isLoading && !active.document ? "loading" : "ready"}`}
            className={styles.scene}
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.994 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {active.isLoading && !active.document ? (
              <A2UILoading question={active.question} />
            ) : (
              <A2UICanvas
                question={active.question}
                content={active.content}
                document={active.document}
                artifacts={active.artifacts}
                compositionTurn={activeTurnIndex}
                onAsk={onAsk}
              />
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <div className={styles.composerDock}>{footer}</div>
    </div>
  );
}

function A2UICanvas({
  question,
  content,
  document: uiDocument,
  artifacts,
  compositionTurn,
  onAsk,
}: {
  question: string;
  content: string;
  document?: A2UIDocument;
  artifacts: Artifact[];
  compositionTurn: number;
  onAsk: (prompt: string) => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [revealStage, setRevealStage] = useState(uiDocument ? 0 : 3);
  const artifactMap = useMemo(
    () => new Map(artifacts.map((artifact) => [artifact.id, artifact])),
    [artifacts],
  );

  useEffect(() => {
    if (!uiDocument || reduceMotion) {
      setRevealStage(3);
      return;
    }
    setRevealStage(0);
    const timers = [
      setTimeout(() => setRevealStage(1), 70),
      setTimeout(() => setRevealStage(2), 250),
      setTimeout(() => setRevealStage(3), 450),
    ];
    return () => timers.forEach(clearTimeout);
  }, [uiDocument, reduceMotion]);

  if (!uiDocument) {
    return (
      <>
        <h1 className={styles.question}>{question}</h1>
        <article className={styles.answerSurface}>
          <Markdown className={styles.lead}>{content}</Markdown>
        </article>
      </>
    );
  }

  const execute = async (action: A2UIAction) => {
    if (action.intent === "ask_prompt") {
      onAsk(action.payload);
      return;
    }
    if (action.intent === "open_artifact") {
      const path = artifactPath(action.payload);
      if (path) router.push(path);
      return;
    }
    if (action.intent === "open_path") {
      router.push(action.payload);
      return;
    }
    if (action.intent === "focus_component") {
      document.getElementById(`a2ui-${action.payload}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    if (action.intent === "copy_answer") {
      await navigator.clipboard?.writeText(
        [uiDocument.title, uiDocument.lead, content].filter(Boolean).join("\n\n"),
      );
    }
  };
  const componentNavigationPaths = new Map(
    [uiDocument.primary, ...uiDocument.supporting].flatMap((component) => {
      const path = componentNavigationPath(component, uiDocument.actions);
      return path ? [[component.id, path] as const] : [];
    }),
  );
  const consumedNavigationPaths = new Set(componentNavigationPaths.values());
  const directlyRenderedArtifactPaths = new Set(
    [uiDocument.primary, ...uiDocument.supporting].flatMap((component) => {
      if (
        ![
          "artifact_focus",
          "paper_dossier",
          "research_map",
          "fold_timeline",
          "field_notebook",
          "system_blueprint",
          "evidence_stack",
          "essay_margin",
          "specimen_board",
        ].includes(component.type)
      ) {
        return [];
      }
      return [
        ...component.artifactIds,
        ...component.items.map((item) => item.artifactId),
      ].flatMap((id) => {
        const path = artifactPath(id);
        return path ? [path] : [];
      });
    }),
  );
  const compositionOptions =
    uiDocument.compositionOptions?.length > 0
      ? uiDocument.compositionOptions
      : (["stacked"] satisfies A2UIComposition[]);
  const composition: A2UIComposition =
    uiDocument.supporting.length > 0
      ? (
          compositionOptions[compositionTurn % compositionOptions.length] ??
          "stacked"
        )
      : "stacked";
  const visibleActions = uiDocument.actions.filter(
    (action) => {
      const actionPath =
        action.intent === "open_path"
          ? normalizeA2UIPath(action.payload)
          : null;
      return (
        !(actionPath && consumedNavigationPaths.has(actionPath)) &&
      !(actionPath && directlyRenderedArtifactPaths.has(actionPath)) &&
      !(
        action.intent === "open_artifact" &&
        [
          "artifact_focus",
          "paper_dossier",
          "research_map",
          "fold_timeline",
          "field_notebook",
          "system_blueprint",
          "evidence_stack",
          "essay_margin",
          "specimen_board",
        ].includes(uiDocument.primary.type) &&
        (
          uiDocument.primary.artifactIds.includes(action.payload) ||
          uiDocument.primary.items.some(
            (item) => item.artifactId === action.payload,
          )
        )
          )
      );
    },
  );

  return (
    <>
      <h1 className={styles.question}>{uiDocument.title || question}</h1>
      <article
        className={styles.answerSurface}
        data-composition={composition}
      >
        <div className={styles.reveal} data-visible={revealStage >= 1}>
          <Markdown className={styles.lead}>{uiDocument.lead}</Markdown>
        </div>

        <div
          className={`${styles.primary} ${styles.reveal}`}
          data-visible={revealStage >= 2}
        >
          <A2UIBlock
            component={uiDocument.primary}
            navigationPath={componentNavigationPaths.get(uiDocument.primary.id)}
            artifactMap={artifactMap}
            onOpen={(id) => {
              const path = artifactPath(id);
              if (path) router.push(path);
            }}
          />
        </div>

        {uiDocument.supporting.length > 0 ? (
          <div
            className={`${styles.supporting} ${styles.reveal}`}
            data-visible={revealStage >= 3}
          >
            {uiDocument.supporting.map((component) => (
              <A2UIBlock
                key={component.id}
                component={component}
                navigationPath={componentNavigationPaths.get(component.id)}
                artifactMap={artifactMap}
                onOpen={(id) => {
                  const path = artifactPath(id);
                  if (path) router.push(path);
                }}
              />
            ))}
          </div>
        ) : null}

        {visibleActions.length > 0 ? (
          <div
            className={`${styles.actions} ${styles.reveal}`}
            data-visible={revealStage >= 3}
          >
            {visibleActions.map((action, index) => (
              <button
                type="button"
                key={`${action.intent}-${action.payload}-${index}`}
                onClick={() => execute(action)}
              >
                {action.intent === "copy_answer" ? (
                  <Copy aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </article>
    </>
  );
}

function A2UIBlock({
  component,
  navigationPath,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  navigationPath?: string;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const [selectedOption, setSelectedOption] = useState(0);
  const selected = component.options[selectedOption];
  const quoteArtifacts = component.quoteIds.flatMap((quoteId) => {
    const artifact = artifactMap.get(quoteId.replace(/^quote:/, ""));
    return artifact?.annotation ? [artifact] : [];
  });

  const heading = component.title ? <h2>{component.title}</h2> : null;

  if (navigationPath && component.type === "narrative") {
    return (
      <Link
        id={`a2ui-${component.id}`}
        href={navigationPath}
        className={styles.navigationComponent}
      >
        <span className={styles.navigationCopy}>
          {heading}
          {component.body ? <p>{stripMarkdownLinks(component.body)}</p> : null}
        </span>
        <span className={styles.navigationCue}>
          Open
          <ArrowRight aria-hidden="true" />
        </span>
      </Link>
    );
  }

  if (component.type === "quote_focus") {
    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.quoteComponent}`}
      >
        <QuoteIcon aria-hidden="true" className={styles.quoteIcon} />
        {quoteArtifacts.length > 0 ? (
          quoteArtifacts.map((artifact) => (
            <blockquote key={artifact.id}>
              <p>{stripWrappingQuotes(artifact.annotation!)}</p>
              <footer>{artifactLabel(artifact)}</footer>
            </blockquote>
          ))
        ) : (
          <>
            {heading}
            <Markdown>{component.body}</Markdown>
          </>
        )}
      </section>
    );
  }

  if (component.type === "research_map") {
    return (
      <ResearchMap
        component={component}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "fold_timeline") {
    return (
      <FoldTimeline
        component={component}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "field_notebook") {
    return <FieldNotebook component={component} onOpen={onOpen} />;
  }

  if (component.type === "system_blueprint") {
    return <SystemBlueprint component={component} onOpen={onOpen} />;
  }

  if (component.type === "evidence_stack") {
    return <EvidenceStack component={component} onOpen={onOpen} />;
  }

  if (component.type === "essay_margin") {
    return <EssayMargin component={component} onOpen={onOpen} />;
  }

  if (component.type === "specimen_board") {
    return <SpecimenBoard component={component} onOpen={onOpen} />;
  }

  if (component.type === "manifesto_fold" && component.options.length > 0) {
    return (
      <ManifestoFold
        component={component}
        selectedOption={selectedOption}
        onSelect={setSelectedOption}
      />
    );
  }

  if (component.type === "topic_compass" && component.options.length > 0) {
    return (
      <TopicCompass
        component={component}
        selectedOption={selectedOption}
        onSelect={setSelectedOption}
      />
    );
  }

  if (component.type === "metric_grid") {
    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.metricComponent}`}
      >
        {heading}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        <div className={styles.metricGrid}>
          {component.items.map((item, index) => (
            <div key={`${item.label}-${index}`} className={styles.metric}>
              <span className={styles.metricIcon}>
                <BarChart3 aria-hidden="true" />
              </span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              {item.detail ? <small>{item.detail}</small> : null}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (component.type === "comparison" && component.options.length > 0) {
    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.comparisonComponent}`}
      >
        {heading}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        <div
          className={styles.optionTabs}
          role="tablist"
          aria-label={component.title || "Comparison"}
        >
          {component.options.map((option, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={selectedOption === index}
              key={option.label}
              onClick={() => setSelectedOption(index)}
            >
              <span>{option.label}</span>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
        {selected ? (
          <div className={styles.optionDetail} role="tabpanel">
            <span className={styles.optionCheck}>
              <Check aria-hidden="true" />
            </span>
            <div>
              <strong>{selected.summary}</strong>
              <p>{selected.detail}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  if (component.type === "timeline" || component.type === "steps") {
    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.timelineComponent}`}
      >
        {heading}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        <ol>
          {component.items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <span className={styles.timelineMarker}>
                {component.type === "steps" ? index + 1 : <Clock3 aria-hidden="true" />}
              </span>
              <div>
                <strong>{item.label}</strong>
                {item.value ? <small>{item.value}</small> : null}
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (
    component.type === "artifact_focus" ||
    component.type === "paper_dossier"
  ) {
    const ids = [
      ...component.artifactIds,
      ...component.items.map((item) => item.artifactId),
    ].filter((id, index, all) => id && all.indexOf(id) === index);
    const resolvedArtifacts = ids.flatMap((id) => {
      const artifact = artifactMap.get(id);
      return artifact ? [{ id, artifact }] : [];
    });
    const single = resolvedArtifacts.length === 1 ? resolvedArtifacts[0] : null;

    if (single) {
      const facts = component.items.filter(
        (candidate) =>
          (candidate.artifactId === single.id || candidate.artifactId === "") &&
          Boolean(candidate.value || candidate.detail || candidate.assetId),
      );
      const title = artifactLabel(single.artifact);
      return (
        <section
          id={`a2ui-${component.id}`}
          className={`${styles.component} ${styles.artifactComponent} ${styles.singleArtifact} ${
            component.type === "paper_dossier" ? styles.paperDossier : ""
          }`}
        >
          <ArtifactPaperOutline />
          <ArtifactCornerSprig />
          <div className={styles.singleArtifactCopy}>
            <h2>{title}</h2>
            {component.body ? <Markdown>{component.body}</Markdown> : null}
            {facts.find((fact) => fact.assetId)?.assetId ? (
              <A2UIAsset
                assetId={facts.find((fact) => fact.assetId)!.assetId}
                className={styles.dossierIllustration}
              />
            ) : null}
            {facts.length > 0 ? (
              <div className={styles.artifactFacts}>
                <BotanicalFactMap />
                {facts.map((fact, index) => (
                  <div
                    key={`${fact.label}-${index}`}
                    className={styles.artifactFact}
                  >
                    <span>{fact.label}</span>
                    {fact.value ? <strong>{fact.value}</strong> : null}
                    {fact.detail ? <p>{fact.detail}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.singleArtifactAction}
            onClick={() => onOpen(single.id)}
          >
            {`Open ${artifactLabel(single.artifact)}`}
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      );
    }

    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.artifactComponent} ${styles.multiArtifact}`}
      >
        <ArtifactPaperOutline />
        <ArtifactCornerSprig />
        {heading}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        <div className={styles.artifactList}>
          {ids.map((id) => {
            const artifact = artifactMap.get(id);
            if (!artifact) return null;
            const item = component.items.find((candidate) => candidate.artifactId === id);
            return (
              <button type="button" key={id} onClick={() => onOpen(id)}>
                <span className={styles.artifactListCopy}>
                  <strong>{artifactLabel(artifact)}</strong>
                  {item?.detail ? <small>{item.detail}</small> : null}
                  <span className={styles.artifactListAction}>
                    {`Open ${artifactLabel(artifact)}`}
                    <ArrowRight aria-hidden="true" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.narrativeComponent} ${
        component.title ? styles.narrativeWithTitle : styles.narrativeWithoutTitle
      }`}
    >
      {heading}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      {component.items.length > 0 ? (
        <div className={styles.narrativeItems}>
          <NarrativeBotanicalMap />
          {component.items.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <span>
                <strong>{item.label}</strong>
                {item.value ? <small>{item.value}</small> : null}
                <p>{item.detail}</p>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function A2UIAsset({
  assetId,
  className,
}: {
  assetId: A2UIVisualAssetId | "";
  className?: string;
}) {
  if (!assetId) return null;
  const asset = A2UI_VISUAL_ASSETS[assetId];
  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={900}
      height={560}
      sizes="(max-width: 720px) 88vw, 38vw"
      className={className}
      unoptimized
    />
  );
}

function ResearchMap({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  const artifactIds = [
    ...component.artifactIds,
    ...component.items.map((item) => item.artifactId),
  ].filter((id, index, all) => id && all.indexOf(id) === index);
  const sharedArtifactId = artifactIds.length === 1 ? artifactIds[0] : "";

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.researchMap}`}
    >
      <div className={styles.researchMapTape} aria-hidden="true" />
      {component.title ? <h2>{component.title}</h2> : null}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      <div className={styles.researchStages}>
        <svg
          className={styles.researchSignal}
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 62C58 62 70 46 104 62C141 80 160 17 202 64C232 98 251 21 286 60C320 96 334 43 370 62C412 83 436 45 470 61C502 76 520 21 558 65C592 105 616 7 653 63C687 113 708 24 744 63C780 102 802 34 839 62C872 88 902 44 932 61C957 74 978 60 1000 62" />
          <path d="M0 66C58 66 70 50 104 66C141 84 160 21 202 68C232 102 251 25 286 64C320 100 334 47 370 66C412 87 436 49 470 65C502 80 520 25 558 69C592 109 616 11 653 67C687 117 708 28 744 67C780 106 802 38 839 66C872 92 902 48 932 65C957 78 978 64 1000 66" />
        </svg>
        {component.items.map((item, index) => {
          const content = (
            <>
              <span className={styles.researchStageNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <A2UIAsset
                assetId={item.assetId}
                className={styles.researchStageAsset}
              />
              <span className={styles.researchStageCopy}>
                <strong>{item.label}</strong>
                {item.value ? <b>{item.value}</b> : null}
                {item.detail ? <small>{item.detail}</small> : null}
              </span>
              {item.artifactId && !sharedArtifactId ? (
                <span className={styles.researchStageAction}>
                  Explore
                  <ArrowRight aria-hidden="true" />
                </span>
              ) : null}
            </>
          );
          return item.artifactId && !sharedArtifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              className={styles.researchStage}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <div
              key={`${item.label}-${index}`}
              className={styles.researchStage}
            >
              {content}
            </div>
          );
        })}
      </div>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.researchMapAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          Open the full work
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function FoldTimeline({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  const count = Math.max(component.items.length, 1);
  const isDense = count > 4;
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.foldTimeline}`}
    >
      {component.title ? <h2>{component.title}</h2> : null}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      <div
        className={`${styles.foldStrip} ${isDense ? styles.foldStripDense : ""} ${count === 5 ? styles.foldStripFive : ""}`}
        style={
          {
            "--fold-count": count,
            "--fold-columns":
              count > 1
                ? `repeat(${count - 1}, minmax(0, 1fr)) minmax(0, 1.3fr)`
                : "minmax(0, 1fr)",
          } as CSSProperties
        }
      >
        {component.items.map((item, index) => {
          const content = (
            <>
              <A2UIAsset
                assetId={item.assetId}
                className={styles.foldAsset}
              />
              {item.value ? <span>{item.value}</span> : null}
              <strong>{item.label}</strong>
              {item.detail ? <small>{item.detail}</small> : null}
              {item.artifactId ? (
                <i>
                  Open
                  <ArrowRight aria-hidden="true" />
                </i>
              ) : null}
            </>
          );
          return item.artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <div key={`${item.label}-${index}`}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

function FieldNotebook({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  const artifactIds = [
    ...component.artifactIds,
    ...component.items.map((item) => item.artifactId),
  ].filter((id, index, all) => id && all.indexOf(id) === index);
  const sharedArtifactId = artifactIds.length === 1 ? artifactIds[0] : "";
  const heroAsset = component.items.find((item) => item.assetId)?.assetId ?? "";

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.fieldNotebook}`}
    >
      <div className={styles.notebookFold} aria-hidden="true" />
      <div className={styles.notebookPage}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        {heroAsset ? (
          <A2UIAsset assetId={heroAsset} className={styles.notebookAsset} />
        ) : null}
      </div>
      <div className={styles.notebookAnnotations}>
        {component.items.map((item, index) => {
          const content = (
            <>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.label}</strong>
              {item.value ? <b>{item.value}</b> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </>
          );
          return item.artifactId && item.artifactId !== sharedArtifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <div key={`${item.label}-${index}`}>{content}</div>
          );
        })}
      </div>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.notebookAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          Open the source
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function SystemBlueprint({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.systemBlueprint}`}
    >
      <div className={styles.blueprintHeading}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div className={styles.blueprintModules}>
        <svg
          viewBox="0 0 1000 560"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M92 116C230 90 290 184 394 171C511 156 521 77 643 111C753 142 758 229 910 205" />
          <path d="M84 432C211 461 282 344 402 382C523 421 591 485 707 428C785 390 837 330 923 350" />
          <path d="M238 110C250 232 204 312 112 432" />
          <path d="M643 111C631 238 701 297 923 350" />
        </svg>
        {component.items.map((item, index) => {
          const content = (
            <>
              {item.assetId ? (
                <A2UIAsset
                  assetId={item.assetId}
                  className={styles.blueprintAsset}
                />
              ) : (
                <span className={styles.blueprintGlyph}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <strong>{item.label}</strong>
              {item.value ? <b>{item.value}</b> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </>
          );
          return item.artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              style={{ "--module-index": index } as CSSProperties}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <div
              key={`${item.label}-${index}`}
              style={{ "--module-index": index } as CSSProperties}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EvidenceStack({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.evidenceStack} ${
        component.title || component.body ? "" : styles.evidenceStackWithoutIntro
      }`}
    >
      <div className={styles.evidenceStackIntro}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div className={styles.evidenceSlips}>
        {component.items.map((item, index) => {
          const content = (
            <>
              {item.assetId ? (
                <A2UIAsset
                  assetId={item.assetId}
                  className={styles.evidenceAsset}
                />
              ) : null}
              <span>{item.label}</span>
              {item.value ? <strong>{item.value}</strong> : null}
              {item.detail ? <small>{item.detail}</small> : null}
              {item.artifactId ? <i>Open source</i> : null}
            </>
          );
          return item.artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              style={{ "--slip-index": index } as CSSProperties}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <div
              key={`${item.label}-${index}`}
              style={{ "--slip-index": index } as CSSProperties}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EssayMargin({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  const heroAsset = component.items.find((item) => item.assetId)?.assetId ?? "";
  const sharedArtifactId =
    component.artifactIds.length === 1 ? component.artifactIds[0] : "";

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.essayMargin}`}
    >
      <div className={styles.essayPage}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        {heroAsset ? (
          <A2UIAsset assetId={heroAsset} className={styles.essayAsset} />
        ) : null}
        {sharedArtifactId ? (
          <button type="button" onClick={() => onOpen(sharedArtifactId)}>
            Read the source
            <ArrowRight aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className={styles.marginNotes}>
        {component.items.map((item, index) => (
          <button
            type="button"
            key={`${item.label}-${index}`}
            disabled={!item.artifactId}
            onClick={() => item.artifactId && onOpen(item.artifactId)}
          >
            <span>{item.label}</span>
            {item.value ? <strong>{item.value}</strong> : null}
            {item.detail ? <small>{item.detail}</small> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function SpecimenBoard({
  component,
  onOpen,
}: {
  component: A2UIComponent;
  onOpen: (id: string) => void;
}) {
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.specimenBoard}`}
    >
      <div className={styles.specimenHeading}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div className={styles.specimens}>
        {component.items.map((item, index) => {
          const content = (
            <>
              <span className={styles.specimenNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.assetId ? (
                <A2UIAsset
                  assetId={item.assetId}
                  className={styles.specimenAsset}
                />
              ) : (
                <span className={styles.specimenMark} aria-hidden="true" />
              )}
              <strong>{item.label}</strong>
              {item.value ? <b>{item.value}</b> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </>
          );
          return item.artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <div key={`${item.label}-${index}`}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

function ManifestoFold({
  component,
  selectedOption,
  onSelect,
}: {
  component: A2UIComponent;
  selectedOption: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.manifestoFold}`}
    >
      {component.title ? <h2>{component.title}</h2> : null}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      <div className={styles.manifestoStack}>
        <span className={styles.manifestoPin} aria-hidden="true" />
        {component.options.map((option, index) => {
          const offset =
            (index - selectedOption + component.options.length) %
            component.options.length;
          return (
            <button
              type="button"
              key={option.label}
              data-active={selectedOption === index}
              onClick={() => onSelect(index)}
              style={
                {
                  "--sheet-index": index,
                  "--sheet-offset": offset,
                } as CSSProperties
              }
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{option.label}</strong>
              {selectedOption === index ? (
                <div>
                  <A2UIAsset
                    assetId={option.assetId}
                    className={styles.manifestoAsset}
                  />
                  <b>{option.summary}</b>
                  <small>{option.detail}</small>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TopicCompass({
  component,
  selectedOption,
  onSelect,
}: {
  component: A2UIComponent;
  selectedOption: number;
  onSelect: (index: number) => void;
}) {
  const selected = component.options[selectedOption] ?? component.options[0];
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.topicCompass}`}
    >
      {component.title ? <h2>{component.title}</h2> : null}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      <div className={styles.compassLayout}>
        <div
          className={styles.compassDial}
          style={
            {
              "--compass-turn": `${selectedOption * 90}deg`,
              "--compass-counter-turn": `${selectedOption * -90}deg`,
            } as CSSProperties
          }
        >
          {component.options.slice(0, 4).map((option, index) => (
            <button
              type="button"
              key={option.label}
              data-active={selectedOption === index}
              data-sector={index}
              onClick={() => onSelect(index)}
            >
              <span>{option.label}</span>
            </button>
          ))}
          <span className={styles.compassPin} aria-hidden="true" />
        </div>
        <div className={styles.compassSelection} aria-live="polite">
          <strong>{selected?.label}</strong>
          {selected?.assetId ? (
            <A2UIAsset
              assetId={selected.assetId}
              className={styles.compassAsset}
            />
          ) : null}
          <p>{selected?.summary}</p>
          <small>{selected?.detail}</small>
        </div>
      </div>
    </section>
  );
}

function NarrativeBotanicalMap() {
  return (
    <svg
      className={styles.narrativeBotanical}
      viewBox="0 0 1000 260"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path d="M18 139C154 118 245 157 370 139C505 119 615 160 744 137C837 121 908 126 982 139" />
      <path d="M128 130C111 111 92 89 70 62" />
      <path d="M405 143C402 166 397 185 388 211" />
      <path d="M714 140C735 111 760 86 792 62" />
      <path d="M866 139C879 164 896 187 922 211" />
      <path d="M109 108C91 105 79 96 74 82C91 84 102 92 109 108Z" />
      <path d="M401 174C418 166 431 167 441 177C425 184 412 183 401 174Z" />
      <path d="M747 103C732 98 723 88 721 74C735 78 745 87 747 103Z" />
      <path d="M889 178C873 173 863 163 861 149C876 153 886 163 889 178Z" />
      <circle cx="70" cy="62" r="4" />
      <circle cx="388" cy="211" r="4" />
      <circle cx="792" cy="62" r="4" />
      <circle cx="922" cy="211" r="4" />
      <path d="M20 142C159 122 246 161 371 142C506 123 614 163 745 140C838 124 908 130 980 142" />
    </svg>
  );
}

function ArtifactCornerSprig() {
  return (
    <svg
      className={styles.artifactCornerSprig}
      viewBox="0 0 170 100"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <PencilLineFilter id="a2ui-pencil-corner" seed={13} scale={1.3} />
      </defs>
      <g filter="url(#a2ui-pencil-corner)">
      <path d="M8 91C48 77 70 54 91 30C106 14 129 8 162 6" />
      <path d="M42 74C28 71 20 64 17 53C30 54 40 61 42 74Z" />
      <path d="M62 60C48 55 42 46 42 35C55 39 63 48 62 60Z" />
      <path d="M85 34C75 25 72 15 77 5C88 13 91 23 85 34Z" />
      <path d="M103 22C110 9 120 4 132 5C127 17 117 23 103 22Z" />
      <path d="M124 13C135 3 146 1 157 6C148 16 137 18 124 13Z" />
      </g>
    </svg>
  );
}

function ArtifactPaperOutline() {
  return (
    <svg
      className={styles.artifactPaperOutline}
      viewBox="0 0 1000 700"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <PencilLineFilter id="a2ui-pencil-border" seed={8} scale={2.5} />
      </defs>
      <g filter="url(#a2ui-pencil-border)">
        <path d="M13 18C241 7 451 17 641 12C778 9 892 17 986 11C994 179 986 345 992 487C997 576 988 642 984 687C741 693 516 684 337 691C194 697 92 688 12 684C7 507 17 381 9 247C4 151 14 75 13 18Z" />
        <path d="M18 21C203 13 386 21 566 17C735 13 872 21 982 16C987 171 981 335 987 479C991 571 984 634 980 681C759 686 547 679 352 685C207 690 101 683 17 679C12 506 22 374 14 246C9 151 18 75 18 21Z" />
      </g>
    </svg>
  );
}

function BotanicalFactMap() {
  return (
    <svg
      className={styles.artifactBotanical}
      viewBox="0 0 128 194"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <PencilLineFilter id="a2ui-pencil-map" seed={21} scale={1.1} />
      </defs>
      <g filter="url(#a2ui-pencil-map)">
      <path
        d="M64 190C48 170 77 151 61 126C45 102 77 83 65 60C57 44 65 24 83 7"
        pathLength="1"
      />
      <path d="M62 128C45 125 35 115 32 101C46 103 57 112 62 128Z" />
      <path d="M66 100C82 96 92 86 97 72C83 74 72 83 66 100Z" />
      <path d="M64 157C49 154 39 146 35 134C48 135 59 143 64 157Z" />
      <path d="M68 56C83 51 93 42 96 29C83 31 73 40 68 56Z" />
      <path d="M64 58C52 48 42 48 33 54C24 61 14 62 0 54" />
      <path d="M66 61C78 49 89 49 99 55C108 61 117 60 128 53" />
      <path d="M63 148C51 139 41 140 32 147C23 155 13 157 0 150" />
      <path d="M66 151C78 139 89 140 99 146C109 153 118 155 128 150" />
      <path d="M35 53C29 44 23 42 17 45C22 52 28 56 35 53Z" />
      <path d="M98 55C104 46 111 44 118 47C113 54 106 58 98 55Z" />
      <path d="M32 147C25 139 19 138 13 142C19 149 25 152 32 147Z" />
      <path d="M99 146C105 137 112 136 119 140C114 147 107 150 99 146Z" />
      </g>
    </svg>
  );
}

function PencilLineFilter({
  id,
  seed,
  scale,
}: {
  id: string;
  seed: number;
  scale: number;
}) {
  return (
    <filter id={id} x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.018 0.085"
        numOctaves="2"
        seed={seed}
        result="pencilNoise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="pencilNoise"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  );
}

function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => {
            const internalPath = href ? normalizeA2UIPath(href) : null;
            if (internalPath) {
              return <Link href={internalPath}>{children}</Link>;
            }
            if (href?.startsWith("/")) return <span>{children}</span>;
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          p: ({ ...props }) => <p {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function artifactLabel(artifact: Artifact): string {
  if (artifact.kind === "work") return artifact.data.company;
  return artifact.data.title;
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^[“"]+|[”"]+$/g, "").trim();
}

function stripMarkdownLinks(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function A2UILoading({ question }: { question: string }) {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Finding the relevant work",
    "Choosing the clearest structure",
    "Assembling the answer",
  ];

  useEffect(() => {
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, phases.length - 1)),
      1350,
    );
    return () => clearInterval(timer);
  }, [phases.length]);

  return (
    <>
      <h1 className={styles.question}>{question}</h1>
      <article className={`${styles.answerSurface} ${styles.loading}`}>
        <div className={styles.loadingLead} />
        <div className={styles.loadingLeadShort} />
        <div className={styles.loadingComponent} data-phase={phase}>
          <span><i /></span>
          <span><i /></span>
          <span><i /></span>
        </div>
        <p key={phase}>{phases[phase]}</p>
      </article>
    </>
  );
}

function HistoryRail({
  turns,
  activeId,
  onSelect,
  onNewConversation,
  suggestions,
  onAsk,
}: {
  turns: A2UITurn[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  suggestions: string[];
  onAsk: (prompt: string) => void;
}) {
  return (
    <aside className={styles.historyRail} aria-label="Conversation">
      <div className={styles.historyList}>
        {[...turns].reverse().map((turn) => (
          <button
            type="button"
            key={turn.id}
            data-active={turn.id === activeId}
            onClick={() => onSelect(turn.id)}
          >
            <span aria-hidden="true" />
            <p>{turn.question}</p>
          </button>
        ))}
      </div>
      <SuggestionPills suggestions={suggestions} onAsk={onAsk} />
      <button
        type="button"
        className={styles.newConversation}
        onClick={onNewConversation}
      >
        New conversation
      </button>
    </aside>
  );
}

function MobileHistory({
  turns,
  activeId,
  onSelect,
  onClose,
  onNewConversation,
  suggestions,
  onAsk,
}: {
  turns: A2UITurn[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onNewConversation: () => void;
  suggestions: string[];
  onAsk: (prompt: string) => void;
}) {
  return (
    <aside className={styles.mobileHistory} aria-label="Conversation">
      <button type="button" onClick={onClose} aria-label="Close history">
        <X aria-hidden="true" />
      </button>
      <div className={styles.mobileHistoryList}>
        {[...turns].reverse().map((turn) => (
          <button
            type="button"
            key={turn.id}
            data-active={turn.id === activeId}
            onClick={() => onSelect(turn.id)}
          >
            <span aria-hidden="true" />
            <p>{turn.question}</p>
          </button>
        ))}
      </div>
      <SuggestionPills suggestions={suggestions} onAsk={onAsk} />
      <button type="button" onClick={onNewConversation}>
        New conversation
      </button>
    </aside>
  );
}

function SuggestionPills({
  suggestions,
  onAsk,
}: {
  suggestions: string[];
  onAsk: (prompt: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className={styles.suggestionPills} aria-label="Suggested questions">
      {suggestions.map((suggestion) => (
        <button
          type="button"
          key={suggestion}
          onClick={() => onAsk(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
