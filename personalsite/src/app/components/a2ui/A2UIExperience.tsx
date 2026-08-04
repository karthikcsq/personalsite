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
import {
  AnimatePresence,
  motion,
  Reorder,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Copy,
  GripVertical,
  History,
  Pencil,
  Quote as QuoteIcon,
  X,
} from "lucide-react";
import type { Artifact } from "@/app/components/ChatArtifact";
import {
  A2UI_VISUAL_ASSETS,
  galleryCategoryFromAssetId,
  isA2UIVisualAssetId,
  matchA2UIVisualAsset,
} from "@/a2ui/assetCatalog";
import {
  artifactPath,
  componentNavigationPath,
  normalizeA2UIPath,
  type A2UIAction,
  type A2UIComponent,
  type A2UIComponentType,
  type A2UIComposition,
  type A2UIDocument,
} from "@/a2ui/protocol";
import {
  arrangementForComponent,
  compositionCandidates,
  mixPresentationSeed,
  presentA2UIComponent,
  surfaceFamilyForComponent,
  type A2UIItemArrangement,
  type A2UISurfaceFamily,
} from "@/a2ui/presentation";
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

export type QueuedPrompt = {
  id: string;
  text: string;
};

type Props = {
  turns: A2UITurn[];
  onAsk: (prompt: string) => void;
  onNewConversation: () => void;
  suggestions: string[];
  queuedPrompts: QueuedPrompt[];
  editingQueueIndex: number;
  onEditQueued: (index: number) => void;
  onRemoveQueued: (index: number) => void;
  onReorderQueued: (orderedIds: string[]) => void;
  footer: ReactNode;
};

type A2UIVisualVariant = "folio" | "diagram" | "margin";

const A2UI_VISUAL_VARIANTS = [
  "folio",
  "diagram",
  "margin",
] as const satisfies readonly A2UIVisualVariant[];

function visualVariantForSeed(
  seed: number,
  avoided: readonly A2UIVisualVariant[] = [],
): A2UIVisualVariant {
  const available = A2UI_VISUAL_VARIANTS.filter(
    (variant) => !avoided.includes(variant),
  );
  const pool = available.length > 0 ? available : A2UI_VISUAL_VARIANTS;
  return pool[(seed >>> 0) % pool.length] ?? "folio";
}

function recentVisualVariantsForTurns(
  turns: A2UITurn[],
  activeTurnIndex: number,
): A2UIVisualVariant[] {
  const variants: A2UIVisualVariant[] = [];

  for (let turnIndex = 0; turnIndex < activeTurnIndex; turnIndex += 1) {
    const document = turns[turnIndex]?.document;
    if (!document) continue;
    const seed = document.presentationSeed ?? turnIndex;
    const previous = variants.at(-1);
    variants.push(
      visualVariantForSeed(
        mixPresentationSeed(seed, "document:visual"),
        previous ? [previous] : [],
      ),
    );
  }

  return variants.slice(-1);
}

function recentSurfaceFamiliesForTurns(
  turns: A2UITurn[],
  activeTurnIndex: number,
): A2UISurfaceFamily[] {
  const surfacesByTurn: A2UISurfaceFamily[][] = [];

  for (let turnIndex = 0; turnIndex < activeTurnIndex; turnIndex += 1) {
    const document = turns[turnIndex]?.document;
    if (!document) {
      surfacesByTurn.push([]);
      continue;
    }

    const recent = surfacesByTurn
      .slice(Math.max(0, turnIndex - 2), turnIndex)
      .flat();
    const seed = document.presentationSeed ?? turnIndex;
    const presented = [document.primary, ...document.supporting].map(
      (component, index) => {
        const slot = index === 0 ? "primary" : `supporting-${index - 1}`;
        return {
          component: presentA2UIComponent(component, seed, slot),
          slot,
        };
      },
    );
    const used = [...recent];
    const surfaces = presented.map(({ component, slot }) => {
      const surface = surfaceFamilyForComponent(component, seed, slot, used);
      used.push(surface);
      return surface;
    });
    surfacesByTurn.push(surfaces);
  }

  return surfacesByTurn
    .slice(Math.max(0, activeTurnIndex - 2), activeTurnIndex)
    .flat();
}

export function A2UIExperience({
  turns,
  onAsk,
  onNewConversation,
  suggestions,
  queuedPrompts,
  editingQueueIndex,
  onEditQueued,
  onRemoveQueued,
  onReorderQueued,
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
  const recentSurfaceFamilies = recentSurfaceFamiliesForTurns(
    turns,
    activeTurnIndex,
  );
  const recentVisualVariants = recentVisualVariantsForTurns(
    turns,
    activeTurnIndex,
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
        queuedPrompts={queuedPrompts}
        editingQueueIndex={editingQueueIndex}
        onEditQueued={onEditQueued}
        onRemoveQueued={onRemoveQueued}
        onReorderQueued={onReorderQueued}
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
          queuedPrompts={queuedPrompts}
          editingQueueIndex={editingQueueIndex}
          onEditQueued={onEditQueued}
          onRemoveQueued={onRemoveQueued}
          onReorderQueued={onReorderQueued}
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
                recentSurfaceFamilies={recentSurfaceFamilies}
                recentVisualVariants={recentVisualVariants}
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
  recentSurfaceFamilies,
  recentVisualVariants,
  onAsk,
}: {
  question: string;
  content: string;
  document?: A2UIDocument;
  artifacts: Artifact[];
  compositionTurn: number;
  recentSurfaceFamilies: A2UISurfaceFamily[];
  recentVisualVariants: A2UIVisualVariant[];
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
  const presentationSeed = uiDocument.presentationSeed ?? compositionTurn;
  const presentedPrimary = presentA2UIComponent(
    uiDocument.primary,
    presentationSeed,
    "primary",
  );
  const presentedSupporting = uiDocument.supporting.map((component, index) =>
    presentA2UIComponent(
      component,
      presentationSeed,
      `supporting-${index}`,
    ),
  );
  const presentedComponents = [presentedPrimary, ...presentedSupporting];
  const primarySurface = surfaceFamilyForComponent(
    presentedPrimary,
    presentationSeed,
    "primary",
    recentSurfaceFamilies,
  );
  const usedSurfaceFamilies: A2UISurfaceFamily[] = [
    ...recentSurfaceFamilies,
    primarySurface,
  ];
  const supportingSurfaces = presentedSupporting.map((component, index) => {
    const surface = surfaceFamilyForComponent(
      component,
      presentationSeed,
      `supporting-${index}`,
      usedSurfaceFamilies,
    );
    usedSurfaceFamilies.push(surface);
    return surface;
  });
  const surfaceByComponentId = new Map<string, A2UISurfaceFamily>([
    [presentedPrimary.id, primarySurface],
    ...presentedSupporting.map(
      (component, index) =>
        [component.id, supportingSurfaces[index] ?? "default"] as const,
    ),
  ]);
  const sourceOwningComponentTypes = new Set<A2UIComponentType>([
    "artifact_focus",
    "paper_dossier",
    "research_map",
    "timeline",
    "steps",
    "fold_timeline",
    "field_notebook",
    "system_blueprint",
    "evidence_stack",
    "essay_margin",
    "specimen_board",
    "visual_mosaic",
  ]);
  const referencedSourceArtifactIds = Array.from(
    new Set(
      presentedComponents.flatMap((component) =>
        componentSourceArtifactIds(component, artifactMap),
      ),
    ),
  );
  const componentOwnedSourceArtifactIds = new Set(
    presentedComponents.flatMap((component) => {
      const surface = surfaceByComponentId.get(component.id) ?? "default";
      if (surface === "default" && !sourceOwningComponentTypes.has(component.type)) {
        return [];
      }
      return componentSourceArtifactIds(component, artifactMap);
    }),
  );
  const fallbackSourceArtifactIds = referencedSourceArtifactIds.filter(
    (artifactId) => !componentOwnedSourceArtifactIds.has(artifactId),
  );
  const automaticallyBacklinkedPaths = new Set(
    referencedSourceArtifactIds.flatMap((artifactId) => {
      const path = artifactPath(artifactId);
      return path ? [path] : [];
    }),
  );
  const componentNavigationPaths = new Map(
    presentedComponents.flatMap((component) => {
      const path = componentNavigationPath(component, uiDocument.actions);
      return path ? [[component.id, path] as const] : [];
    }),
  );
  const consumedNavigationPaths = new Set(componentNavigationPaths.values());
  const modelCompositionOptions =
    uiDocument.compositionOptions?.length > 0
      ? uiDocument.compositionOptions
      : (["stacked"] satisfies A2UIComposition[]);
  const visualVariant = visualVariantForSeed(
    mixPresentationSeed(presentationSeed, "document:visual"),
    recentVisualVariants,
  );
  const embeddedQuote =
    presentedPrimary.type === "essay_margin"
      ? presentedSupporting.find(
          (component) => component.type === "quote_focus",
        )
      : undefined;
  const supportingComponents = embeddedQuote
    ? presentedSupporting.filter(
        (component) => component.id !== embeddedQuote.id,
      )
    : presentedSupporting;
  const baseCompositionOptions = compositionCandidates(
    presentedPrimary,
    modelCompositionOptions,
    supportingComponents,
  );
  const hasAuthoredSurface = [primarySurface, ...supportingSurfaces].some(
    (surface) => surface !== "default",
  );
  const authoredCompositionOptions = baseCompositionOptions.filter(
    (option) => option === "primary_top" || option === "stacked",
  );
  const safeCompositionOptions =
    hasAuthoredSurface && authoredCompositionOptions.length > 0
      ? authoredCompositionOptions
      : baseCompositionOptions;
  const composition: A2UIComposition =
    supportingComponents.length > 0
      ? (
          safeCompositionOptions[
            mixPresentationSeed(presentationSeed, "document:composition") %
              safeCompositionOptions.length
          ] ??
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
        !(actionPath && automaticallyBacklinkedPaths.has(actionPath)) &&
        !(
          action.intent === "open_artifact" &&
          referencedSourceArtifactIds.includes(action.payload)
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
        data-visual={visualVariant}
      >
        <div className={styles.reveal} data-visible={revealStage >= 1}>
          <Markdown className={styles.lead}>{uiDocument.lead}</Markdown>
        </div>

        <div
          className={`${styles.primary} ${styles.reveal}`}
          data-visible={revealStage >= 2}
        >
          <A2UIBlock
            component={presentedPrimary}
            embeddedQuote={embeddedQuote}
            surfaceFamily={primarySurface}
            visualVariant={visualVariant}
            arrangement={arrangementForComponent(
              presentedPrimary,
              presentationSeed,
              "primary",
            )}
            presentationSeed={presentationSeed}
            navigationPath={componentNavigationPaths.get(presentedPrimary.id)}
            artifactMap={artifactMap}
            onOpen={(id) => {
              const path = artifactPath(id);
              if (path) router.push(path);
            }}
          />
        </div>

        {supportingComponents.length > 0 ? (
          <div
            className={`${styles.supporting} ${styles.reveal}`}
            data-visible={revealStage >= 3}
          >
            {supportingComponents.map((component, index) => (
              <A2UIBlock
                key={component.id}
                component={component}
                surfaceFamily={supportingSurfaces[index] ?? "default"}
                visualVariant={visualVariant}
                arrangement={arrangementForComponent(
                  component,
                  presentationSeed,
                  `supporting-${index}`,
                )}
                presentationSeed={presentationSeed}
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

        {fallbackSourceArtifactIds.length > 0 ? (
          <div className={styles.reveal} data-visible={revealStage >= 3}>
            <ArtifactSourceStrip
              artifactIds={fallbackSourceArtifactIds}
              artifactMap={artifactMap}
              onOpen={(id) => {
                const path = artifactPath(id);
                if (path) router.push(path);
              }}
            />
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
  embeddedQuote,
  surfaceFamily,
  visualVariant,
  arrangement,
  presentationSeed,
  navigationPath,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  embeddedQuote?: A2UIComponent;
  surfaceFamily: A2UISurfaceFamily;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  presentationSeed: number;
  navigationPath?: string;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const [selectedOption, setSelectedOption] = useState(
    component.options.length > 0
      ? mixPresentationSeed(
          presentationSeed,
          `${component.id}:selected-option`,
        ) % component.options.length
      : 0,
  );
  const selected = component.options[selectedOption];
  const quoteArtifacts = component.quoteIds.flatMap((quoteId) => {
    const artifact = artifactMap.get(quoteId.replace(/^quote:/, ""));
    return artifact?.annotation ? [artifact] : [];
  });

  const heading = component.title ? <h2>{component.title}</h2> : null;

  if (
    navigationPath &&
    component.type === "narrative" &&
    component.items.length === 0
  ) {
    return (
      <Link
        id={`a2ui-${component.id}`}
        href={navigationPath}
        className={styles.navigationComponent}
        data-variant={visualVariant}
        data-arrangement={arrangement}
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
      <QuotePaper
        component={component}
        quoteArtifacts={quoteArtifacts}
        visualVariant={visualVariant}
        arrangement={arrangement}
      />
    );
  }

  if (surfaceFamily === "field_map") {
    return (
      <ConnectedFieldMap
        component={component}
        visualVariant={visualVariant}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (surfaceFamily === "archive_index") {
    return (
      <ArchiveIndex
        component={component}
        visualVariant={visualVariant}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (surfaceFamily === "essay_constellation") {
    return (
      <EssayConstellation
        component={component}
        embeddedQuote={embeddedQuote}
        visualVariant={visualVariant}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (surfaceFamily === "project_workbench") {
    return (
      <ProjectWorkbench
        component={component}
        visualVariant={visualVariant}
        presentationSeed={presentationSeed}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "research_map") {
    return (
      <ResearchMap
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "fold_timeline") {
    return (
      <FoldTimeline
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "field_notebook") {
    return (
      <FieldNotebook
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "system_blueprint") {
    return (
      <SystemBlueprint
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "evidence_stack") {
    return (
      <EvidenceStack
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "essay_margin") {
    return (
      <EssayMargin
        component={component}
        embeddedQuote={embeddedQuote}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "specimen_board") {
    return (
      <SpecimenBoard
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "visual_mosaic") {
    return (
      <VisualMosaic
        component={component}
        surfaceFamily={surfaceFamily}
        visualVariant={visualVariant}
        arrangement={arrangement}
        presentationSeed={presentationSeed}
        artifactMap={artifactMap}
        onOpen={onOpen}
      />
    );
  }

  if (component.type === "manifesto_fold" && component.options.length > 0) {
    return (
      <ManifestoFold
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
        selectedOption={selectedOption}
        onSelect={setSelectedOption}
      />
    );
  }

  if (component.type === "topic_compass" && component.options.length > 0) {
    return (
      <ManifestoFold
        component={component}
        visualVariant={visualVariant}
        arrangement={arrangement}
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
        data-variant={visualVariant}
        data-arrangement={arrangement}
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
        data-variant={visualVariant}
        data-arrangement={arrangement}
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
    const timelineCount = Math.min(component.items.length, 6);
    const sharedArtifactId = sharedArtifactIdFor(component);
    const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
    const timelineRoute =
      [
        "",
        "M65 179",
        "M65 179C205 153 354 157 500 179",
        "M65 179C296 143 708 147 935 179",
        "M65 179C296 143 708 147 935 179C995 187 995 414 935 430",
        "M65 179C296 143 708 147 935 179C995 187 995 414 935 430C796 454 648 453 500 430",
        "M65 179C296 143 708 147 935 179C995 187 995 414 935 430C704 466 292 462 65 430",
      ][timelineCount] ?? "";
    const timelineNodes = [
      [65, 179],
      [500, 179],
      [935, 179],
      [935, 430],
      [500, 430],
      [65, 430],
    ].slice(0, timelineCount);
    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.timelineComponent}`}
        data-variant={visualVariant}
        data-arrangement={arrangement}
      >
        {heading}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        <div className={styles.timelineCanvas} data-count={timelineCount}>
          <svg
            className={styles.timelineRoute}
            viewBox={`0 0 1000 ${timelineCount <= 3 ? 310 : 620}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className={styles.timelineRouteGhost} d={timelineRoute} />
            <path d={timelineRoute} />
            {timelineNodes.map(([cx, cy], index) => (
              <circle key={`${cx}-${cy}-${index}`} cx={cx} cy={cy} r="7" />
            ))}
          </svg>
          <ol data-count={timelineCount}>
            {component.items.map((item, index) => {
              const artifactId = itemArtifactIds[index] ?? "";
              return (
                <li key={`${item.label}-${index}`}>
                  {artifactId ? (
                    <button
                      type="button"
                      className={styles.timelineStageHit}
                      aria-label={sourceActionLabel(artifactId, artifactMap)}
                      onClick={() => onOpen(artifactId)}
                    />
                  ) : null}
                  <span className={styles.timelineMarker}>
                    {component.type === "steps" ? (
                      index + 1
                    ) : visualVariant === "diagram" ? (
                      <span aria-hidden="true" />
                    ) : (
                      <Clock3 aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    {item.value ? <small>{item.value}</small> : null}
                    <p>{item.detail}</p>
                    <ItemSourceCue artifactId={artifactId} artifactMap={artifactMap} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        {sharedArtifactId ? (
          <button
            type="button"
            className={styles.sharedSourceAction}
            onClick={() => onOpen(sharedArtifactId)}
          >
            {sourceActionLabel(sharedArtifactId, artifactMap)}
            <ArrowRight aria-hidden="true" />
          </button>
        ) : null}
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
          data-variant={visualVariant}
          data-arrangement={arrangement}
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
            {`See ${artifactLabel(single.artifact)}`}
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      );
    }

    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.artifactComponent} ${styles.multiArtifact}`}
        data-variant={visualVariant}
        data-arrangement={arrangement}
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
                    {`See ${artifactLabel(artifact)}`}
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
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      {heading}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      {component.items.length > 0 ? (
        <div
          className={styles.narrativeItems}
          data-count={Math.min(component.items.length, 4)}
        >
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

function QuotePaper({
  component,
  quoteArtifacts,
  visualVariant,
  arrangement = "balanced",
  className = "",
}: {
  component: A2UIComponent;
  quoteArtifacts: Artifact[];
  visualVariant: A2UIVisualVariant;
  arrangement?: A2UIItemArrangement;
  className?: string;
}) {
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.quoteComponent} ${className}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
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
          {component.title ? <h2>{component.title}</h2> : null}
          <Markdown>{component.body}</Markdown>
        </>
      )}
    </section>
  );
}

function A2UIAsset({
  assetId,
  className,
}: {
  assetId: string;
  className?: string;
}) {
  if (!isA2UIVisualAssetId(assetId)) return null;
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

function uniqueVisualAssetsForItems(
  items: A2UIComponent["items"],
): Array<string | undefined> {
  const used = new Set<string>();
  return items.map((item) => {
    const assetId =
      (isA2UIVisualAssetId(item.assetId) ? item.assetId : undefined) ??
      matchA2UIVisualAsset(
        `${item.label} ${item.value ?? ""} ${item.detail ?? ""} ${
          item.artifactId ?? ""
        }`,
      );
    if (!assetId || used.has(assetId)) return undefined;
    used.add(assetId);
    return assetId;
  });
}

function componentArtifactIds(component: A2UIComponent): string[] {
  return [
    ...component.artifactIds,
    ...component.items.map((item) => item.artifactId),
  ].filter(
    (id, index, all): id is string =>
      Boolean(id) && all.indexOf(id) === index,
  );
}

function componentSourceArtifactIds(
  component: A2UIComponent,
  artifactMap: Map<string, Artifact>,
): string[] {
  const seenPaths = new Set<string>();
  return [
    ...componentArtifactIds(component),
    ...component.quoteIds.map((quoteId) => quoteId.replace(/^quote:/, "")),
  ].filter((artifactId) => {
    if (!artifactMap.has(artifactId)) return false;
    const path = artifactPath(artifactId);
    if (!path || seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
}

function normalizedSourceMatchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Sources are host-owned. Prefer an explicit item reference, then recover a
 * missing reference from the artifact label, and finally use positional
 * alignment when the model produced one source per item. A source is assigned
 * only once so repeated cards never repeat the same backlink.
 */
function itemSourceArtifactIds(
  component: A2UIComponent,
  artifactMap: Map<string, Artifact>,
): string[] {
  const sourceArtifactIds = componentSourceArtifactIds(component, artifactMap);
  if (sourceArtifactIds.length <= 1) {
    return component.items.map(() => "");
  }

  const available = new Set(sourceArtifactIds);
  const assignments = component.items.map((item) => {
    if (!item.artifactId || !available.has(item.artifactId)) return "";
    available.delete(item.artifactId);
    return item.artifactId;
  });

  assignments.forEach((artifactId, index) => {
    if (artifactId) return;
    const item = component.items[index];
    const itemText = normalizedSourceMatchText(
      `${item.label} ${item.value} ${item.detail}`,
    );
    const matchingArtifactIds = [...available].filter((candidateId) => {
      const artifact = artifactMap.get(candidateId);
      if (!artifact) return false;
      const label = normalizedSourceMatchText(artifactLabel(artifact));
      return label.length >= 4 && itemText.includes(label);
    });
    if (matchingArtifactIds.length !== 1) return;
    assignments[index] = matchingArtifactIds[0];
    available.delete(matchingArtifactIds[0]);
  });

  const emptyIndexes = assignments.flatMap((artifactId, index) =>
    artifactId ? [] : [index],
  );
  if (emptyIndexes.length === available.size) {
    const remainingArtifactIds = [...available];
    emptyIndexes.forEach((itemIndex, index) => {
      assignments[itemIndex] = remainingArtifactIds[index] ?? "";
    });
  }

  return assignments;
}

function ItemSourceCue({
  artifactId,
  artifactMap,
}: {
  artifactId: string;
  artifactMap: Map<string, Artifact>;
}) {
  if (!artifactId) return null;
  return (
    <span className={styles.itemSourceCue}>
      {sourceActionLabel(artifactId, artifactMap)}
      <ArrowRight aria-hidden="true" />
    </span>
  );
}

function ArtifactSourceStrip({
  artifactIds,
  artifactMap,
  onOpen,
}: {
  artifactIds: string[];
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  if (artifactIds.length === 0) return null;

  return (
    <nav className={styles.artifactSourceStrip} aria-label="Sources">
      {artifactIds.map((artifactId) => (
        <button
          type="button"
          key={artifactId}
          onClick={() => onOpen(artifactId)}
        >
          {sourceActionLabel(artifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}

function sharedArtifactIdFor(component: A2UIComponent): string {
  const artifactIds = componentArtifactIds(component);
  return artifactIds.length === 1 ? artifactIds[0] : "";
}

function itemOwnsArtifactAction(
  component: A2UIComponent,
  itemIndex: number,
  sharedArtifactId: string,
): boolean {
  const artifactId = component.items[itemIndex]?.artifactId;
  if (!artifactId || sharedArtifactId) return false;
  return (
    component.items.findIndex((item) => item.artifactId === artifactId) ===
    itemIndex
  );
}

function ConnectedFieldMap({
  component,
  visualVariant,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
  const visualAssets = uniqueVisualAssetsForItems(component.items);

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.connectedFieldMap}`}
      data-variant={visualVariant}
      data-count={Math.min(component.items.length, 6)}
      data-surface="field-map"
    >
      <header className={styles.fieldMapHeading}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </header>
      <div className={styles.fieldMapCanvas}>
        <svg
          className={styles.fieldMapRoute}
          viewBox="0 0 1200 520"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M48 295C147 155 250 160 338 281C423 397 525 386 610 248C706 94 807 126 884 279C952 414 1052 414 1152 236" />
          <path d="M48 302C147 162 250 167 338 288C423 404 525 393 610 255C706 101 807 133 884 286C952 421 1052 421 1152 243" />
        </svg>
        <ol>
          {component.items.map((item, index) => {
            const assetId = visualAssets[index];
            const artifactId = itemArtifactIds[index] ?? "";
            const content = (
              <>
                <span className={styles.fieldMapNode} aria-hidden="true" />
                {assetId ? (
                  <A2UIAsset assetId={assetId} className={styles.fieldMapAsset} />
                ) : (
                  <span className={styles.fieldMapIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                )}
                <span className={styles.fieldMapCopy}>
                  <strong>{item.label}</strong>
                  {item.value ? <b>{item.value}</b> : null}
                  {item.detail ? <small>{item.detail}</small> : null}
                  <ItemSourceCue artifactId={artifactId} artifactMap={artifactMap} />
                </span>
              </>
            );
            return (
              <li key={`${item.label}-${index}`}>
                {artifactId ? (
                  <button type="button" onClick={() => onOpen(artifactId)}>
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function ArchiveIndex({
  component,
  visualVariant,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
  const visualAssets = uniqueVisualAssetsForItems(component.items);

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.archiveIndex}`}
      data-variant={visualVariant}
      data-count={Math.min(component.items.length, 6)}
      data-surface="archive-index"
    >
      <header className={styles.archiveHeading}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </header>
      <ol>
        {component.items.map((item, index) => {
          const assetId = visualAssets[index];
          const artifactId = itemArtifactIds[index] ?? "";
          const content = (
            <>
              <span className={styles.archiveNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.archiveMark}>
                {assetId ? <A2UIAsset assetId={assetId} /> : <i aria-hidden="true" />}
              </span>
              <span className={styles.archiveIdentity}>
                <strong>{item.label}</strong>
                {item.value ? <b>{item.value}</b> : null}
              </span>
              <span className={styles.archiveDetail}>
                {item.detail ? <small>{item.detail}</small> : null}
                <ItemSourceCue artifactId={artifactId} artifactMap={artifactMap} />
              </span>
            </>
          );
          return (
            <li
              key={`${item.label}-${index}`}
              data-current={index === component.items.length - 1}
            >
              {artifactId ? (
                <button type="button" onClick={() => onOpen(artifactId)}>
                  {content}
                </button>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function EssayConstellation({
  component,
  embeddedQuote,
  visualVariant,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  embeddedQuote?: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
  const quoteIds = [
    ...component.quoteIds,
    ...(embeddedQuote?.quoteIds ?? []),
  ];
  const quoteArtifact = quoteIds.flatMap((quoteId) => {
    const artifact = artifactMap.get(quoteId.replace(/^quote:/, ""));
    return artifact?.annotation ? [artifact] : [];
  })[0];

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.essayConstellation}`}
      data-variant={visualVariant}
      data-count={Math.min(component.items.length, 4)}
      data-surface="essay-constellation"
    >
      <div className={styles.constellationThesis}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div
        className={styles.constellationNotes}
        data-count={Math.min(component.items.length, 4)}
      >
        <svg viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
          <path d="M466 310C380 174 281 124 145 105" />
          <path d="M466 310C606 194 704 146 852 118" />
          <path d="M466 310C347 414 251 474 116 505" />
          <path d="M466 310C617 399 719 466 882 507" />
          <circle cx="466" cy="310" r="9" />
        </svg>
        {component.items.map((item, index) => {
          const artifactId = itemArtifactIds[index] ?? "";
          const content = (
            <>
              <span>{item.label}</span>
              {item.value ? <strong>{item.value}</strong> : null}
              {item.detail ? <small>{item.detail}</small> : null}
              <ItemSourceCue artifactId={artifactId} artifactMap={artifactMap} />
            </>
          );
          return artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(artifactId)}
            >
              {content}
            </button>
          ) : (
            <div key={`${item.label}-${index}`}>{content}</div>
          );
        })}
      </div>
      {quoteArtifact ? (
        <blockquote className={styles.constellationQuote}>
          <QuoteIcon aria-hidden="true" />
          <p>{stripWrappingQuotes(quoteArtifact.annotation!)}</p>
          <footer>{artifactLabel(quoteArtifact)}</footer>
        </blockquote>
      ) : null}
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function ProjectWorkbench({
  component,
  visualVariant,
  presentationSeed,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  presentationSeed: number;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
  const visualAssets = uniqueVisualAssetsForItems(component.items);
  const layoutSeed = mixPresentationSeed(
    presentationSeed,
    `${component.id}:workbench-layout`,
  );
  const layoutCandidates =
    component.items.length <= 1
      ? [2]
      : component.items.length === 2
        ? [0, 2]
        : component.items.length === 3
          ? [0, 1]
          : [0, 1, 2];
  const layout =
    layoutCandidates[layoutSeed % layoutCandidates.length] ?? 0;

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.projectWorkbench}`}
      data-variant={visualVariant}
      data-layout={layout}
      data-count={Math.min(component.items.length, 5)}
      data-surface="project-workbench"
    >
      <header className={styles.workbenchHeading}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </header>
      <div className={styles.workbenchFragments}>
        {component.items.map((item, index) => {
          const assetId = visualAssets[index];
          const artifactId = itemArtifactIds[index] ?? "";
          const content = (
            <>
              {assetId ? <A2UIAsset assetId={assetId} /> : null}
              <span>{item.label}</span>
              {item.value ? <strong>{item.value}</strong> : null}
              {item.detail ? <small>{item.detail}</small> : null}
              <ItemSourceCue artifactId={artifactId} artifactMap={artifactMap} />
            </>
          );
          return (
            <article
              key={`${item.label}-${index}`}
              data-fragment={index % 4}
            >
              {artifactId ? (
                <button type="button" onClick={() => onOpen(artifactId)}>
                  {content}
                </button>
              ) : (
                <div>{content}</div>
              )}
            </article>
          );
        })}
      </div>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function ResearchMap({
  component,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.researchMap}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
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
          const ownsArtifactAction = itemOwnsArtifactAction(
            component,
            index,
            sharedArtifactId,
          );
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
              {item.artifactId && ownsArtifactAction ? (
                <span className={styles.researchStageAction}>
                  {sourceActionLabel(item.artifactId, artifactMap)}
                  <ArrowRight aria-hidden="true" />
                </span>
              ) : null}
            </>
          );
          return item.artifactId && ownsArtifactAction ? (
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
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function FoldTimeline({
  component,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const count = Math.max(component.items.length, 1);
  const isDense = count > 4;
  const sharedArtifactId = sharedArtifactIdFor(component);
  const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.foldTimeline}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      {component.title ? <h2>{component.title}</h2> : null}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      <div
        className={`${styles.foldStrip} ${isDense ? styles.foldStripDense : ""} ${count === 5 ? styles.foldStripFive : ""}`}
        data-count={count}
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
          const artifactId = itemArtifactIds[index] ?? "";
          const content = (
            <>
              <A2UIAsset
                assetId={item.assetId}
                className={styles.foldAsset}
              />
              {item.value ? <span>{item.value}</span> : null}
              <strong>{item.label}</strong>
              {item.detail ? <small>{item.detail}</small> : null}
              {artifactId ? (
                <i>
                  {sourceActionLabel(artifactId, artifactMap)}
                  <ArrowRight aria-hidden="true" />
                </i>
              ) : null}
            </>
          );
          return artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(artifactId)}
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
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function FieldNotebook({
  component,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const heroAsset = component.items.find((item) => item.assetId)?.assetId ?? "";
  const sharedArtifact = sharedArtifactId
    ? artifactMap.get(sharedArtifactId)
    : undefined;
  const notebookTitle =
    component.title || (sharedArtifact ? artifactLabel(sharedArtifact) : "");

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.fieldNotebook}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      <div className={styles.notebookFold} aria-hidden="true" />
      <div className={styles.notebookPage}>
        {notebookTitle ? <h2>{notebookTitle}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
        {heroAsset ? (
          <A2UIAsset assetId={heroAsset} className={styles.notebookAsset} />
        ) : null}
        {sharedArtifactId ? (
          <button
            type="button"
            className={styles.notebookAction}
            onClick={() => onOpen(sharedArtifactId)}
          >
            {sourceActionLabel(sharedArtifactId, artifactMap)}
            <ArrowRight aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className={styles.notebookAnnotations}>
        {component.items.map((item, index) => {
          const ownsArtifactAction = itemOwnsArtifactAction(
            component,
            index,
            sharedArtifactId,
          );
          const content = (
            <>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.label}</strong>
              {item.value ? <b>{item.value}</b> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </>
          );
          return item.artifactId && ownsArtifactAction ? (
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

function SystemBlueprint({
  component,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.systemBlueprint}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
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
          const ownsArtifactAction = itemOwnsArtifactAction(
            component,
            index,
            sharedArtifactId,
          );
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
          return item.artifactId && ownsArtifactAction ? (
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
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function EvidenceStack({
  component,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const visualAssets = uniqueVisualAssetsForItems(component.items);
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.evidenceStack} ${
        component.title || component.body ? "" : styles.evidenceStackWithoutIntro
      }`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      <div className={styles.evidenceStackIntro}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div
        className={styles.evidenceSlips}
        data-count={Math.min(component.items.length, 4)}
      >
        <svg
          className={styles.evidenceRoute}
          viewBox="0 0 1000 620"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M498 28C455 104 543 154 501 228C459 304 546 362 493 438C455 493 477 548 513 596" />
          <path d="M479 111C398 115 326 101 246 82" />
          <path d="M523 208C604 203 687 173 776 150" />
          <path d="M476 369C397 371 317 405 237 433" />
          <path d="M505 499C600 497 681 520 782 548" />
          <circle cx="479" cy="111" r="7" />
          <circle cx="523" cy="208" r="7" />
          <circle cx="476" cy="369" r="7" />
          <circle cx="505" cy="499" r="7" />
        </svg>
        {component.items.map((item, index) => {
          const ownsArtifactAction = itemOwnsArtifactAction(
            component,
            index,
            sharedArtifactId,
          );
          const assetId = visualAssets[index];
          const content = (
            <>
              {assetId ? (
                <A2UIAsset
                  assetId={assetId}
                  className={styles.evidenceAsset}
                />
              ) : null}
              <span>{item.label}</span>
              {item.value ? <strong>{item.value}</strong> : null}
              {item.detail ? <small>{item.detail}</small> : null}
              {item.artifactId && ownsArtifactAction ? (
                <i>{sourceActionLabel(item.artifactId, artifactMap)}</i>
              ) : null}
            </>
          );
          return item.artifactId && ownsArtifactAction ? (
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
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function EssayMargin({
  component,
  embeddedQuote,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  embeddedQuote?: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const heroAsset = component.items.find((item) => item.assetId)?.assetId ?? "";
  const sharedArtifactId = sharedArtifactIdFor(component);
  const embeddedQuoteArtifacts = embeddedQuote
    ? embeddedQuote.quoteIds.flatMap((quoteId) => {
        const artifact = artifactMap.get(quoteId.replace(/^quote:/, ""));
        return artifact?.annotation ? [artifact] : [];
      })
    : [];

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.essayMargin}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      <div className={styles.essayMainColumn}>
        <div className={styles.essayPage}>
          {component.title ? <h2>{component.title}</h2> : null}
          {component.body ? <Markdown>{component.body}</Markdown> : null}
          {heroAsset ? (
            <A2UIAsset assetId={heroAsset} className={styles.essayAsset} />
          ) : null}
          {sharedArtifactId ? (
            <button type="button" onClick={() => onOpen(sharedArtifactId)}>
              {sourceActionLabel(sharedArtifactId, artifactMap)}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {embeddedQuote ? (
          <QuotePaper
            component={embeddedQuote}
            quoteArtifacts={embeddedQuoteArtifacts}
            visualVariant={visualVariant}
            arrangement={arrangement}
            className={styles.essayInlineQuote}
          />
        ) : null}
      </div>
      <div className={styles.marginNotes}>
        {component.items.map((item, index) => {
          const ownsArtifactAction = itemOwnsArtifactAction(
            component,
            index,
            sharedArtifactId,
          );
          const content = (
            <>
              <span>{item.label}</span>
              {item.value ? <strong>{item.value}</strong> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </>
          );
          return item.artifactId && ownsArtifactAction ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <button type="button" key={`${item.label}-${index}`} disabled>
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SpecimenBoard({
  component,
  visualVariant,
  arrangement,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const itemArtifactIds = itemSourceArtifactIds(component, artifactMap);
  const visualAssets = uniqueVisualAssetsForItems(component.items);
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.specimenBoard}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
      data-count={Math.min(component.items.length, 6)}
    >
      <div className={styles.specimenHeading}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div className={styles.specimens}>
        {component.items.map((item, index) => {
          const artifactId = itemArtifactIds[index] ?? "";
          const assetId = visualAssets[index];
          const content = (
            <>
              <span className={styles.specimenNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {assetId ? (
                <A2UIAsset
                  assetId={assetId}
                  className={styles.specimenAsset}
                />
              ) : null}
              <strong>{item.label}</strong>
              {item.value ? <b>{item.value}</b> : null}
              {item.detail ? <small>{item.detail}</small> : null}
              <ItemSourceCue artifactId={artifactId} artifactMap={artifactMap} />
            </>
          );
          return artifactId ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              data-has-asset={assetId ? "true" : "false"}
              onClick={() => onOpen(artifactId)}
            >
              {content}
            </button>
          ) : (
            <div
              key={`${item.label}-${index}`}
              data-has-asset={assetId ? "true" : "false"}
            >
              {content}
            </div>
          );
        })}
      </div>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function VisualMosaic({
  component,
  surfaceFamily,
  visualVariant,
  arrangement,
  presentationSeed,
  artifactMap,
  onOpen,
}: {
  component: A2UIComponent;
  surfaceFamily: A2UISurfaceFamily;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  presentationSeed: number;
  artifactMap: Map<string, Artifact>;
  onOpen: (id: string) => void;
}) {
  const sharedArtifactId = sharedArtifactIdFor(component);
  const [galleryIndex, setGalleryIndex] = useState<Record<string, string[]>>(
    {},
  );
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<
    Set<string>
  >(() => new Set());
  const galleryCategoryKey = component.items
    .map((item) => galleryCategoryFromAssetId(item.assetId) ?? "")
    .filter(Boolean)
    .join("|");

  useEffect(() => {
    if (!galleryCategoryKey) return;
    const controller = new AbortController();
    fetch("/api/gallery", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : {}))
      .then((value: unknown) => {
        if (!value || typeof value !== "object") return;
        setGalleryIndex(value as Record<string, string[]>);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [galleryCategoryKey]);

  const selectedGalleryImages = (() => {
    const usedIndexes = new Map<string, Set<number>>();
    return component.items.map((item, index) => {
      const galleryCategory = item.assetId
        ? galleryCategoryFromAssetId(item.assetId) ?? undefined
        : undefined;
      const galleryImages = galleryCategory
        ? galleryIndex[galleryCategory] ?? []
        : [];
      if (!galleryCategory || galleryImages.length === 0) return undefined;

      const used = usedIndexes.get(galleryCategory) ?? new Set<number>();
      let selectedIndex =
        mixPresentationSeed(
          presentationSeed,
          `${component.id}:${galleryCategory}:${index}`,
        ) % galleryImages.length;
      while (
        used.has(selectedIndex) &&
        used.size < galleryImages.length
      ) {
        selectedIndex = (selectedIndex + 1) % galleryImages.length;
      }
      used.add(selectedIndex);
      usedIndexes.set(galleryCategory, used);
      return galleryImages[selectedIndex];
    });
  })();

  const letterImages = (() => {
    const selected = selectedGalleryImages.filter(
      (image): image is string => Boolean(image),
    );
    if (selected.length !== 1) return selected.slice(0, 3);
    const firstCategory = component.items
      .map((item) => galleryCategoryFromAssetId(item.assetId) ?? "")
      .find(Boolean);
    const pool = firstCategory ? galleryIndex[firstCategory] ?? [] : [];
    if (pool.length < 2) return selected;
    const chosen: string[] = [];
    let index =
      mixPresentationSeed(
        presentationSeed,
        `${component.id}:${firstCategory}:letter`,
      ) % pool.length;
    while (chosen.length < Math.min(3, pool.length)) {
      const image = pool[index];
      if (!chosen.includes(image)) chosen.push(image);
      index = (index + 1) % pool.length;
    }
    return chosen;
  })();

  if (surfaceFamily === "photo_letter") {
    const firstItem = component.items[0];
    const sourceArtifactIds = componentSourceArtifactIds(component, artifactMap);
    return (
      <section
        id={`a2ui-${component.id}`}
        className={`${styles.component} ${styles.photoLetter}`}
        data-variant={visualVariant}
        data-surface="photo-letter"
      >
        <header className={styles.photoLetterHeading}>
          {component.title ? <h2>{component.title}</h2> : null}
          {component.body ? <Markdown>{component.body}</Markdown> : null}
        </header>
        <div className={styles.photoLetterSpread}>
          <figure className={styles.photoLetterHero}>
            {letterImages[0] ? (
              <Image
                src={letterImages[0]}
                alt={`Karthik's photograph from ${galleryCategoryFromAssetId(firstItem?.assetId ?? "") ?? "the trip"}`}
                width={1600}
                height={1100}
                sizes="(max-width: 720px) 94vw, 64vw"
                loading="eager"
                fetchPriority="high"
                unoptimized
              />
            ) : (
              <span className={styles.visualMosaicPlaceholder} />
            )}
            {firstItem ? (
              <figcaption>
                <strong>{firstItem.label}</strong>
                {firstItem.value ? <b>{firstItem.value}</b> : null}
              </figcaption>
            ) : null}
          </figure>
          <div className={styles.photoLetterDetails}>
            {letterImages.slice(1, 3).map((image, index) => (
              <figure key={image}>
                <Image
                  src={image}
                  alt="A second view from the same gallery collection"
                  width={900}
                  height={700}
                  sizes="(max-width: 720px) 44vw, 22vw"
                  loading="lazy"
                  unoptimized
                />
                <span aria-hidden="true">{String(index + 2).padStart(2, "0")}</span>
              </figure>
            ))}
          </div>
        </div>
        <div className={styles.photoLetterNotes}>
          {component.items.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.label}</strong>
              {item.value ? <b>{item.value}</b> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </div>
          ))}
        </div>
        <ArtifactSourceStrip
          artifactIds={sourceArtifactIds}
          artifactMap={artifactMap}
          onOpen={onOpen}
        />
      </section>
    );
  }

  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.visualMosaic}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      <div className={styles.visualMosaicIntro}>
        {component.title ? <h2>{component.title}</h2> : null}
        {component.body ? <Markdown>{component.body}</Markdown> : null}
      </div>
      <div
        className={styles.visualMosaicGrid}
        data-count={Math.min(component.items.length, 5)}
      >
        {component.items.map((item, index) => {
          const ownsArtifactAction = itemOwnsArtifactAction(
            component,
            index,
            sharedArtifactId,
          );
          const galleryCategory = item.assetId
            ? galleryCategoryFromAssetId(item.assetId) ?? undefined
            : undefined;
          const selectedGalleryImage = selectedGalleryImages[index];
          const content = (
            <>
              {selectedGalleryImage ? (
                <Image
                  src={selectedGalleryImage}
                  alt={`Karthik's photograph from ${galleryCategory}`}
                  width={1200}
                  height={900}
                  sizes="(max-width: 720px) 92vw, 52vw"
                  className={styles.visualMosaicImage}
                  data-loaded={loadedGalleryImages.has(selectedGalleryImage)}
                  loading={index < 2 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  onLoad={() =>
                    setLoadedGalleryImages((current) => {
                      if (current.has(selectedGalleryImage)) return current;
                      const next = new Set(current);
                      next.add(selectedGalleryImage);
                      return next;
                    })
                  }
                  unoptimized
                />
              ) : galleryCategory ? (
                <span className={styles.visualMosaicPlaceholder} />
              ) : item.assetId ? (
                <A2UIAsset
                  assetId={item.assetId}
                  className={styles.visualMosaicImage}
                />
              ) : (
                <span className={styles.visualMosaicPlaceholder} />
              )}
              <span className={styles.visualMosaicCaption}>
                <strong>{item.label}</strong>
                {item.value ? <b>{item.value}</b> : null}
                {item.detail ? <small>{item.detail}</small> : null}
              </span>
            </>
          );
          return item.artifactId && ownsArtifactAction ? (
            <button
              type="button"
              key={`${item.label}-${index}`}
              onClick={() => onOpen(item.artifactId)}
            >
              {content}
            </button>
          ) : (
            <figure key={`${item.label}-${index}`}>{content}</figure>
          );
        })}
      </div>
      {sharedArtifactId ? (
        <button
          type="button"
          className={styles.sharedSourceAction}
          onClick={() => onOpen(sharedArtifactId)}
        >
          {sourceActionLabel(sharedArtifactId, artifactMap)}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function ManifestoFold({
  component,
  visualVariant,
  arrangement,
  selectedOption,
  onSelect,
}: {
  component: A2UIComponent;
  visualVariant: A2UIVisualVariant;
  arrangement: A2UIItemArrangement;
  selectedOption: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section
      id={`a2ui-${component.id}`}
      className={`${styles.component} ${styles.manifestoFold}`}
      data-variant={visualVariant}
      data-arrangement={arrangement}
    >
      {component.title ? <h2>{component.title}</h2> : null}
      {component.body ? <Markdown>{component.body}</Markdown> : null}
      <div
        className={styles.manifestoStack}
        data-count={Math.min(component.options.length, 4)}
      >
        <span className={styles.manifestoPin} aria-hidden="true" />
        <svg
          className={styles.manifestoRoute}
          viewBox="0 0 1000 520"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M445 260C555 242 632 90 830 88" />
          <path d="M445 260C598 255 667 254 830 254" />
          <path d="M445 260C558 282 650 423 830 420" />
          <circle cx="445" cy="260" r="9" />
          <circle cx="830" cy="88" r="6" />
          <circle cx="830" cy="254" r="6" />
          <circle cx="830" cy="420" r="6" />
        </svg>
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

function sourceActionLabel(
  artifactId: string,
  artifactMap: Map<string, Artifact>,
): string {
  const artifact = artifactMap.get(artifactId);
  return artifact ? `See ${artifactLabel(artifact)}` : "See source";
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
  queuedPrompts,
  editingQueueIndex,
  onEditQueued,
  onRemoveQueued,
  onReorderQueued,
}: {
  turns: A2UITurn[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  suggestions: string[];
  onAsk: (prompt: string) => void;
  queuedPrompts: QueuedPrompt[];
  editingQueueIndex: number;
  onEditQueued: (index: number) => void;
  onRemoveQueued: (index: number) => void;
  onReorderQueued: (orderedIds: string[]) => void;
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
      <QueuedFollowUps
        prompts={queuedPrompts}
        editingIndex={editingQueueIndex}
        onEdit={onEditQueued}
        onRemove={onRemoveQueued}
        onReorder={onReorderQueued}
      />
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
  queuedPrompts,
  editingQueueIndex,
  onEditQueued,
  onRemoveQueued,
  onReorderQueued,
}: {
  turns: A2UITurn[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onNewConversation: () => void;
  suggestions: string[];
  onAsk: (prompt: string) => void;
  queuedPrompts: QueuedPrompt[];
  editingQueueIndex: number;
  onEditQueued: (index: number) => void;
  onRemoveQueued: (index: number) => void;
  onReorderQueued: (orderedIds: string[]) => void;
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
      <QueuedFollowUps
        prompts={queuedPrompts}
        editingIndex={editingQueueIndex}
        onEdit={onEditQueued}
        onRemove={onRemoveQueued}
        onReorder={onReorderQueued}
      />
      <SuggestionPills suggestions={suggestions} onAsk={onAsk} />
      <button type="button" onClick={onNewConversation}>
        New conversation
      </button>
    </aside>
  );
}

function QueuedFollowUps({
  prompts,
  editingIndex,
  onEdit,
  onRemove,
  onReorder,
}: {
  prompts: QueuedPrompt[];
  editingIndex: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  if (prompts.length === 0) return null;

  return (
    <section className={styles.queuedFollowUps} aria-label="Queued follow-ups">
      <div className={styles.queueLabel}>
        <Clock3 aria-hidden="true" />
        <span>Up next</span>
        <small>{prompts.length}</small>
      </div>
      <Reorder.Group
        axis="y"
        values={prompts}
        onReorder={(next) => onReorder(next.map((prompt) => prompt.id))}
        className={styles.queueItems}
        layoutScroll
      >
        {prompts.map((prompt, index) => (
          <Reorder.Item
            value={prompt}
            className={styles.queueItem}
            data-editing={editingIndex === index}
            data-dragging={draggingId === prompt.id}
            key={prompt.id}
            onDragStart={() => setDraggingId(prompt.id)}
            onDragEnd={() => setDraggingId(null)}
            whileDrag={{
              scale: 1.025,
              zIndex: 40,
              boxShadow: "0 14px 28px rgb(53 66 45 / 0.18)",
            }}
          >
            <button
              className={styles.queuePrompt}
              type="button"
              onClick={() => onEdit(index)}
              aria-label={`Edit queued question: ${prompt.text}`}
            >
              <span aria-hidden="true">{index + 1}</span>
              <p>{prompt.text}</p>
              <Pencil aria-hidden="true" />
            </button>
            <div className={styles.queueControls}>
              <GripVertical aria-hidden="true" />
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove queued question: ${prompt.text}`}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
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
