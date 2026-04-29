"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useChatThread } from "@/app/components/ChatThread";



export type Artifact = { annotation?: string } & (
  | { kind: "work"; id: string; data: WorkData }
  | { kind: "project"; id: string; data: ProjectData }
  | { kind: "blog"; id: string; data: BlogData }
  | { kind: "involvement"; id: string; data: InvolvementData }
  | { kind: "note"; id: string; data: NoteData }
);

interface WorkData {
  role: string;
  company: string;
  year: string;
  description: string[];
  icon: string;
}

export interface ProjectLink {
  label: string;
  url: string;
  type:
    | "github"
    | "devpost"
    | "website"
    | "npm"
    | "appstore"
    | "linkedin"
    | "arxiv"
    | "pdf"
    | "youtube"
    | "instagram";
}

interface ProjectData {
  title: string;
  tools: string;
  date: string;
  link?: string;
  description: string;
  links?: ProjectLink[];
}

const PROJECT_LINK_LABEL: Record<ProjectLink["type"], string> = {
  github: "GitHub",
  devpost: "Devpost",
  website: "Visit",
  npm: "npm",
  appstore: "App Store",
  linkedin: "LinkedIn",
  arxiv: "arXiv",
  pdf: "PDF",
  youtube: "YouTube",
  instagram: "Instagram",
};

interface BlogData {
  title: string;
  slug: string;
  excerpt: string;
}

interface InvolvementData {
  title: string;
  role: string;
  date: string;
  slug: string;
  tagline: string;
  bullets: string[];
  links?: ProjectLink[];
}

interface NoteData {
  slug: string;
  title: string;
  tagline: string;
}

export type ArtifactMode = "panel" | "overlay";

export function ChatArtifact({
  artifact,
  index = 0,
  mode = "panel",
}: {
  artifact: Artifact;
  index?: number;
  mode?: ArtifactMode;
}) {
  const delay = `${index * 80}ms`;
  return (
    <div className="slip" style={{ animationDelay: delay }}>
      {artifact.kind === "work" && (
        <WorkArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} mode={mode} />
      )}
      {artifact.kind === "project" && (
        <ProjectArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} mode={mode} />
      )}
      {artifact.kind === "blog" && (
        <BlogArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} mode={mode} />
      )}
      {artifact.kind === "involvement" && (
        <InvolvementArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} mode={mode} />
      )}
      {artifact.kind === "note" && (
        <NoteArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} mode={mode} />
      )}
    </div>
  );
}

// Right-top annotation: textbox top-right of the card, circle anchor placed
// just below the title's bottom edge (Y measured by the parent shell). Lives
// inside the card. Used by project, blog, and involvement artifacts.
//
// Two reveal modes:
// - Hover (desktop, default): the wing unfolds when the parent card sets
//   `open` via hover or thread activation.
// - Tap (mobile, `interactive`): the wing is always rendered, the circle is
//   replaced with a pulsating accent dot, and a 44px invisible tap zone
//   sits over the circle so a tap (forwarded via `onToggle`) flips `open`.
function RightTopAnnotation({
  text,
  circleY,
  open = false,
  interactive = false,
  onToggle,
}: {
  text: string;
  circleY: number;
  open?: boolean;
  interactive?: boolean;
  onToggle?: () => void;
}) {
  // Geometry: desktop wing places the circle at vertical center (cy=44) with
  // the textbox above it (top:23 with translateY -50%). Interactive (mobile)
  // mode flips that: circle near the TOP, textbox unfolds DOWN-AND-INWARD
  // with a connector that bends from the circle down to the textbox edge.
  const wingWidth = interactive ? 200 : 240;
  const wingHeight = 80;
  const wingRight = interactive ? 16 : 90;
  const circleCx = interactive ? 12 : 6;
  const circleCy = interactive ? 14 : 44;
  const textboxRight = 4;
  const textboxWidth = interactive ? 170 : 200;
  const textboxTop = interactive ? 32 : 23;
  const pathStartX = circleCx + 3;
  const textboxLeftInWing = wingWidth - textboxRight - textboxWidth;
  // Desktop path bends UP to the textbox above the circle.
  // Interactive path bends DOWN to the textbox below the circle.
  const pathBendY = interactive ? textboxTop + 4 : 23;
  const path = interactive
    ? `M ${pathStartX} ${circleCy} L ${pathStartX + 14} ${pathBendY} L ${textboxLeftInWing + 4} ${pathBendY}`
    : `M ${pathStartX} 44 L ${pathStartX + 21} 23 L ${textboxLeftInWing + 10} 23`;

  // Anchor the wing so the circle sits at `circleY` in card coords.
  const wingTop = Math.max(circleY - circleCy, 0);

  return (
    <div
      aria-hidden={interactive ? undefined : "true"}
      className={`pointer-events-none absolute ${
        interactive ? "z-20 block" : "hidden lg:block"
      }`}
      style={{
        top: `${wingTop}px`,
        right: `${wingRight}px`,
        width: `${wingWidth}px`,
        height: `${wingHeight}px`,
      }}
    >
      <svg
        className="absolute inset-0 text-[var(--color-accent)] transition-opacity duration-200 ease-out"
        viewBox={`0 0 ${wingWidth} ${wingHeight}`}
        width={wingWidth}
        height={wingHeight}
        fill="none"
        style={{ opacity: open ? 0.8 : 0.4 }}
      >
        <path
          d={path}
          pathLength={1}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          style={{
            strokeDashoffset: open ? 0 : 1,
            transition: "stroke-dashoffset 120ms ease-out",
            transitionDelay: open ? "0ms" : "120ms",
          }}
        />
        {/* Desktop circle: SVG-drawn, no pulse. In interactive mode the SVG
            circle is replaced by a larger HTML dot below so we can pulse it
            via box-shadow keyframes. */}
        {!interactive && (
          <circle cx={circleCx} cy={circleCy} r={3} stroke="currentColor" strokeWidth="1.25" />
        )}
      </svg>

      {/* Interactive: doubled-size pulsating dot + 56px tap target over it. */}
      {interactive && (
        <>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute block h-[12px] w-[12px] rounded-full bg-[var(--color-accent)] ${
              open ? "" : "annot-pulse"
            }`}
            style={{ left: `${circleCx - 6}px`, top: `${circleCy - 6}px` }}
          />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? "Hide note" : "Show note"}
            className="pointer-events-auto absolute rounded-full"
            style={{
              left: `${circleCx - 28}px`,
              top: `${circleCy - 28}px`,
              width: 56,
              height: 56,
            }}
          />
        </>
      )}

      <div
        data-annot-textbox={interactive ? "true" : undefined}
        className="absolute rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left font-mono text-[11px] leading-[15px] tracking-[0.01em] shadow-[var(--shadow-soft)]"
        style={{
          right: `${textboxRight}px`,
          top: `${textboxTop}px`,
          width: `${textboxWidth}px`,
          // Interactive: anchored top-right, unfolds down-and-left.
          // Desktop:     vertically centered on top:23 line, scales vertically.
          transformOrigin: interactive ? "right top" : "left center",
          color: "var(--color-ink)",
          opacity: open ? 1 : 0,
          transform: interactive
            ? `scaleY(${open ? 1 : 0})`
            : `translateY(-50%) scaleY(${open ? 1 : 0})`,
          transition: "opacity 150ms ease-out, transform 160ms cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: open ? "120ms" : "0ms",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// Inline left-edge wing for the mobile overlay. Circle pulses at the card's
// left margin, textbox opens RIGHTWARD into the card body. Mirrors the
// right-top interactive wing geometry.
function LeftCenterInteractive({
  text,
  circleY,
  open,
  onToggle,
}: {
  text: string;
  circleY: number;
  open: boolean;
  onToggle?: () => void;
}) {
  const wingWidth = 200;
  const wingHeight = 80;
  const circleCx = 10;
  const circleCy = 14;
  const textboxLeft = 28;
  const textboxWidth = 168;
  const textboxTop = 32;
  const pathStartX = circleCx + 3;
  const pathBendY = textboxTop + 4;
  // Bend down-and-right from circle to the textbox's left edge.
  const path = `M ${pathStartX} ${circleCy} L ${pathStartX + 14} ${pathBendY} L ${textboxLeft + 4} ${pathBendY}`;
  const wingTop = Math.max(circleY - circleCy, 0);

  return (
    <div
      className="pointer-events-none absolute z-20 block"
      style={{
        top: `${wingTop}px`,
        left: "0px",
        width: `${wingWidth}px`,
        height: `${wingHeight}px`,
      }}
    >
      <svg
        className="absolute inset-0 text-[var(--color-accent)] transition-opacity duration-200 ease-out"
        viewBox={`0 0 ${wingWidth} ${wingHeight}`}
        width={wingWidth}
        height={wingHeight}
        fill="none"
        style={{ opacity: open ? 0.8 : 0.4 }}
      >
        <path
          d={path}
          pathLength={1}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          style={{
            strokeDashoffset: open ? 0 : 1,
            transition: "stroke-dashoffset 120ms ease-out",
            transitionDelay: open ? "0ms" : "120ms",
          }}
        />
      </svg>

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute block h-[12px] w-[12px] rounded-full bg-[var(--color-accent)] ${
          open ? "" : "annot-pulse"
        }`}
        style={{ left: `${circleCx - 6}px`, top: `${circleCy - 6}px` }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Hide note" : "Show note"}
        className="pointer-events-auto absolute rounded-full"
        style={{
          left: `${circleCx - 28}px`,
          top: `${circleCy - 28}px`,
          width: 56,
          height: 56,
        }}
      />

      <div
        data-annot-textbox="true"
        className="absolute rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left font-mono text-[11px] leading-[15px] tracking-[0.01em] shadow-[var(--shadow-soft)]"
        style={{
          left: `${textboxLeft}px`,
          top: `${textboxTop}px`,
          width: `${textboxWidth}px`,
          // Anchored top-left, unfolds down-and-right from the circle.
          transformOrigin: "left top",
          color: "var(--color-ink)",
          opacity: open ? 1 : 0,
          transform: `scaleY(${open ? 1 : 0})`,
          transition: "opacity 150ms ease-out, transform 160ms cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: open ? "120ms" : "0ms",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// Left-center annotation: circle anchor at the card's left edge, vertically
// centered.
// - Desktop (default): textbox opens LEFTWARD from the circle into the chat
//   area. Rendered as a portal with position:fixed so the textbox can extend
//   past the aside's overflow-y-auto clipping boundary.
// - Mobile / interactive: there's no chat area beside the card to extend
//   into, so the circle sits at the card's left margin and the textbox opens
//   RIGHTWARD into the card. Rendered inline (no portal) above body content.
function LeftCenterAnnotation({
  text,
  cardRef,
  open,
  circleY,
  interactive = false,
  onToggle,
}: {
  text: string;
  cardRef: RefObject<HTMLElement | null>;
  open: boolean;
  circleY: number;
  interactive?: boolean;
  onToggle?: () => void;
}) {
  if (interactive) {
    return (
      <LeftCenterInteractive
        text={text}
        circleY={circleY}
        open={open}
        onToggle={onToggle}
      />
    );
  }
  const [pos, setPos] = useState<{ top: number; left: number; height: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setPos(null);
        return;
      }
      if (r.bottom < 0 || r.top > window.innerHeight) {
        setPos(null);
        return;
      }
      setPos({ top: r.top, left: r.left, height: r.height });
    };
    update();
    // capture: true catches scrolls inside the aside scroll container too.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [cardRef]);

  if (!mounted || !pos) return null;

  // Wing anchored so the circle (cx:234, cy:40) sits just inside the card's
  // left edge, at the Y measured from the card's top. Textbox extends
  // leftward from the circle.
  const wingWidth = 240;
  const wingHeight = 80;
  // With translateY(-50%) applied, the visual circle Y equals the `top`
  // value exactly. circleY is already in card-local coords (relative to the
  // card's top), so pos.top + circleY is the circle's page Y.
  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[5] hidden lg:block"
      style={{
        top: `${pos.top + circleY}px`,
        left: `${pos.left - wingWidth + 10}px`,
        width: `${wingWidth}px`,
        height: `${wingHeight}px`,
        transform: "translateY(-50%)",
      }}
    >
      {/* Always-visible connector + circle anchor at the card's left edge. */}
      <svg
        className="absolute inset-0 text-[var(--color-accent)] transition-opacity duration-200 ease-out"
        viewBox={`0 0 ${wingWidth} ${wingHeight}`}
        width={wingWidth}
        height={wingHeight}
        fill="none"
        style={{ opacity: open ? 0.8 : 0.4 }}
      >
        <path
          d="M 234 40 L 214 20 L 194 20"
          pathLength={1}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          style={{
            strokeDashoffset: open ? 0 : 1,
            transition: "stroke-dashoffset 120ms ease-out",
            transitionDelay: open ? "0ms" : "120ms",
          }}
        />
        <circle cx={234} cy={40} r={3} stroke="currentColor" strokeWidth="1.25" />
      </svg>

      {/* Textbox: unfolds vertically on hover, after connector extends. */}
      <div
        className="absolute rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left font-mono text-[11px] leading-[15px] tracking-[0.01em] shadow-[var(--shadow-soft)]"
        style={{
          left: "4px",
          top: "20px",
          width: "190px",
          color: "var(--color-ink)",
          opacity: open ? 1 : 0,
          transform: `translateY(-50%) scaleY(${open ? 1 : 0})`,
          transformOrigin: "right center",
          transition: "opacity 150ms ease-out, transform 120ms ease-out",
          transitionDelay: open ? "120ms" : "0ms",
        }}
      >
        {text}
      </div>
    </div>,
    document.body,
  );
}

function ArtifactShell({
  artifactId,
  label,
  href,
  linkText,
  annotation,
  annotationVariant,
  annotationAnchor = "below-title",
  annotationBelowOffset = 10,
  mode = "panel",
  children,
}: {
  artifactId: string;
  label: string;
  href?: string;
  linkText?: string;
  annotation?: string;
  annotationVariant?: "right-top" | "left-center";
  // Where the anchor circle sits vertically relative to the card's title.
  // "below-title" (default): just below the title's bottom edge.
  // "title-center":           vertically centered on the title itself.
  annotationAnchor?: "below-title" | "title-center";
  // Pixel offset from the title's bottom when annotationAnchor is
  // "below-title". Defaults to 10. Projects and involvement use a tight 2.
  annotationBelowOffset?: number;
  mode?: ArtifactMode;
  children: React.ReactNode;
}) {
  const isOverlay = mode === "overlay";
  const thread = useChatThread();
  const articleRef = useRef<HTMLElement | null>(null);
  const [cardHovered, setCardHovered] = useState(false);

  // Register this card with the thread provider so the citation chips can
  // scroll to it on hover.
  useEffect(() => {
    if (!thread) return;
    const el = articleRef.current;
    thread.registerCard(artifactId, el);
    return () => thread.registerCard(artifactId, null);
  }, [thread, artifactId]);

  const isThreadActive = thread?.activeId === artifactId;
  // In overlay mode (touch), there's no hover. Tap toggles the wing open.
  const [annotationTapped, setAnnotationTapped] = useState(false);
  const annotationOpen = isOverlay
    ? annotationTapped
    : cardHovered || isThreadActive;
  // Bottom padding applied only when the open annotation actually overflows
  // the article's flow height (its absolute textbox extends past the natural
  // content bottom). Measured against scrollHeight vs clientHeight so we
  // never pad preemptively.
  const [overflowPad, setOverflowPad] = useState(0);
  useEffect(() => {
    if (!isOverlay) {
      setOverflowPad(0);
      return;
    }
    const article = articleRef.current;
    if (!article) return;
    if (!annotationTapped) {
      setOverflowPad(0);
      return;
    }
    const id = requestAnimationFrame(() => {
      const textbox = article.querySelector(
        "[data-annot-textbox]",
      ) as HTMLElement | null;
      const wing = textbox?.parentElement as HTMLElement | null;
      if (!textbox || !wing) {
        setOverflowPad(0);
        return;
      }
      // Measure the article's natural flow height with no extra padding.
      const prev = article.style.paddingBottom;
      article.style.paddingBottom = "0px";
      const naturalHeight = article.clientHeight;
      // Textbox bottom in article coords. Uses offsetTop chain (layout
      // position, ignores the scaleY transform on the textbox).
      const textboxBottom = wing.offsetTop + textbox.offsetTop + textbox.offsetHeight;
      article.style.paddingBottom = prev;
      // Require the article to extend at least textboxBottom + 10% buffer.
      // If the textbox already sits in the upper 90%, no pad needed.
      const required = textboxBottom + naturalHeight * 0.1;
      const pad = required - naturalHeight;
      setOverflowPad(pad > 0 ? Math.ceil(pad) : 0);
    });
    return () => cancelAnimationFrame(id);
  }, [annotationTapped, isOverlay, annotation]);
  // Title bounds in card-local coords (measured from the <h3> inside this
  // card). Falls back to sensible defaults before measurement completes.
  const [titleMetrics, setTitleMetrics] = useState<{
    center: number;
    bottom: number;
  }>({ center: 72, bottom: 90 });
  // Left-center has a desktop variant (portal extending left of card) and a
  // mobile interactive variant (inline, circle at left margin opening right).
  // Both branches live inside LeftCenterAnnotation; pick the variant by tag.
  const isLeftCenter = annotationVariant === "left-center";

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const measure = () => {
      const title = article.querySelector("h3");
      if (!title) return;
      const articleRect = article.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const top = titleRect.top - articleRect.top;
      const bottom = titleRect.bottom - articleRect.top;
      if (bottom > 0) {
        setTitleMetrics({ center: (top + bottom) / 2, bottom });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(article);
    return () => ro.disconnect();
  }, []);

  // Anchor the circle either at the title's vertical center or at a
  // configurable offset below the title's bottom edge. Overlay mode uses a
  // larger visible circle (12px vs 6px), so add extra vertical breathing room
  // below the title to match the heavier dot.
  const overlayBumpPx = isOverlay ? 10 : 0;
  const circleY =
    annotationAnchor === "title-center"
      ? titleMetrics.center + overlayBumpPx
      : titleMetrics.bottom + annotationBelowOffset + overlayBumpPx;

  // Clicking anywhere on the card triggers the card's primary link.
  // Implementation: find the first <a data-primary-link> descendant and
  // dispatch a click on it, inheriting whatever behavior that link has
  // (internal nav, external new-tab, etc.). Clicks on any anchor or button
  // are ignored so inner interactive elements still work normally.
  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    const primary = articleRef.current?.querySelector<HTMLAnchorElement>(
      "a[data-primary-link]",
    );
    if (primary) primary.click();
  };

  return (
    <article
      ref={articleRef}
      data-thread-card={artifactId}
      className={
        isOverlay
          ? "group relative"
          : `group relative cursor-pointer border-t py-7 transition-colors ${
              isThreadActive
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-hairline)] hover:border-[var(--color-accent)]"
            }`
      }
      style={
        isOverlay
          ? {
              paddingBottom: `${overflowPad}px`,
              transition: "padding-bottom 200ms ease-out",
            }
          : undefined
      }
      onMouseEnter={
        isOverlay
          ? undefined
          : () => {
              setCardHovered(true);
              if (thread) thread.setActive(artifactId);
            }
      }
      onMouseLeave={
        isOverlay
          ? undefined
          : () => {
              setCardHovered(false);
              if (thread) {
                // Only clear if WE'RE the active one — never stomp another
                // card/chip's activation.
                thread.setActive((prev) => (prev === artifactId ? null : prev));
              }
            }
      }
      onClick={
        isOverlay
          ? (e: React.MouseEvent<HTMLElement>) => {
              // In overlay mode, tapping anywhere on the card closes an open
              // annotation. Real interactive children (links, buttons — like
              // the wing's tap target itself) keep their normal behavior.
              if (!annotationTapped) return;
              const target = e.target as HTMLElement;
              if (target.closest("a, button")) return;
              setAnnotationTapped(false);
            }
          : handleCardClick
      }
    >
      {annotation && !isLeftCenter && (
        <RightTopAnnotation
          text={annotation}
          circleY={circleY}
          open={annotationOpen}
          interactive={isOverlay}
          onToggle={
            isOverlay ? () => setAnnotationTapped((v) => !v) : undefined
          }
        />
      )}
      {annotation && isLeftCenter && (
        <LeftCenterAnnotation
          text={annotation}
          cardRef={articleRef}
          open={annotationOpen}
          circleY={circleY}
          interactive={isOverlay}
          onToggle={
            isOverlay ? () => setAnnotationTapped((v) => !v) : undefined
          }
        />
      )}
      <header className="mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-accent)]" />
          {label}
        </span>
        {href && linkText && (
          <Link
            href={href}
            data-primary-link
            className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]"
          >
            {linkText}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      {children}
    </article>
  );
}

function WorkArtifact({ id, data, annotation, mode }: { id: string; data: WorkData; annotation?: string; mode?: ArtifactMode }) {
  const companyAnchor = `#${data.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return (
    <ArtifactShell
      artifactId={id}
      label="Work"
      href={`/work${companyAnchor}`}
      linkText="See timeline"
      annotation={annotation}
      annotationVariant="left-center"
      annotationBelowOffset={40}
      mode={mode}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-11 w-11 flex-none overflow-hidden rounded-md bg-[var(--color-surface-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.icon}
            alt={data.company}
            className="h-full w-full object-contain p-1.5"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-medium leading-tight tracking-tight text-[var(--color-ink)]">
            {data.role}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
            {data.company}{" "}
            <span className="text-[var(--color-ink-subtle)]">· {data.year}</span>
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 pl-[60px]">
        {data.description.slice(0, 3).map((bullet, i) => (
          <li
            key={i}
            className="relative pl-4 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]"
          >
            <span className="absolute left-0 top-[10px] h-px w-2 bg-[var(--color-hairline-strong)]" />
            {bullet}
          </li>
        ))}
      </ul>
    </ArtifactShell>
  );
}

function ProjectArtifact({ id, data, annotation, mode }: { id: string; data: ProjectData; annotation?: string; mode?: ArtifactMode }) {
  return (
    <ArtifactShell artifactId={id} label="Project" annotation={annotation} annotationBelowOffset={2} mode={mode}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[19px] font-medium leading-tight tracking-tight text-[var(--color-ink)]">
          {data.title}
        </h3>
        {data.link && (
          <Link
            href={data.link}
            data-primary-link
            className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]"
          >
            See full
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
        {data.date}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {data.tools}
      </p>
      <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-ink)]">
        {data.description}
      </p>
      {data.links && data.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-surface-raised)] px-3 py-1 text-[12px] text-[var(--color-ink)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {PROJECT_LINK_LABEL[link.type] ?? link.label}
              <ArrowUpRight className="h-3 w-3 opacity-60 transition-opacity group-hover/link:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </ArtifactShell>
  );
}

function InvolvementArtifact({
  id,
  data,
  annotation,
  mode,
}: {
  id: string;
  data: InvolvementData;
  annotation?: string;
  mode?: ArtifactMode;
}) {
  return (
    <ArtifactShell
      artifactId={id}
      label="Involvement"
      href={`/involvement#${data.slug}`}
      linkText="See full"
      annotation={annotation}
      annotationVariant="right-top"
      annotationBelowOffset={2}
      mode={mode}
    >
      <h3 className="text-[19px] font-medium leading-tight tracking-tight text-[var(--color-ink)]">
        {data.title}
      </h3>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        {data.role}{" "}
        <span className="text-[var(--color-ink-subtle)]">· {data.date}</span>
      </p>
      {data.tagline && (
        <p className="mt-3 font-serif text-[15px] italic leading-snug text-[var(--color-ink-muted)]">
          {data.tagline}
        </p>
      )}
      {data.bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {data.bullets.slice(0, 3).map((bullet, i) => (
            <li
              key={i}
              className="relative pl-4 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]"
            >
              <span className="absolute left-0 top-[10px] h-px w-2 bg-[var(--color-hairline-strong)]" />
              {bullet}
            </li>
          ))}
        </ul>
      )}
      {data.links && data.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-surface-raised)] px-3 py-1 text-[12px] text-[var(--color-ink)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {PROJECT_LINK_LABEL[link.type] ?? link.label}
              <ArrowUpRight className="h-3 w-3 opacity-60 transition-opacity group-hover/link:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </ArtifactShell>
  );
}

function BlogArtifact({ id, data, annotation, mode }: { id: string; data: BlogData; annotation?: string; mode?: ArtifactMode }) {
  return (
    <ArtifactShell
      artifactId={id}
      label="Writing"
      href={`/blog/${data.slug}`}
      linkText="Read full"
      annotation={annotation}
      mode={mode}
    >
      <h3 className="font-serif text-[22px] italic leading-tight text-[var(--color-ink)]">
        {data.title}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        {data.excerpt}
        {data.excerpt.length >= 200 && "…"}
      </p>
    </ArtifactShell>
  );
}

// NoteArtifact: a quote-only tile for non-artifact-tied takes
// (`topic:<slug>`). Renders the verbatim picker quote as the centerpiece —
// no metadata grid, no links, no annotation wing (the quote IS the artifact).
// Visually scaled to ~60% the height of a project card so it reads as a
// lightweight "Karthik's voice on this" surface in the receipts panel.
function NoteArtifact({ id, data, annotation, mode }: { id: string; data: NoteData; annotation?: string; mode?: ArtifactMode }) {
  // Fallback text for the rare case where a topic surfaces without a picker
  // quote (corpus is empty or the picker rejected every candidate). Keeps the
  // tile from rendering blank — but the card's whole reason to exist is the
  // quote, so this should be vanishingly rare.
  const quote = annotation && annotation.trim().length > 0
    ? annotation.trim()
    : (data.tagline || "");
  const isOverlay = mode === "overlay";
  const thread = useChatThread();
  const articleRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOverlay || !thread) return;
    const el = articleRef.current;
    thread.registerCard(id, el);
    return () => thread.registerCard(id, null);
  }, [thread, id, isOverlay]);
  const isThreadActive = thread?.activeId === id;
  return (
    <article
      ref={articleRef}
      data-thread-card={id}
      onMouseEnter={isOverlay ? undefined : () => thread?.setActive(id)}
      onMouseLeave={
        isOverlay
          ? undefined
          : () => thread?.setActive((prev) => (prev === id ? null : prev))
      }
      className={
        isOverlay
          ? "group relative"
          : `group relative border-t py-5 transition-colors ${
              isThreadActive
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-hairline)] hover:border-[var(--color-accent)]"
            }`
      }
    >
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-accent)]" />
          Take
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          {data.title}
        </span>
      </header>
      <blockquote className="border-l-2 border-[var(--color-accent)] pl-4">
        <p className="font-serif text-[16px] italic leading-snug text-[var(--color-ink)]">
          {quote}
        </p>
      </blockquote>
      <p className="mt-3 text-right font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
        — Karthik
      </p>
    </article>
  );
}

