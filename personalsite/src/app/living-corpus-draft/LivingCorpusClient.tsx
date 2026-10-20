"use client";

import Image from "next/image";
import { corpusSectionHref, corpusSectionFromPath } from "@/lib/living-corpus/links";
import { collection } from "@/data/collection";
import RssLink from "@/app/components/RssLink";
import CorpusNavigation from "@/app/components/CorpusNavigation";
import {
  Fragment,
  ViewTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
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
import { PERSONAL_PAGES, type PersonalPage } from "@/lib/living-corpus/personalGrowth";
import styles from "./living-corpus.module.css";
import { CONTACT_TOPICS, CONTACT_NOTE_HREF, CONTACT_NOTE_ID } from "@/lib/living-corpus/contactInvitation";

const FAILURE_TRANSITION_MS = 560;
const FAILURE_GLITCH_MS = 180;

const CONTACT_LINKS = [
  { label: "Email", href: "mailto:karthik6002@gmail.com", title: "karthik6002@gmail.com", icon: "mail" },
  { label: "GitHub", href: "https://github.com/karthikcsq", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/karthikthyagarajan06", icon: "linkedin" },
  { label: "X", href: "https://x.com/karthikthy", icon: "x" },
] as const;

function ContactIcon({ name }: { name: "mail" | "github" | "linkedin" | "x" }) {
  if (name === "mail") {
    return (
      <svg className={`${styles.contactIcon} ${styles.contactMailIcon}`} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg className={styles.contactIcon} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.311 17.403Z" />
      </svg>
    );
  }

  return (
    <svg className={styles.contactIcon} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      {name === "github" ? (
        <path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.103.768-.244.768-.542 0-.267-.01-.975-.015-1.914-3.13.68-3.79-1.508-3.79-1.508-.511-1.299-1.248-1.644-1.248-1.644-1.022-.699.077-.685.077-.685 1.13.08 1.725 1.16 1.725 1.16 1.004 1.72 2.633 1.223 3.274.936.103-.728.393-1.223.714-1.505-2.499-.284-5.126-1.249-5.126-5.563 0-1.229.439-2.233 1.16-3.02-.117-.284-.503-1.428.11-2.977 0 0 .945-.303 3.094 1.154A10.78 10.78 0 0 1 12 6.187c.956.005 1.919.13 2.819.38 2.148-1.456 3.09-1.154 3.09-1.154.617 1.55.23 2.693.113 2.977.723.787 1.159 1.791 1.159 3.02 0 4.325-2.631 5.276-5.138 5.555.404.35.764 1.043.764 2.101 0 1.516-.014 2.738-.014 3.11 0 .3.203.65.774.54A11.25 11.25 0 0 0 12 .75Z" />
      ) : (
        <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.52 2.8-1.52 3 0 3.56 1.97 3.56 4.53v5.24Z" />
      )}
    </svg>
  );
}

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

function leafStyle(index: number, category: GrowthCategory): CSSProperties {
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
  writing: { angle: -56, flipped: true },
  involvement: { angle: -18, flipped: false },
  about: { angle: -30, flipped: false },
  photos: { angle: -60, flipped: true },
} satisfies Record<
  GrowthCategory,
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
  category: GrowthCategory,
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

type GrowthCategory = MinimalCategory | PersonalPage;
const GROWTH_CATEGORIES: readonly { id: GrowthCategory }[] = [...MINIMAL_CATEGORIES, ...PERSONAL_PAGES.map((id) => ({ id }))];
type ReadEntries = Partial<Record<GrowthCategory, string[]>>;

function syncSectionUrl(category: MinimalCategory | null, itemId?: string, sectionId?: string | null, push = true) {
  const url = new URL(window.location.href);
  url.pathname = category ? corpusSectionHref(category) : "/";
  url.searchParams.delete("section");
  if (itemId) url.searchParams.set("item", itemId);
  else url.searchParams.delete("item");
  url.hash = sectionId ?? "";
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    if (push) window.history.pushState(null, "", nextUrl);
    else window.history.replaceState(null, "", nextUrl);
  }
}

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
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
  const continuous = item.readingStyle === "continuous";
  const [highlightedSectionId, setHighlightedSectionId] = useState(focusSectionId);

  useEffect(() => {
    if (continuous) readerRef.current?.focus({ preventScroll: true });
  }, [item.id, continuous]);

  useEffect(() => {
    setHighlightedSectionId(focusSectionId);
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
      if (section instanceof HTMLElement && continuous) section.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [item.id, focusSectionId, continuous]);

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
    setHighlightedSectionId(sectionId);
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
    <section className={styles.reader} ref={readerRef} key={item.id} data-continuous={continuous || undefined} tabIndex={continuous ? -1 : undefined} aria-label={item.title}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowIcon back />
        <span>{continuous ? "home" : item.category}</span>
      </button>

      <header className={styles.readerHeader} data-corpus-overview>
        {item.meta ? <p className={styles.meta}>{item.meta}</p> : null}
        <h1>{item.title}</h1>
        {item.description ? <p>{item.description}</p> : null}
      </header>

      {showReference ? (
        <ul className={styles.referenceList} aria-label={`${item.title} highlights`}>
          {item.referenceItems.map((reference) => (
            <li key={reference}>{reference}</li>
          ))}
        </ul>
      ) : null}

      {!continuous && item.links?.length ? (
        <div className={styles.readerLinks}>
          {item.links?.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
          ))}
        </div>
      ) : null}

      <ReaderMedia media={item.media} />

      {!continuous && bodySections.length > 0 ? (
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

      {bodySections.length ? (
        <div className={styles.noteSections}>
          {bodySections.map((section) => (
            <section key={section.id} id={continuous ? section.id : undefined} tabIndex={continuous ? -1 : undefined} aria-label={continuous ? section.heading : undefined} data-corpus-section={section.id} data-highlighted={highlightedSectionId === section.id || undefined}>
              {section.heading.toLowerCase() !== item.title.toLowerCase() ? (
                <h2>{section.heading}</h2>
              ) : null}
              {section.html ? (
                <div dangerouslySetInnerHTML={{ __html: section.html }} />
              ) : <p>{section.text}</p>}
              <ReaderMedia media={section.media} />
            </section>
          ))}
        </div>
      ) : null}
    </section>
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
  branches: GrowthCategory[];
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
  const [readyBranches, setReadyBranches] = useState<Set<GrowthCategory>>(
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
    if (failure) return;
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
  }, [open, failure]);

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
    const physics = pullPhysicsRef.current;
    if (physics.frame) window.cancelAnimationFrame(physics.frame);
    physics.frame = 0;
    if (failure) {
      dragRef.current = null;
      return;
    }
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
      <ViewTransition name="corpus-sun" share="corpus-sun" default="none">
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
      </ViewTransition>
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
              { className: styles.branchRootLayer, categories: ["work", "projects", "about"] },
              { className: styles.branchTipLayer, categories: ["involvement", "writing", "photos"] },
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
                  (layer.categories as readonly GrowthCategory[]).includes(category),
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
                        onClick={() => {
                          if (category === "about" || category === "photos") window.location.assign(category === "photos" ? "/gallery" : "/about");
                          else onOpenCategory(category);
                        }}
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
                            aria-label={`Open ${category === "about" || category === "photos" ? category : xrayEntryLabel(entryId, itemById)}`}
                            onClick={() => {
                              if (category === "about" || category === "photos") window.location.assign(category === "photos" ? "/gallery" : "/about");
                              else onOpenEntry(category, entryId);
                            }}
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

function FailureGlitchText({ children }: { children: string }) {
  return (
    <span className={styles.failureGlitchText}>
      {children}
      <span className={styles.failureGlitchCopy} data-slice="one" aria-hidden="true">{children}</span>
      <span className={styles.failureGlitchCopy} data-slice="two" aria-hidden="true">{children}</span>
    </span>
  );
}

function FailureView({
  response,
  loading,
  error,
  closing,
  onClose,
  onRetry,
}: {
  response: WhatBrokeResponse | null;
  loading: boolean;
  error: string | null;
  closing: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const viewRef = useRef<HTMLElement>(null);
  const visibleTextRef = useRef(new Set<HTMLElement>());

  useEffect(() => {
    const text = viewRef.current?.querySelectorAll<HTMLElement>(`.${styles.failureGlitchText}`);
    if (!text) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          visibleTextRef.current.add(node);
          node.dataset.glitchVisible = "true";
        } else {
          visibleTextRef.current.delete(node);
          delete node.dataset.glitchVisible;
          delete node.dataset.glitch;
        }
      }
    });
    text.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      text.forEach((node) => {
        visibleTextRef.current.delete(node);
        delete node.dataset.glitchVisible;
        delete node.dataset.glitch;
      });
    };
  }, [response, loading, error]);

  useEffect(() => {
    if (closing) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let nextGlitch: ReturnType<typeof setTimeout> | undefined;
    let endGlitch: ReturnType<typeof setTimeout> | undefined;
    const activeText = new Set<HTMLElement>();
    const clearPulse = () => {
      activeText.forEach((node) => delete node.dataset.glitch);
      activeText.clear();
    };
    const stop = () => {
      clearTimeout(nextGlitch);
      clearTimeout(endGlitch);
      clearPulse();
    };
    const pulse = () => {
      if (reducedMotion.matches || document.visibilityState !== "visible") return;
      // Transient DOM flags leave the homepage and tree out of each pulse.
      visibleTextRef.current.forEach((node) => {
        node.dataset.glitch = "true";
        activeText.add(node);
      });
      endGlitch = setTimeout(clearPulse, FAILURE_GLITCH_MS);
      nextGlitch = setTimeout(pulse, 2000 + Math.random() * 5000);
    };
    const restart = () => {
      stop();
      if (!reducedMotion.matches && document.visibilityState === "visible") {
        // Let the first paint and viewport observations finish before glitching.
        nextGlitch = setTimeout(pulse, 120);
      }
    };
    restart();
    reducedMotion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      stop();
      reducedMotion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [closing]);

  return (
    <section ref={viewRef} className={styles.failureView} id="what-broke">
      <button type="button" className={styles.back} onClick={onClose}>
        <ArrowIcon back />
        <span>Back</span>
      </button>
      <header className={styles.failureHeader}>
        <h1><FailureGlitchText>What broke</FailureGlitchText></h1>
        <p>
          <FailureGlitchText>Wrong assumptions, abandoned approaches, and things I would build differently.</FailureGlitchText>
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
          <p><FailureGlitchText>{error}</FailureGlitchText></p>
          <button type="button" onClick={onRetry}>
            <FailureGlitchText>try again</FailureGlitchText>
          </button>
        </div>
      ) : (
        <div className={styles.failureList}>
          {(response?.excerpts ?? []).map((excerpt) => (
            <article key={excerpt.id}>
              <p className={styles.meta}>
                <FailureGlitchText>{`${excerpt.source} · ${excerpt.meta}`}</FailureGlitchText>
              </p>
              <h2><FailureGlitchText>{excerpt.heading}</FailureGlitchText></h2>
              <p><FailureGlitchText>{excerpt.text}</FailureGlitchText></p>
              <a href={excerpt.href}>
                <FailureGlitchText>open note</FailureGlitchText>
                <ArrowIcon />
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function LivingCorpusClient({
  items,
  initialSection = null,
  initialItemId,
  latestPost,
  founderBrief,
}: {
  items: MinimalCorpusItem[];
  initialSection?: MinimalCategory | null;
  initialItemId?: string;
  latestPost?: { title: string; href: string };
  founderBrief?: ReactNode;
}) {
  const [selected, setSelected] = useState<MinimalCategory | null>(initialSection);
  const [animateIndex, setAnimateIndex] = useState(initialSection === null);
  const [activeItem, setActiveItem] = useState<MinimalCorpusItem | null>(() => items.find((item) => item.id === initialItemId) ?? null);
  const [readerSectionId, setReaderSectionId] = useState<string | null>(null);
  const [branches, setBranches] = useState<GrowthCategory[]>([]);
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
  const branchesRef = useRef<GrowthCategory[]>([]);
  const readEntriesRef = useRef<ReadEntries>({});
  const attentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attentionHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sunHoverLockUntilRef = useRef(0);
  const sessionIdRef = useRef("");
  const failureReturnScrollRef = useRef(0);
  const pageRef = useRef<HTMLElement>(null);
  const invitationRef = useRef<HTMLAnchorElement>(null);
  const featuredProject = items.find((item) => item.id === "project:tavi");
  const previousItemRef = useRef(activeItem?.id);
  useEffect(() => {
    const returningHome = previousItemRef.current === CONTACT_NOTE_ID && !activeItem && !selected;
    previousItemRef.current = activeItem?.id;
    if (!returningHome) return;
    // Wait until the entrance's visibility transition has restored its links.
    const timer = setTimeout(() => invitationRef.current?.focus({ preventScroll: true }),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240);
    return () => clearTimeout(timer);
  }, [activeItem, selected]);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  useEffect(() => {
    const label = MINIMAL_CATEGORIES.find(({ id }) => id === selected)?.label;
    document.title = label ? `${label} · Karthik Thyagarajan` : "Karthik Thyagarajan";
    document.querySelector('link[rel="canonical"]')?.setAttribute(
      "href", `https://www.karthikthyagarajan.com${selected ? corpusSectionHref(selected) : "/"}`,
    );
  }, [selected]);

  const allLeafTargets = useMemo(() => leafTargets(items), [items]);
  const contactNote = itemById.get(CONTACT_NOTE_ID);

  useEffect(() => {
    const restoreUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const item = itemById.get(params.get("item") ?? "") ?? null;
      const requested = params.get("section");
      const category = item?.category ?? corpusSectionFromPath(window.location.pathname) ?? MINIMAL_CATEGORIES.find(
        ({ id }) => id === (requested === "ideas" ? "writing" : requested),
      )?.id ?? null;
      setSelected(category);
      setActiveItem(item);
      setReaderSectionId(window.location.hash.slice(1) || null);
    };
    window.addEventListener("popstate", restoreUrl);
    return () => window.removeEventListener("popstate", restoreUrl);
  }, [itemById]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    delete page.dataset.failureSettled;
    if (!failureOpen || failureClosing) return;
    const settleTimer = setTimeout(() => {
      page.dataset.failureSettled = "true";
    }, FAILURE_TRANSITION_MS);
    return () => {
      clearTimeout(settleTimer);
      delete page.dataset.failureSettled;
    };
  }, [failureOpen, failureClosing]);

  useEffect(() => {
    let hash = window.location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch { return; }
    if (initialItemId) {
      setReaderSectionId(hash || null);
      return;
    }
    if (!initialSection || !hash) return;
    const linkedItem = items.find((item) => item.category === initialSection && item.id.split(":")[1] === hash);
    if (linkedItem) {
      if ((linkedItem.category === "writing" && linkedItem.readingStyle !== "continuous" && linkedItem.fullTextHref)) {
        window.location.replace(linkedItem.fullTextHref);
        return;
      }
      setActiveItem(linkedItem);
      syncSectionUrl(linkedItem.category, linkedItem.id, null, false);
    }
  }, [initialItemId, initialSection, items]);
  const visibleItems = selected
    ? items.filter((item) => item.category === selected && item.id !== CONTACT_NOTE_ID)
    : [];
  const attentionItems = attentionCategory
    ? (() => {
        const inspectedIds = new Set(
          (readEntries[attentionCategory] ?? []).map(
            (entryId) => entryId.split("#")[0],
          ),
        );
        const categoryItems = items.filter(
          (item) => item.id !== CONTACT_NOTE_ID && item.category === attentionCategory,
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
      ) as string[];
      const requestedSection = new URLSearchParams(window.location.search).get("section");
      const linkedCategory = corpusSectionFromPath(window.location.pathname) ?? MINIMAL_CATEGORIES.find(
        (category) => category.id === (requestedSection === "ideas" ? "writing" : requestedSection),
      )?.id;
      const restoredBranches = [...new Set(savedBranches.map((branch) =>
        branch === "ideas" ? "writing" : branch,
      ))].filter((branch): branch is GrowthCategory =>
        GROWTH_CATEGORIES.some((category) => category.id === branch),
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
      ) as ReadEntries & { ideas?: string[] };
      const restoredReadEntries = Object.fromEntries(
        GROWTH_CATEGORIES.map(({ id }) => {
          const saved = [
            ...(Array.isArray(savedReadEntries[id]) ? savedReadEntries[id] : []),
            ...(id === "writing" && Array.isArray(savedReadEntries.ideas)
              ? savedReadEntries.ideas
              : []),
          ];
          return [id, [...new Set(saved.filter(
            (entryId): entryId is string => typeof entryId === "string" && entryId !== "page:photos#opened",
          ))]];
        }),
      ) as ReadEntries;
      readEntriesRef.current = restoredReadEntries;
      setReadEntries(restoredReadEntries);
      const restoredNight = window.sessionStorage.getItem(SESSION_KEYS.season) === "winter";
      setNight(restoredNight);
      // Achievements persist across visits even though the visible tree is a
      // session trail. Fold the saved trail into cumulative growth coverage.
      restoredBranches.forEach((branch) => {
        if (branch !== "about" && branch !== "photos") recordBranchCoverage(branch);
      });
      GROWTH_CATEGORIES.forEach(({ id }) =>
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
    setAnimateIndex(selected === null);
    syncSectionUrl(category);
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
    if ((item.category === "writing" && item.readingStyle !== "continuous" && item.fullTextHref)) {
      window.location.assign(item.fullTextHref);
      return;
    }
    setReaderSectionId(sectionId);
    syncSectionUrl(category, item.id, sectionId);
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

  const openLandingItem = (event: ReactMouseEvent<HTMLAnchorElement>, item: MinimalCorpusItem, sectionId: string | null = null) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    clearAttention();
    growBranch(item.category);
    rememberEntry(item.category, `${item.id}#opened`);
    syncSectionUrl(item.category, item.id, sectionId, true);
    setReaderSectionId(sectionId);
    setSelected(item.category);
    setActiveItem(item);
  };

  const resetVisit = () => {
    clearAttention();
    resetAchievements();
    syncSectionUrl(null);
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
    failureCloseTimer.current = setTimeout(finishClosingWhatBroke, FAILURE_TRANSITION_MS);
  };

  const retryWhatBroke = () => {
    setFailureResponse(null);
    setFailureError(null);
    setFailureLoading(false);
    void revealWhatBroke();
  };

  return (
    <main
      ref={pageRef}
      className={styles.page}
      data-corpus-page="home"
      data-animate-index={animateIndex ? "true" : "false"}
      data-night={night ? "true" : "false"}
      data-open={selected ? "true" : "false"}
      data-failure={failureOpen ? "true" : "false"}
      data-failure-closing={failureClosing ? "true" : "false"}
      style={{
        "--failure-transition-duration": `${FAILURE_TRANSITION_MS}ms`,
        "--failure-glitch-duration": `${FAILURE_GLITCH_MS}ms`,
      } as CSSProperties}
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

      <ViewTransition name="corpus-identity" share="corpus-identity" default="none">
      <header className={styles.identity}>
        <button
          type="button"
          onClick={() => {
            clearAttention();
            syncSectionUrl(null);
            setReaderSectionId(null);
            setActiveItem(null);
            setSelected(null);
          }}
        >
          Karthik Thyagarajan
        </button>
        <nav className={styles.contact} aria-label="Contact and profiles">
          <div className={styles.contactLinks}>
            {CONTACT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                aria-label={link.label}
                className={styles.contactIconLink}
                title={"title" in link ? link.title : link.label}
              >
                <ContactIcon name={link.icon} />
                <svg className={styles.contactLeaf} aria-hidden="true" viewBox="0 0 48 24">
                  <path className={styles.contactLeafShape} d="M5 20C8 6 25 1 42 4C39 16 23 24 5 20Z" />
                  <path className={styles.contactLeafVein} d="M2 22L36 7M15 17L16 10M23 13L30 15" />
                </svg>
              </a>
            ))}
          </div>
        </nav>
      </header>
      </ViewTransition>

      <CorpusNavigation
        className={styles.menu}
        current={selected}
        onSelectCategory={chooseCategory}
        onAttentionStart={beginAttention}
        onAttentionEnd={endAttention}
      />

      <div className={styles.landingNotes} aria-hidden={selected !== null || failureOpen} inert={selected !== null || failureOpen}>
      {contactNote ? (
        <p className={styles.invitation}>
          Building {CONTACT_TOPICS.map((topic, index) => (
            <Fragment key={topic.section}>
              {index === 0 ? "" : index === CONTACT_TOPICS.length - 1 ? ", or " : ", "}
              <a ref={index === 0 ? invitationRef : undefined} href={`${CONTACT_NOTE_HREF}#${topic.section}`} onClick={(event) => openLandingItem(event, contactNote, topic.section)}>
                {topic.label}
              </a>
            </Fragment>
          ))}?{" "}
          <span className={styles.talk}>Let’s talk.</span>
        </p>
      ) : null}

      <div className={styles.landingFeatures}>
      {featuredProject ? (
        <div className={styles.currentlyBuilding}>
          <span className={styles.latestLabel}>Currently building</span>
          <a href={`${featuredProject.href}#overview`} onClick={(event) => openLandingItem(event, featuredProject, "overview")}>
            {featuredProject.title}
          </a>
        </div>
      ) : null}

      {latestPost ? (
        <a
          className={styles.latestPost}
          href={latestPost.href}
        >
          <span className={styles.latestLabel}>Latest writing</span>
          <span className={styles.latestTitle}>{latestPost.title} <span aria-hidden="true">↗</span></span>
        </a>
      ) : null}
      </div>
      </div>

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
                if ((item.category === "writing" && item.readingStyle !== "continuous" && item.fullTextHref)) {
                  window.location.assign(item.fullTextHref);
                  return;
                }
                clearAttention();
                growBranch(item.category);
                rememberEntry(item.category, `${item.id}#opened`);
                syncSectionUrl(item.category, item.id);
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
            key={activeItem.id}
            item={activeItem}
            onBack={() => {
              const home = activeItem.readingStyle === "continuous";
              syncSectionUrl(home ? null : selected);
              setActiveItem(null);
              setReaderSectionId(null);
              if (home) {
                setSelected(null);
                window.scrollTo({ top: 0, behavior: "instant" });
              }
            }}
            onRead={rememberEntry}
            focusSectionId={readerSectionId}
          />
        ) : selected ? (
          <section className={styles.index}>
            <div className={styles.indexActions}>
            <button
              type="button"
              className={styles.back}
              onClick={() => {
                setActiveItem(null);
                syncSectionUrl(null);
                setSelected(null);
              }}
            >
              <ArrowIcon back />
              <span>all</span>
            </button>
            {selected === "writing" ? (
              <RssLink />
            ) : null}
            </div>

            <ol className={styles.list}>
              {visibleItems.map((item) => (
                <Fragment key={item.id}>
                  <li>
                    <a
                      href={(item.category === "writing" && item.readingStyle !== "continuous" && item.fullTextHref) ? item.fullTextHref : item.href}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || (item.category === "writing" && item.readingStyle !== "continuous" && item.fullTextHref)) return;
                        event.preventDefault();
                        growBranch(item.category);
                        rememberEntry(item.category, `${item.id}#opened`);
                        setReaderSectionId(null);
                        syncSectionUrl(item.category, item.id);
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
                    </a>
                  </li>
                </Fragment>
              ))}
            </ol>
            {selected === "writing" ? (
              <section className={styles.collection} id="collection" aria-labelledby="collection-heading">
                <h2 className={styles.collectionHeading} id="collection-heading">Recommended reading</h2>
                <ul className={styles.list}>
                  {collection.map((entry) => (
                    <li key={entry.id}>
                      <a href={entry.href} target="_blank" rel="noopener noreferrer">
                        <div className={styles.itemHeading}>
                          <h3>{entry.title}</h3>
                          <span className={styles.collectionArrow} aria-hidden="true">↗</span>
                        </div>
                        <p className={styles.meta}>{entry.author}</p>
                        <p className={styles.description}>{entry.note}</p>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </section>
        ) : null}
      </div>

      {failureOpen ? (
        <FailureView
          response={failureResponse}
          loading={failureLoading}
          error={failureError}
          closing={failureClosing}
          onClose={closeWhatBroke}
          onRetry={retryWhatBroke}
        />
      ) : null}

      {founderBrief}

      <button
        type="button"
        className={styles.resetControl}
        aria-label="Reset visit and achievements"
        title="Reset visit and achievements"
        onClick={resetVisit}
      >
        ↺
      </button>
    </main>
  );
}
