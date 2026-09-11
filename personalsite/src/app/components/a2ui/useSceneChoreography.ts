"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./a2ui.module.css";

type MotionKind = "paper" | "image" | "ink" | "label" | "rule" | "stamp";
const group = (...names: string[]) => `:is(${names.map((name) => `.${styles[name]}`).join(",")})`;

// Animate semantic pieces, never the layout grid or an invisible hit target.
const targets: [string, MotionKind][] = [
  [`${group("narrativeItems", "metricGrid", "artifactFacts", "artifactList", "researchStages", "foldStrip", "notebookAnnotations", "blueprintModules", "evidenceSlips", "marginNotes", "specimens", "visualMosaicGrid", "manifestoStack", "constellationNotes", "workbenchFragments", "photoLetterNotes", "optionTabs")} > :not(svg)`, "paper"],
  [`${group("timelineComponent", "fieldMapCanvas", "archiveIndex")} li`, "paper"],
  [`${group("photoLetterSpread")} figure`, "paper"],
  [group("dossierIllustration", "notebookAsset", "essayAsset", "researchStageAsset", "foldAsset", "blueprintAsset", "evidenceAsset", "specimenAsset", "manifestoAsset", "fieldMapAsset", "constellationNoteAsset", "archiveMark", "visualMosaicImage"), "image"],
  [`${group("photoLetterSpread", "workbenchFragments")} img`, "image"],
  [group("timelineRoute", "fieldMapRoute", "researchSignal", "evidenceRoute", "manifestoRoute", "artifactPaperOutline", "narrativeBotanical", "artifactBotanical", "artifactCornerSprig"), "rule"],
  [group("metricIcon", "timelineMarker", "fieldMapNode", "researchStageNumber", "specimenNumber", "quoteIcon", "manifestoPin"), "stamp"],
  [`${group("component")} h2, ${group("lead", "navigationCopy")} , ${group("component")} header > div, ${group("visualMosaicIntro")} > div`, "ink"],
  [`${group("visualMosaicCaption")} > *, ${group("photoLetterSpread")} figcaption > *, ${group("metric")} > strong`, "label"],
  [`${group("actions", "artifactSourceStrip")} > button, ${group("sharedSourceAction", "singleArtifactAction", "navigationCue")}, ${group("quoteComponent", "essayInlineQuote", "constellationQuote")} blockquote, ${group("quoteComponent", "essayInlineQuote", "constellationQuote")} footer`, "ink"],
];
const selector = targets.map(([selector]) => selector).join(",");

function frames(kind: MotionKind, index: number, compact: boolean): Keyframe[] {
  const side = index % 2 ? 1 : -1;
  const travel = compact ? 16 : 30;
  if (kind === "paper") return [
    { opacity: 0, translate: `${side * travel}px ${travel}px`, rotate: `${side * (compact ? 2 : 4)}deg`, scale: ".95", offset: 0 },
    { opacity: 1, translate: `${-side * 2}px -3px`, rotate: `${-side * .35}deg`, scale: "1.005", offset: .72 },
    { opacity: 1, translate: "0 0", rotate: "0deg", scale: "1", offset: 1 },
  ];
  if (kind === "image") return [
    { opacity: .15, clipPath: side > 0 ? "inset(0 100% 0 0)" : "inset(100% 0 0 0)", scale: "1.035" },
    { opacity: 1, clipPath: "inset(0 0 0 0)", scale: "1" },
  ];
  if (kind === "rule") return [
    { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    { opacity: 1, clipPath: "inset(0 0 0 0)" },
  ];
  if (kind === "stamp") return [
    { opacity: 0, scale: "1.6", rotate: "-16deg", offset: 0 },
    { opacity: 1, scale: ".91", rotate: "3deg", offset: .65 },
    { opacity: 1, scale: "1", rotate: "0deg", offset: 1 },
  ];
  return [
    { opacity: 0, translate: kind === "label" ? `${side * 12}px 0` : "0 16px", clipPath: "inset(0 0 100% 0)" },
    { opacity: 1, translate: "0 0", clipPath: "inset(0 0 0 0)" },
  ];
}

/** One-shot entrances follow the viewport. Content is visible without JS, and
 * streaming/queue/image updates never restart an existing element's animation. */
export function useSceneChoreography(seed: number, hasDocument: boolean, ambientPaused: boolean) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 600px)").matches;
    const seen = new WeakSet<Element>();
    const ambient = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.setAttribute("data-ambient-visible", String(entry.isIntersecting));
      }
    });
    const visibility = () => {
      root.setAttribute("data-page-visible", String(!document.hidden));
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const waiting = new Map<Element, Animation>();
    const running = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const animation = waiting.get(entry.target);
        animation?.play();
        waiting.delete(entry.target);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -36px 0px", threshold: 0 });
    const settle = () => {
      if (!media.matches) return;
      for (const animation of running) animation.cancel();
      running.clear();
      waiting.clear();
      observer.disconnect();
      for (const element of root.querySelectorAll("[data-scene-ambient]")) {
        element.setAttribute("data-scene-settled", "true");
      }
    };
    const discover = () => {
      for (const element of root.querySelectorAll(selector)) {
        if (seen.has(element)) continue;
        seen.add(element);
        const kind = targets.find(([selector]) => element.matches(selector))?.[1] ?? "ink";
        if (kind === "image" || kind === "stamp" || element.matches(`.${styles.narrativeBotanical}, .${styles.artifactBotanical}, .${styles.artifactCornerSprig}`)) {
          element.setAttribute("data-scene-ambient", kind === "stamp" ? "pulse" : element.matches(`.${styles.visualMosaicImage}, .${styles.photoLetterSpread} img`) ? "photo" : "float");
          ambient.observe(element);
        }
        if (media.matches) {
          element.setAttribute("data-scene-settled", "true");
          continue;
        }
        const siblings = Array.from(element.parentElement?.children ?? []);
        const index = siblings.indexOf(element);
        const phase = kind === "ink" ? 0 : kind === "label" ? 240 : kind === "image" ? 120 : kind === "stamp" ? 260 : 70;
        const animation = element.animate(frames(kind, index + (seed % 3), compact), {
          duration: kind === "paper" ? 850 : kind === "image" ? 1050 : kind === "rule" ? 1100 : 650,
          delay: Math.min(index, 5) * 65 + phase,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        });
        animation.id = `scene-${kind}`;
        running.add(animation);
        animation.onfinish = () => {
          running.delete(animation);
          element.setAttribute("data-scene-settled", "true");
        };
        const rect = element.getBoundingClientRect();
        if (rect.top >= window.innerHeight - 36) {
          animation.pause();
          animation.currentTime = 0;
          waiting.set(element, animation);
          observer.observe(element);
        }
      }
    };
    const mutations = new MutationObserver(discover);
    discover();
    mutations.observe(root, { childList: true, subtree: true });
    media.addEventListener("change", settle);
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      for (const animation of running) {
        const target = (animation.effect as KeyframeEffect)?.target;
        if (target instanceof Element && target.contains(event.target)) {
          animation.finish();
          waiting.delete(target);
          observer.unobserve(target);
        }
      }
    };
    root.addEventListener("focusin", onFocus);
    return () => {
      mutations.disconnect();
      ambient.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
      media.removeEventListener("change", settle);
      root.removeEventListener("focusin", onFocus);
      for (const animation of running) animation.cancel();
    };
    // The keyed scene owns its lifetime; streamed document objects are not a clock.
  }, [seed, hasDocument]);
  useLayoutEffect(() => {
    ref.current?.setAttribute("data-motion-paused", String(ambientPaused));
  }, [ambientPaused, hasDocument]);
  return ref;
}
