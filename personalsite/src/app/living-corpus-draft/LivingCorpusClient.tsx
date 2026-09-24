"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MINIMAL_CATEGORIES,
  readableSections,
  type MinimalCategory,
  type MinimalCorpusItem,
  type MinimalCorpusMedia,
} from "@/lib/living-corpus/minimalTypes";
import type { WhatBrokeResponse } from "@/lib/living-corpus/types";
import { LIVING_CORPUS_SESSION_KEYS as SESSION_KEYS } from "@/lib/living-corpus/visitState";
import {
  hasAllBranches,
  hasAllLeaves,
  leafTargets,
  readGrowthCoverage,
  recordBranchCoverage,
  recordLeafCoverage,
  resetAchievements,
  syncAchievements,
  unlockAchievement,
  type AchievementId,
} from "@/lib/living-corpus/achievements";
import styles from "./living-corpus.module.css";

function ArrowIcon({ back = false }: { back?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" width="18" height="18" fill="none">
      <path
        d={back ? "M14.5 9h-11M7.5 5 3.5 9l4 4" : "M3.5 9h11M10.5 5l4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Coordinates are measured from the final 543 × 724 sprite frames. Leaves
// share the sub-branch aspect ratio, so their painted roots stay on these
// sockets at every responsive scale.
const LEAF_BOX_RATIO = 0.42;
const LEAF_ROOT = { x: 0.13, y: 0.712 } as const;
const LEAF_SOCKETS = [
  { x: 64.35, y: 10.1, rotation: -47, scale: 1 },
  { x: 86.04, y: 20.05, rotation: 14, scale: 0.98 },
  { x: 71.86, y: 44.6, rotation: 15, scale: 0.96 },
  { x: 35.58, y: 46, rotation: -61, scale: 0.94 },
] as const;
const LEAF_FAN = [
  { rotation: 0, scale: 0.92 },
  { rotation: -38, scale: 0.8 },
  { rotation: 41, scale: 0.72 },
  { rotation: -69, scale: 0.64 },
  { rotation: 67, scale: 0.58 },
  { rotation: -96, scale: 0.52 },
  { rotation: 94, scale: 0.47 },
  { rotation: 176, scale: 0.42 },
] as const;

function leafStyle(index: number, category: MinimalCategory): CSSProperties {
  const socket = LEAF_SOCKETS[index % LEAF_SOCKETS.length];
  const fan = LEAF_FAN[
    Math.floor(index / LEAF_SOCKETS.length) % LEAF_FAN.length
  ];
  const left = socket.x - LEAF_BOX_RATIO * LEAF_ROOT.x * 100;
  const top = socket.y - LEAF_BOX_RATIO * LEAF_ROOT.y * 100;
  // The lower-left work socket sits closest to the viewport edge. Turn that
  // leaf inward around the same painted root instead of shifting its contact.
  const edgeTurn =
    category === "work" && index % LEAF_SOCKETS.length === 3 ? 70 : 0;

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `rotate(${socket.rotation + fan.rotation + edgeTurn}deg) scale(${socket.scale * fan.scale})`,
  };
}

type SnowContact = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  frame: 0 | 1 | 2 | 3;
  surfaceLift: number;
  revealAt: number;
};

type SnowContactStyle = CSSProperties & {
  "--snow-frame": string;
  "--snow-opacity": string;
  "--snow-delay": string;
  "--snow-world-angle": string;
};

const BRANCH_FRAME_RATIO = 724 / 543;
const BRANCH_ORIENTATION = {
  work: { angle: -14, flipped: false },
  projects: { angle: -52, flipped: true },
  ideas: { angle: -18, flipped: false },
  writing: { angle: -56, flipped: true },
} satisfies Record<
  MinimalCategory,
  { angle: number; flipped: boolean }
>;

// Each point is measured against the painted centerline of the final
// 543 × 724 sub-branch frame. Reveal order deliberately hops between the
// trunk and separate twigs, so snow reads as accumulation across a branch
// instead of one growing decal.
const SNOW_CONTACTS: readonly SnowContact[] = [
  {
    id: "lower-trunk",
    x: 28,
    y: 72,
    rotation: -47,
    width: 25,
    frame: 0,
    surfaceLift: 4.4,
    revealAt: 1,
  },
  {
    id: "middle-right-twig",
    x: 64,
    y: 46,
    rotation: -18,
    width: 23,
    frame: 2,
    surfaceLift: 3.8,
    revealAt: 1,
  },
  {
    id: "upper-trunk",
    x: 58,
    y: 39,
    rotation: -40,
    width: 22,
    frame: 1,
    surfaceLift: 3.8,
    revealAt: 3,
  },
  {
    id: "lower-left-twig",
    x: 31,
    y: 51,
    rotation: -105,
    width: 17,
    frame: 3,
    surfaceLift: 3,
    revealAt: 3,
  },
  {
    id: "middle-trunk",
    x: 43,
    y: 55,
    rotation: -44,
    width: 21,
    frame: 2,
    surfaceLift: 4,
    revealAt: 4,
  },
  {
    id: "upper-left-twig",
    x: 61,
    y: 27,
    rotation: -88,
    width: 17,
    frame: 0,
    surfaceLift: 3,
    revealAt: 2,
  },
  {
    id: "right-twig-tip",
    x: 75,
    y: 42,
    rotation: -17,
    width: 16,
    frame: 1,
    surfaceLift: 2.8,
    revealAt: 4,
  },
  {
    id: "main-tip",
    x: 79,
    y: 25,
    rotation: -27,
    width: 19,
    frame: 3,
    surfaceLift: 3.4,
    revealAt: 2,
  },
  {
    id: "upper-left-tip",
    x: 63,
    y: 15,
    rotation: -79,
    width: 13,
    frame: 2,
    surfaceLift: 2.5,
    revealAt: 5,
  },
];

function snowContactStyle(
  contact: SnowContact,
  category: MinimalCategory,
  index: number,
): SnowContactStyle {
  const { angle, flipped } = BRANCH_ORIENTATION[category];
  const flip = flipped ? -1 : 1;
  const angleInRadians = (angle * Math.PI) / 180;
  const left = contact.x - contact.surfaceLift * Math.sin(angleInRadians);
  const top =
    contact.y -
    (flip * contact.surfaceLift * Math.cos(angleInRadians)) /
      BRANCH_FRAME_RATIO;
  const worldAngle = angle + (flipped ? -contact.rotation : contact.rotation);

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${contact.width}%`,
    transform: `translate(-50%, -50%) rotate(${contact.rotation}deg) scaleY(${flip})`,
    "--snow-frame": `${contact.frame * 33.333}%`,
    "--snow-opacity": `${0.54 + (index % 3) * 0.045}`,
    "--snow-delay": `${Math.min(index * 70, 420)}ms`,
    "--snow-world-angle": `${worldAngle}deg`,
  };
}

type ReadEntries = Partial<Record<MinimalCategory, string[]>>;

function xrayEntryLabel(
  entryId: string,
  itemById: ReadonlyMap<string, MinimalCorpusItem>,
): string {
  const separator = entryId.indexOf("#");
  const itemId = separator === -1 ? entryId : entryId.slice(0, separator);
  const detailId = separator === -1 ? "" : entryId.slice(separator + 1);
  const item = itemById.get(itemId);
  if (!item) return entryId;
  if (!detailId || detailId === "opened") return item.title;
  const section = item.sections.find((candidate) => candidate.id === detailId);
  return section ? `${item.title} · ${section.heading}` : item.title;
}

function xrayEntryTarget(entryId: string): {
  itemId: string;
  sectionId: string | null;
} {
  const separator = entryId.indexOf("#");
  if (separator === -1) return { itemId: entryId, sectionId: null };
  const sectionId = entryId.slice(separator + 1);
  return {
    itemId: entryId.slice(0, separator),
    sectionId: sectionId === "opened" ? null : sectionId,
  };
}

function leafXrayMarkerStyle(index: number): CSSProperties {
  const socket = LEAF_SOCKETS[index % LEAF_SOCKETS.length];
  const layer = Math.floor(index / LEAF_SOCKETS.length);
  const direction = index % 2 === 0 ? 1 : -1;
  return {
    left: `${socket.x + direction * (4 + layer * 8)}%`,
    top: `${socket.y + 4 + layer * 7.2}%`,
  };
}

function ReaderMedia({ media }: { media: MinimalCorpusMedia[] }) {
  if (!media.length) return null;

  return (
    <div className={styles.mediaStack} aria-label="Project and article media">
      {media.map((entry, index) => {
        if (entry.type === "embed") {
          return (
            <div className={styles.embedShell} key={`${entry.src}-${index}`}>
              <iframe
                className={styles.embedFrame}
                src={entry.src}
                title={entry.title}
                height={entry.height}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          );
        }

        return (
          <figure className={styles.mediaFigure} key={`${entry.src}-${index}`}>
            <Image
              src={entry.src}
              alt={entry.alt}
              width={entry.width}
              height={entry.height}
              sizes="(max-width: 720px) calc(100vw - 48px), 680px"
              className={styles.readerImage}
            />
          </figure>
        );
      })}
    </div>
  );
}

function InlineReader({
  item,
  onBack,
  onRead,
  focusSectionId,
}: {
  item: MinimalCorpusItem;
  onBack: () => void;
  onRead: (category: MinimalCategory, entryId: string) => void;
  focusSectionId: string | null;
}) {
  const readerRef = useRef<HTMLElement>(null);
  const bodySections = readableSections(item);

  useEffect(() => {
    if (!focusSectionId) return;
    const frame = window.requestAnimationFrame(() => {
      const section = Array.from(
        readerRef.current?.querySelectorAll("[data-corpus-section]") ?? [],
      ).find(
        (candidate) =>
          candidate.getAttribute("data-corpus-section") === focusSectionId,
      );
      (section ?? readerRef.current)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [item.id, focusSectionId]);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const existing = timers.get(entry.target);
          if (existing) clearTimeout(existing);
          if (!entry.isIntersecting) {
            timers.delete(entry.target);
            return;
          }
          const sectionId = entry.target.getAttribute("data-corpus-section");
          if (!sectionId) return;
          timers.set(
            entry.target,
            setTimeout(
              () => onRead(item.category, `${item.id}#${sectionId}`),
              800,
            ),
          );
        });
      },
      { rootMargin: "-16% 0px -58% 0px", threshold: 0 },
    );

    reader
      .querySelectorAll("[data-corpus-section]")
      .forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [item, onRead]);

  const showReference =
    item.category === "work" && item.referenceItems.length > 0;

  const jumpTo = (sectionId: string | null) => {
    const target = sectionId
      ? Array.from(readerRef.current?.querySelectorAll("[data-corpus-section]") ?? [])
          .find((candidate) => candidate.getAttribute("data-corpus-section") === sectionId)
      : readerRef.current?.querySelector("[data-corpus-overview]");
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };

  return (
    <main className={styles.reader} ref={readerRef} key={item.id}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowIcon back />
        <span>{item.category}</span>
      </button>

      <header className={styles.readerHeader} data-corpus-overview>
        <p className={styles.meta}>{item.meta}</p>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
      </header>

      {showReference ? (
        <ul className={styles.referenceList} aria-label={`${item.title} highlights`}>
          {item.referenceItems.map((reference) => (
            <li key={reference}>{reference}</li>
          ))}
        </ul>
      ) : null}

      {bodySections.length > 0 ? (
        <nav className={styles.readerToc} aria-label={`Contents of ${item.title}`}>
          <p>Contents</p>
          <ol>
            <li>
              <button type="button" onClick={() => jumpTo(null)}>
                <span>00</span> Overview
              </button>
            </li>
            {bodySections.map((section, index) => (
              <li key={section.id}>
                <button type="button" onClick={() => jumpTo(section.id)}>
                  <span>{String(index + 1).padStart(2, "0")}</span> {section.heading}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <ReaderMedia media={item.media} />

      {bodySections.length ? (
        <div className={styles.noteSections}>
          {bodySections.map((section) => (
            <section key={section.id} data-corpus-section={section.id}>
              {section.heading.toLowerCase() !== item.title.toLowerCase() ? (
                <h2>{section.heading}</h2>
              ) : null}
              <p>{section.text}</p>
              <ReaderMedia media={section.media} />
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function Environment({
  open,
  branches,
  readEntries,
  night,
  sunHoverLockUntil,
  onToggleNight,
  failure,
  xray,
  onToggleXray,
  onGust,
  onOpenCategory,
  onOpenEntry,
  itemById,
}: {
  open: boolean;
  branches: MinimalCategory[];
  readEntries: ReadEntries;
  night: boolean;
  sunHoverLockUntil: number;
  onToggleNight: () => void;
  failure: boolean;
  xray: boolean;
  onToggleXray: () => void;
  onGust: () => void;
  onOpenCategory: (category: MinimalCategory) => void;
  onOpenEntry: (category: MinimalCategory, entryId: string) => void;
  itemById: ReadonlyMap<string, MinimalCorpusItem>;
}) {
  const branchArtRef = useRef<HTMLDivElement>(null);
  const eclipseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eclipseRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eclipseTriggeredRef = useRef(false);
  const sunPointerDownRef = useRef(false);
  const sunClickConsumedRef = useRef(false);
  const [eclipseCharging, setEclipseCharging] = useState(false);
  const [readyBranches, setReadyBranches] = useState<Set<MinimalCategory>>(
    () => new Set(),
  );

  const cancelEclipseCharge = () => {
    if (eclipseTimerRef.current) clearTimeout(eclipseTimerRef.current);
    eclipseTimerRef.current = null;
    if (!eclipseRevealTimerRef.current) setEclipseCharging(false);
  };

  const startEclipseCharge = (fromPress: boolean) => {
    if (
      failure ||
      (!fromPress && Date.now() < sunHoverLockUntil) ||
      eclipseTimerRef.current ||
      eclipseRevealTimerRef.current
    )
      return;
    eclipseTriggeredRef.current = false;
    eclipseTimerRef.current = setTimeout(() => {
      eclipseTimerRef.current = null;
      eclipseTriggeredRef.current = true;
      if (sunPointerDownRef.current || fromPress) {
        sunClickConsumedRef.current = true;
      }
      if (xray) {
        // Let the existing CSS transition uncover the sun immediately after
        // the hold, rather than waiting through the ingress animation first.
        onToggleXray();
        return;
      }
      setEclipseCharging(true);
      eclipseRevealTimerRef.current = setTimeout(() => {
        eclipseRevealTimerRef.current = null;
        setEclipseCharging(false);
        onToggleXray();
      }, 950);
    }, 1500);
  };

  useEffect(
    () => () => {
      if (eclipseTimerRef.current) clearTimeout(eclipseTimerRef.current);
      if (eclipseRevealTimerRef.current)
        clearTimeout(eclipseRevealTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setReadyBranches((current) => {
      const next = new Set(
        [...current].filter((category) => branches.includes(category)),
      );
      return next.size === current.size ? current : next;
    });
  }, [branches]);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    triggered: boolean;
  } | null>(null);
  const breakLockedRef = useRef(false);
  const pullPhysicsRef = useRef({
    frame: 0,
    current: { root: 0, tip: 0, shear: 0, stretch: 1 },
    target: { root: 0, tip: 0, shear: 0, stretch: 1 },
    velocity: { root: 0, tip: 0, shear: 0, stretch: 0 },
  });

  const runPullPhysics = () => {
    const physics = pullPhysicsRef.current;
    if (physics.frame) return;

    const tick = () => {
      physics.frame = 0;
      const branchArt = branchArtRef.current;
      if (!branchArt) return;

      let unsettled = false;
      const channels = ["root", "tip", "shear", "stretch"] as const;
      channels.forEach((channel) => {
        const displacement = physics.target[channel] - physics.current[channel];
        physics.velocity[channel] =
          (physics.velocity[channel] + displacement * 0.16) * 0.69;
        physics.current[channel] += physics.velocity[channel];
        if (
          Math.abs(displacement) > (channel === "stretch" ? 0.0004 : 0.015) ||
          Math.abs(physics.velocity[channel]) >
            (channel === "stretch" ? 0.0004 : 0.015)
        ) {
          unsettled = true;
        }
      });

      branchArt.style.setProperty("--wind-pull", `${physics.current.root}deg`);
      branchArt.style.setProperty(
        "--wind-tip-angle",
        `${physics.current.tip}deg`,
      );
      branchArt.style.setProperty(
        "--wind-tip-shear",
        `${physics.current.shear}deg`,
      );
      branchArt.style.setProperty(
        "--wind-tip-stretch",
        `${physics.current.stretch}`,
      );

      if (unsettled) {
        physics.frame = window.requestAnimationFrame(tick);
        return;
      }

      channels.forEach((channel) => {
        physics.current[channel] = physics.target[channel];
        physics.velocity[channel] = 0;
      });
      if (!dragRef.current && !breakLockedRef.current) {
        branchArt.style.removeProperty("--wind-pull");
        branchArt.style.removeProperty("--wind-tip-angle");
        branchArt.style.removeProperty("--wind-tip-shear");
        branchArt.style.removeProperty("--wind-tip-stretch");
        delete branchArt.dataset.physics;
      }
    };

    branchArtRef.current?.setAttribute("data-physics", "true");
    physics.frame = window.requestAnimationFrame(tick);
  };

  const setPullTarget = (
    target: Partial<(typeof pullPhysicsRef.current)["target"]>,
  ) => {
    Object.assign(pullPhysicsRef.current.target, target);
    runPullPhysics();
  };

  useEffect(() => {
    let frame = 0;

    const updateScrollFade = () => {
      frame = 0;
      const branchArt = branchArtRef.current;
      if (!branchArt) return;
      const mobile = window.matchMedia("(max-width: 720px)").matches;
      const progress = Math.max(0, Math.min(1, (window.scrollY - 36) / 300));
      const opacity = mobile && open ? 1 - progress * 0.94 : 1;
      branchArt.style.setProperty("--branch-scroll-opacity", `${opacity}`);
    };

    const scheduleScrollFade = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollFade);
    };

    updateScrollFade();
    window.addEventListener("scroll", scheduleScrollFade, { passive: true });
    window.addEventListener("resize", scheduleScrollFade);
    return () => {
      window.removeEventListener("scroll", scheduleScrollFade);
      window.removeEventListener("resize", scheduleScrollFade);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (pullPhysicsRef.current.frame) {
        window.cancelAnimationFrame(pullPhysicsRef.current.frame);
      }
    },
    [],
  );

  const resetPull = () => {
    if (breakLockedRef.current) return;
    dragRef.current = null;
    const branchArt = branchArtRef.current;
    if (branchArt) delete branchArt.dataset.pulling;
    setPullTarget({ root: 0, tip: 0, shear: 0, stretch: 1 });
  };

  const lockBreak = () => {
    breakLockedRef.current = true;
    dragRef.current = null;
    const branchArt = branchArtRef.current;
    if (branchArt) delete branchArt.dataset.pulling;
  };

  useEffect(() => {
    if (failure) return;
    const physics = pullPhysicsRef.current;
    if (physics.frame) window.cancelAnimationFrame(physics.frame);
    physics.frame = 0;
    physics.current = { root: 0, tip: 0, shear: 0, stretch: 1 };
    physics.target = { root: 0, tip: 0, shear: 0, stretch: 1 };
    physics.velocity = { root: 0, tip: 0, shear: 0, stretch: 0 };
    breakLockedRef.current = false;
    dragRef.current = null;
    const branchArt = branchArtRef.current;
    if (!branchArt) return;
    delete branchArt.dataset.pulling;
    delete branchArt.dataset.physics;
    branchArt.style.removeProperty("--wind-pull");
    branchArt.style.removeProperty("--wind-tip-angle");
    branchArt.style.removeProperty("--wind-tip-shear");
    branchArt.style.removeProperty("--wind-tip-stretch");
  }, [failure]);

  const bendThenBreak = () => {
    if (failure) return;
    setPullTarget({ root: 1.8, tip: 10.5, shear: 2.1, stretch: 1.035 });
    window.setTimeout(() => {
      lockBreak();
      onGust();
    }, 260);
  };

  const beginPull = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (failure) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      triggered: false,
    };
    if (branchArtRef.current) branchArtRef.current.dataset.pulling = "true";
  };

  const continuePull = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const branchArt = branchArtRef.current;
    if (!drag || !branchArt || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const tension = Math.min(112, Math.hypot(deltaX, deltaY));
    const normalPull = 0.86 * deltaY + 0.51 * deltaX;
    const alongPull = 0.86 * deltaX - 0.51 * deltaY;
    const tipAngle = Math.max(-14, Math.min(14, normalPull / 6.2));
    setPullTarget({
      root: tipAngle * 0.18,
      tip: tipAngle,
      shear: tipAngle * 0.2,
      stretch: Math.max(0.965, Math.min(1.06, 1 + alongPull / 900)),
    });

    if (tension < 86 || drag.triggered) return;
    drag.triggered = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    lockBreak();
    onGust();
  };

  const handleWindKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    bendThenBreak();
  };

  const finishPull = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (failure || breakLockedRef.current) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      resetPull();
      return;
    }

    const tension = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    const mobileTap =
      tension < 14 && window.matchMedia("(max-width: 720px)").matches;
    if (!drag.triggered && mobileTap) {
      drag.triggered = true;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      bendThenBreak();
      return;
    }

    resetPull();
  };

  return (
    <div className={styles.environment}>
      <button
        type="button"
        className={styles.sun}
        data-charging={eclipseCharging ? "true" : "false"}
        data-eclipsed={xray ? "true" : "false"}
        aria-label={night ? "Return to daylight" : "See the winter night"}
        aria-description="Linger here, or press and hold, to reveal the branch x-ray"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") startEclipseCharge(false);
        }}
        onPointerLeave={cancelEclipseCharge}
        onPointerDown={() => {
          sunPointerDownRef.current = true;
          if (eclipseRevealTimerRef.current) {
            sunClickConsumedRef.current = true;
            return;
          }
          sunClickConsumedRef.current = false;
          cancelEclipseCharge();
          startEclipseCharge(true);
        }}
        onPointerUp={(event) => {
          sunPointerDownRef.current = false;
          if (event.pointerType !== "mouse") cancelEclipseCharge();
        }}
        onPointerCancel={() => {
          sunPointerDownRef.current = false;
          sunClickConsumedRef.current = false;
          cancelEclipseCharge();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!event.repeat) {
            sunClickConsumedRef.current = false;
            startEclipseCharge(true);
          }
        }}
        onKeyUp={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const heldForEclipse = eclipseTriggeredRef.current;
          cancelEclipseCharge();
          sunClickConsumedRef.current = true;
          if (!heldForEclipse) onToggleNight();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (sunClickConsumedRef.current) {
            sunClickConsumedRef.current = false;
            event.preventDefault();
            return;
          }
          cancelEclipseCharge();
          onToggleNight();
        }}
      />
      {failure ? (
        <div className={styles.failureBackground} aria-hidden="true" />
      ) : null}
      <div
        className={styles.branch}
        data-night={night ? "true" : "false"}
        data-open={open ? "true" : "false"}
        data-gusting={failure ? "true" : "false"}
        data-xray={xray ? "true" : "false"}
      >
        <div className={styles.branchArt} ref={branchArtRef}>
          {(
            [
              { className: styles.branchRootLayer, categories: ["work", "projects"] },
              { className: styles.branchTipLayer, categories: ["ideas", "writing"] },
            ] as const
          ).map((layer) => (
            <div className={layer.className} key={layer.className}>
              <Image
                src="/living-corpus/bare-branch-shadow-knobless.png"
                alt=""
                width={1536}
                height={1024}
                priority
                unoptimized
                sizes="(max-width: 720px) 88vw, 48vw"
                className={styles.branchBaseImage}
              />
              {branches
                .filter((category) =>
                  (layer.categories as readonly MinimalCategory[]).includes(category),
                )
                .map((category) => (
                  <span
                    key={category}
                    className={styles.subBranch}
                    data-branch={category}
                    data-night={night ? "true" : "false"}
                  >
                    <span
                      className={styles.subBranchStem}
                      onAnimationEnd={() => {
                        setReadyBranches((current) => {
                          if (current.has(category)) return current;
                          const next = new Set(current);
                          next.add(category);
                          return next;
                        });
                      }}
                    />
                    {xray && readyBranches.has(category) ? (
                      <button
                        type="button"
                        className={styles.branchXrayTag}
                        aria-label={`Open ${category}`}
                        onClick={() => onOpenCategory(category)}
                      >
                        <span>{category}</span>
                      </button>
                    ) : null}
                    {readyBranches.has(category)
                      ? night
                        ? SNOW_CONTACTS.filter(
                            (contact) =>
                              contact.revealAt <=
                              (readEntries[category] ?? []).length,
                          ).map((contact, index) => (
                            <span
                              key={`snow-${contact.id}`}
                              className={styles.snowContact}
                              style={snowContactStyle(contact, category, index)}
                            >
                              <span className={styles.snowClip}>
                                <span className={styles.snowTexture} />
                              </span>
                              <span className={styles.snowParticles} />
                            </span>
                          ))
                        : (readEntries[category] ?? []).map((entryId, index) => (
                            <span
                              key={`leaf-${entryId}`}
                              className={styles.leaf}
                              style={leafStyle(index, category)}
                            />
                          ))
                      : null}
                    {xray && readyBranches.has(category)
                      ? (readEntries[category] ?? []).map((entryId, index) => (
                          <button
                            type="button"
                            key={`marker-${entryId}`}
                            className={styles.leafXrayMarker}
                            style={leafXrayMarkerStyle(index)}
                            aria-label={`Open ${xrayEntryLabel(entryId, itemById)}`}
                            onClick={() => onOpenEntry(category, entryId)}
                          >
                            <span>{index + 1}</span>
                          </button>
                        ))
                      : null}
                  </span>
                ))}
            </div>
          ))}
          <span className={styles.branchScan} aria-hidden="true" />
          <span className={styles.branchScanBeam} aria-hidden="true" />
          <button
            type="button"
            className={styles.windTrigger}
            aria-label="Pull or tap the branch to make a gust and see what broke"
            aria-controls="what-broke"
            disabled={failure}
            onKeyDown={handleWindKey}
            onPointerCancel={resetPull}
            onPointerDown={beginPull}
            onPointerMove={continuePull}
            onPointerUp={finishPull}
          >
            <span className={styles.windHint}>pull for wind</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FailureView({
  response,
  loading,
  error,
  onClose,
  onRetry,
}: {
  response: WhatBrokeResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <main className={styles.failureView} id="what-broke">
      <button type="button" className={styles.back} onClick={onClose}>
        <ArrowIcon back />
        <span>Back</span>
      </button>
      <header className={styles.failureHeader}>
        <h1>What broke</h1>
        <p>
          Wrong assumptions, abandoned approaches, and things I would build
          differently.
        </p>
      </header>

      {loading ? (
        <div className={styles.failureLoading} aria-label="Selecting exact passages">
          {[0, 1, 2].map((index) => (
            <span key={index} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.failureError} role="status">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            try again
          </button>
        </div>
      ) : (
        <div className={styles.failureList}>
          {(response?.excerpts ?? []).map((excerpt) => (
            <article key={excerpt.id}>
              <p className={styles.meta}>
                {excerpt.source} · {excerpt.meta}
              </p>
              <h2>{excerpt.heading}</h2>
              <p>{excerpt.text}</p>
              <a href={excerpt.href}>
                <span>open note</span>
                <ArrowIcon />
              </a>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default function LivingCorpusClient({
  items,
}: {
  items: MinimalCorpusItem[];
}) {
  const [selected, setSelected] = useState<MinimalCategory | null>(null);
  const [activeItem, setActiveItem] = useState<MinimalCorpusItem | null>(null);
  const [readerSectionId, setReaderSectionId] = useState<string | null>(null);
  const [branches, setBranches] = useState<MinimalCategory[]>([]);
  const [readEntries, setReadEntries] = useState<ReadEntries>({});
  const [night, setNight] = useState(false);
  const [xrayActive, setXrayActive] = useState(false);
  const [attentionCategory, setAttentionCategory] =
    useState<MinimalCategory | null>(null);
  const [attentionClosing, setAttentionClosing] = useState(false);
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureClosing, setFailureClosing] = useState(false);
  const [failureLoading, setFailureLoading] = useState(false);
  const [failureResponse, setFailureResponse] =
    useState<WhatBrokeResponse | null>(null);
  const [failureError, setFailureError] = useState<string | null>(null);
  const branchesRef = useRef<MinimalCategory[]>([]);
  const readEntriesRef = useRef<ReadEntries>({});
  const attentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attentionHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sunHoverLockUntilRef = useRef(0);
  const sessionIdRef = useRef("");
  const failureReturnScrollRef = useRef(0);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const allLeafTargets = useMemo(() => leafTargets(items), [items]);
  const visibleItems = selected
    ? items.filter((item) => item.category === selected)
    : [];
  const attentionItems = attentionCategory
    ? (() => {
        const inspectedIds = new Set(
          (readEntries[attentionCategory] ?? []).map(
            (entryId) => entryId.split("#")[0],
          ),
        );
        const categoryItems = items.filter(
          (item) => item.category === attentionCategory,
        );
        return [
          ...categoryItems.filter((item) => !inspectedIds.has(item.id)),
          ...categoryItems.filter((item) => inspectedIds.has(item.id)),
        ].slice(0, 3);
      })()
    : [];

  useEffect(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEYS.active, "1");
      const savedBranches = JSON.parse(
        window.sessionStorage.getItem(SESSION_KEYS.branches) ?? "[]",
      ) as MinimalCategory[];
      const requestedSection = new URLSearchParams(window.location.search).get("section");
      const linkedCategory = MINIMAL_CATEGORIES.find(
        (category) => category.id === requestedSection,
      )?.id;
      const restoredBranches = savedBranches.filter((branch) =>
        MINIMAL_CATEGORIES.some((category) => category.id === branch),
      );
      const linkedBranchGrew = linkedCategory && !restoredBranches.includes(linkedCategory);
      const nextBranches = linkedBranchGrew
        ? [...restoredBranches, linkedCategory]
        : restoredBranches;
      branchesRef.current = nextBranches;
      setBranches(nextBranches);
      if (linkedCategory) {
        setSelected(linkedCategory);
        window.sessionStorage.setItem(SESSION_KEYS.branches, JSON.stringify(nextBranches));
      }
      const savedReadEntries = JSON.parse(
        window.sessionStorage.getItem(SESSION_KEYS.readEntries) ?? "{}",
      ) as ReadEntries;
      const restoredReadEntries = Object.fromEntries(
        MINIMAL_CATEGORIES.map(({ id }) => [
          id,
          Array.isArray(savedReadEntries[id])
            ? savedReadEntries[id].filter(
                (entryId): entryId is string => typeof entryId === "string",
              )
            : [],
        ]),
      ) as ReadEntries;
      readEntriesRef.current = restoredReadEntries;
      setReadEntries(restoredReadEntries);
      const restoredNight = window.sessionStorage.getItem(SESSION_KEYS.season) === "winter";
      setNight(restoredNight);
      // Achievements persist across visits even though the visible tree is a
      // session trail. Fold the saved trail into cumulative growth coverage.
      restoredBranches.forEach(recordBranchCoverage);
      MINIMAL_CATEGORIES.forEach(({ id }) =>
        (restoredReadEntries[id] ?? []).forEach(recordLeafCoverage),
      );
      const growth = readGrowthCoverage();
      const restoredAchievements: AchievementId[] = [];
      if (growth.branches.length > 0) restoredAchievements.push("branch");
      if (hasAllBranches(growth.branches)) restoredAchievements.push("all-branches");
      if (growth.entries.length > 0) restoredAchievements.push("leaf");
      if (hasAllLeaves(allLeafTargets, growth.entries)) restoredAchievements.push("all-leaves");
      if (restoredNight) restoredAchievements.push("night");
      syncAchievements(restoredAchievements);
      if (linkedBranchGrew) {
        const linkedGrowth = recordBranchCoverage(linkedCategory);
        if (restoredBranches.length === 0 && growth.branches.length === 0) {
          unlockAchievement("branch");
        }
        if (hasAllBranches(linkedGrowth.branches)) unlockAchievement("all-branches");
      }
      setXrayActive(
        window.sessionStorage.getItem(SESSION_KEYS.xray) === "true",
      );
      const savedSessionId = window.sessionStorage.getItem(SESSION_KEYS.sessionId);
      sessionIdRef.current = savedSessionId || crypto.randomUUID();
      if (!savedSessionId) {
        window.sessionStorage.setItem(
          SESSION_KEYS.sessionId,
          sessionIdRef.current,
        );
      }
    } catch {
      // A private browsing policy can make session storage unavailable.
    }

    return () => {
      if (attentionTimer.current) clearTimeout(attentionTimer.current);
      if (attentionHideTimer.current) clearTimeout(attentionHideTimer.current);
      if (failureCloseTimer.current) clearTimeout(failureCloseTimer.current);
    };
  }, [allLeafTargets]);

  const growBranch = useCallback((category: MinimalCategory) => {
    const previousGrowth = readGrowthCoverage();
    const growth = recordBranchCoverage(category);
    if (previousGrowth.branches.length === 0) unlockAchievement("branch");
    if (hasAllBranches(growth.branches)) unlockAchievement("all-branches");
    if (branchesRef.current.includes(category)) return;
    const next = [...branchesRef.current, category];
    branchesRef.current = next;
    setBranches(next);
    try {
      window.sessionStorage.setItem(
        SESSION_KEYS.branches,
        JSON.stringify(next),
      );
    } catch {
      // The visual still works when storage is unavailable.
    }
  }, []);

  const holdAttention = () => {
    if (attentionHideTimer.current) clearTimeout(attentionHideTimer.current);
    attentionHideTimer.current = null;
    setAttentionClosing(false);
  };

  const beginAttention = (category: MinimalCategory) => {
    if (selected || failureOpen || xrayActive) return;
    holdAttention();
    if (attentionTimer.current) clearTimeout(attentionTimer.current);
    if (attentionCategory === category) return;
    attentionTimer.current = setTimeout(() => {
      growBranch(category);
      setAttentionCategory(category);
      setAttentionClosing(false);
      attentionTimer.current = null;
    }, 680);
  };

  const endAttention = () => {
    if (attentionTimer.current) clearTimeout(attentionTimer.current);
    attentionTimer.current = null;
    if (!attentionCategory) return;
    if (attentionHideTimer.current) clearTimeout(attentionHideTimer.current);
    attentionHideTimer.current = setTimeout(() => {
      setAttentionClosing(true);
      attentionHideTimer.current = setTimeout(() => {
        setAttentionCategory(null);
        setAttentionClosing(false);
        attentionHideTimer.current = null;
      }, 260);
    }, 500);
  };

  const clearAttention = useCallback(() => {
    if (attentionTimer.current) clearTimeout(attentionTimer.current);
    if (attentionHideTimer.current) clearTimeout(attentionHideTimer.current);
    attentionTimer.current = null;
    attentionHideTimer.current = null;
    setAttentionCategory(null);
    setAttentionClosing(false);
  }, []);

  const chooseCategory = (category: MinimalCategory) => {
    clearAttention();
    growBranch(category);
    setReaderSectionId(null);
    setActiveItem(null);
    setSelected(category);
  };

  const openXrayEntry = (category: MinimalCategory, entryId: string) => {
    clearAttention();
    const { itemId, sectionId } = xrayEntryTarget(entryId);
    const item = itemById.get(itemId);
    if (!item || item.category !== category) {
      chooseCategory(category);
      return;
    }
    setReaderSectionId(sectionId);
    setSelected(category);
    setActiveItem(item);
  };

  const rememberEntry = useCallback((category: MinimalCategory, entryId: string) => {
    growBranch(category);
    const previousGrowth = readGrowthCoverage();
    const growth = recordLeafCoverage(entryId);
    if (previousGrowth.entries.length === 0) unlockAchievement("leaf");
    if (hasAllLeaves(allLeafTargets, growth.entries)) unlockAchievement("all-leaves");
    const categoryEntries = readEntriesRef.current[category] ?? [];
    if (categoryEntries.includes(entryId)) return;
    const next = {
      ...readEntriesRef.current,
      [category]: [...categoryEntries, entryId],
    };
    readEntriesRef.current = next;
    setReadEntries(next);
    try {
      window.sessionStorage.setItem(
        SESSION_KEYS.readEntries,
        JSON.stringify(next),
      );
    } catch {
      // The visual still works when storage is unavailable.
    }
  }, [allLeafTargets, growBranch]);

  const toggleNight = () => {
    // Season changes remount the scene to replay branch growth. Ignore the
    // pointer still resting on the new sun until it deliberately leaves.
    sunHoverLockUntilRef.current = Date.now() + 800;
    const next = !night;
    setNight(next);
    if (next) unlockAchievement("night");
    try {
      window.sessionStorage.setItem(
        SESSION_KEYS.season,
        next ? "winter" : "day",
      );
    } catch {
      // The control still works when storage is unavailable.
    }
  };

  const resetVisit = () => {
    clearAttention();
    resetAchievements();
    setSelected(null);
    setActiveItem(null);
    setReaderSectionId(null);
    branchesRef.current = [];
    readEntriesRef.current = {};
    setBranches([]);
    setReadEntries({});
    setNight(false);
    setXrayActive(false);
    if (failureCloseTimer.current) clearTimeout(failureCloseTimer.current);
    failureCloseTimer.current = null;
    setFailureOpen(false);
    setFailureClosing(false);
    setFailureLoading(false);
    setFailureResponse(null);
    setFailureError(null);
    failureReturnScrollRef.current = 0;
    sessionIdRef.current = crypto.randomUUID();

    try {
      Object.values(SESSION_KEYS).forEach((key) => {
        window.sessionStorage.removeItem(key);
      });
      window.sessionStorage.setItem(SESSION_KEYS.active, "1");
      window.sessionStorage.setItem(
        SESSION_KEYS.sessionId,
        sessionIdRef.current,
      );
    } catch {
      // The in-memory reset still works when storage is unavailable.
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const revealWhatBroke = useCallback(async () => {
    clearAttention();
    if (!failureOpen) {
      failureReturnScrollRef.current = window.scrollY;
      unlockAchievement("break");
    }
    if (failureCloseTimer.current) clearTimeout(failureCloseTimer.current);
    failureCloseTimer.current = null;
    setFailureClosing(false);
    setFailureOpen(true);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (failureResponse || failureLoading) return;

    setFailureLoading(true);
    setFailureError(null);
    const recentPath = Array.from(
      new Set([
        ...(activeItem ? [activeItem.id] : []),
        ...Object.values(readEntries).flatMap((entries) => entries ?? []),
      ]),
    ).slice(-12);

    try {
      const response = await fetch("/api/living-corpus/what-broke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentPath,
          activeCategory: selected,
          sessionId: sessionIdRef.current || "anonymous",
        }),
      });
      if (!response.ok) throw new Error("The failure notes did not load.");
      setFailureResponse((await response.json()) as WhatBrokeResponse);
    } catch {
      setFailureError("The failure notes did not load.");
    } finally {
      setFailureLoading(false);
    }
  }, [
    activeItem,
    clearAttention,
    failureLoading,
    failureOpen,
    failureResponse,
    readEntries,
    selected,
  ]);

  const finishClosingWhatBroke = useCallback(() => {
    setFailureOpen(false);
    setFailureClosing(false);
    failureCloseTimer.current = null;
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: failureReturnScrollRef.current,
        left: 0,
        behavior: "auto",
      });
    });
  }, []);

  const closeWhatBroke = () => {
    if (failureClosing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClosingWhatBroke();
      return;
    }
    setFailureClosing(true);
    failureCloseTimer.current = setTimeout(finishClosingWhatBroke, 1490);
  };

  const retryWhatBroke = () => {
    setFailureResponse(null);
    setFailureError(null);
    setFailureLoading(false);
    void revealWhatBroke();
  };

  return (
    <div
      className={styles.page}
      data-night={night ? "true" : "false"}
      data-open={selected ? "true" : "false"}
      data-failure={failureOpen ? "true" : "false"}
      data-failure-closing={failureClosing ? "true" : "false"}
      data-xray={xrayActive && !failureOpen ? "true" : "false"}
      data-view={
        failureOpen ? "failure" : activeItem ? "reader" : selected ? "index" : "home"
      }
    >
      <Environment
        key={night ? "winter" : "daylight"}
        open={!failureOpen && selected !== null}
        branches={branches}
        readEntries={readEntries}
        night={night}
        sunHoverLockUntil={sunHoverLockUntilRef.current}
        onToggleNight={toggleNight}
        failure={failureOpen}
        xray={xrayActive && !failureOpen}
        onToggleXray={() => {
          clearAttention();
          const next = !xrayActive;
          setXrayActive(next);
          if (next) unlockAchievement("eclipse");
          try {
            window.sessionStorage.setItem(SESSION_KEYS.xray, String(next));
          } catch {
            // The eclipse still works when storage is unavailable.
          }
        }}
        onGust={() => void revealWhatBroke()}
        onOpenCategory={chooseCategory}
        onOpenEntry={openXrayEntry}
        itemById={itemById}
      />

      {failureOpen ? (
        <>
          <div className={styles.gust} aria-hidden="true" />
          <div className={styles.breakTransition} aria-hidden="true" />
        </>
      ) : null}

      <header className={styles.identity}>
        <button
          type="button"
          onClick={() => {
            clearAttention();
            setReaderSectionId(null);
            setActiveItem(null);
            setSelected(null);
          }}
        >
          Karthik Thyagarajan
        </button>
        <p>researcher · builder · writer</p>
      </header>

      <nav className={styles.menu} aria-label="Portfolio sections">
        {MINIMAL_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            data-selected={selected === category.id ? "true" : "false"}
            onBlur={endAttention}
            onClick={() => chooseCategory(category.id)}
            onFocus={() => beginAttention(category.id)}
            onPointerEnter={() => beginAttention(category.id)}
            onPointerLeave={endAttention}
          >
            {category.label}
          </button>
        ))}
      </nav>

      {attentionCategory && !selected && !failureOpen ? (
        <aside
          className={styles.gravityField}
          data-category={attentionCategory}
          data-closing={attentionClosing ? "true" : "false"}
          aria-label={`Related ${attentionCategory}`}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              endAttention();
            }
          }}
          onFocusCapture={holdAttention}
          onPointerEnter={holdAttention}
          onPointerLeave={endAttention}
        >
          {attentionItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.gravityItem}
              data-slot={index + 1}
              onFocus={holdAttention}
              onPointerEnter={holdAttention}
              onClick={() => {
                clearAttention();
                growBranch(item.category);
                rememberEntry(item.category, `${item.id}#opened`);
                setSelected(item.category);
                setReaderSectionId(null);
                setActiveItem(item);
              }}
            >
              <span className={styles.gravityMeta}>{item.meta}</span>
              <span className={styles.gravityTitle}>{item.title}</span>
              <span className={styles.gravityOpen}>open</span>
            </button>
          ))}
        </aside>
      ) : null}

      <div className={styles.shell}>
        {activeItem ? (
          <InlineReader
            item={activeItem}
            onBack={() => setActiveItem(null)}
            onRead={rememberEntry}
            focusSectionId={readerSectionId}
          />
        ) : selected ? (
          <main className={styles.index} key={selected}>
            <button
              type="button"
              className={styles.back}
              onClick={() => {
                setActiveItem(null);
                setSelected(null);
              }}
            >
              <ArrowIcon back />
              <span>all</span>
            </button>

            <ol className={styles.list}>
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      growBranch(item.category);
                      rememberEntry(item.category, `${item.id}#opened`);
                      setReaderSectionId(null);
                      setActiveItem(item);
                    }}
                  >
                    <div className={styles.itemHeading}>
                      <h2>{item.title}</h2>
                      <span className={styles.itemArrow}>
                        <ArrowIcon />
                      </span>
                    </div>
                    <p className={styles.meta}>{item.meta}</p>
                    <p className={styles.description}>{item.description}</p>
                  </button>
                </li>
              ))}
            </ol>
          </main>
        ) : null}
      </div>

      {failureOpen ? (
        <FailureView
          response={failureResponse}
          loading={failureLoading}
          error={failureError}
          onClose={closeWhatBroke}
          onRetry={retryWhatBroke}
        />
      ) : null}

      <nav className={styles.personalLinks} aria-label="Personal pages">
        <a href="/about">About</a>
        <a href="/gallery">Photos</a>
      </nav>
      <button
        type="button"
        className={styles.resetControl}
        aria-label="Reset visit and achievements"
        title="Reset visit and achievements"
        onClick={resetVisit}
      >
        ↺
      </button>
    </div>
  );
}
