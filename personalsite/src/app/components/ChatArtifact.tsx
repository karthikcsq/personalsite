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

export function ChatArtifact({ artifact, index = 0 }: { artifact: Artifact; index?: number }) {
  const delay = `${index * 80}ms`;
  return (
    <div className="slip" style={{ animationDelay: delay }}>
      {artifact.kind === "work" && (
        <WorkArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "project" && (
        <ProjectArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "blog" && (
        <BlogArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "involvement" && (
        <InvolvementArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "note" && (
        <NoteArtifact id={artifact.id} data={artifact.data} annotation={artifact.annotation} />
      )}
    </div>
  );
}

// Right-top annotation: textbox top-right of the card, circle anchor placed
// just below the title's bottom edge (Y measured by the parent shell).
// Lives inside the card. Used by project, blog, and involvement artifacts.
// The wing sits offset from the card's right edge so it doesn't overlap the
// header's "See full"/"Read full" link when the title-center anchor pulls
// the textbox up into the header row.
function RightTopAnnotation({
  text,
  circleY,
  open = false,
}: {
  text: string;
  circleY: number;
  open?: boolean;
}) {
  // Wing internal geometry places the circle at cy=44 within an 80-tall wing.
  // So the wing's top edge is (circleY - 44) in card-local coords.
  const wingTop = Math.max(circleY - 44, 0);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute hidden lg:block"
      style={{ top: `${wingTop}px`, right: "90px", width: "240px", height: "80px" }}
    >
      <svg
        className="absolute inset-0 text-[var(--color-accent)] transition-opacity duration-200 ease-out"
        viewBox="0 0 240 80"
        width={240}
        height={80}
        fill="none"
        style={{ opacity: open ? 0.8 : 0.4 }}
      >
        <path
          d="M 9 44 L 30 23 L 40 23"
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
        <circle cx={6} cy={44} r={3} stroke="currentColor" strokeWidth="1.25" />
      </svg>
      <div
        className="absolute rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left font-mono text-[11px] leading-[15px] tracking-[0.01em] shadow-[var(--shadow-soft)]"
        style={{
          right: "4px",
          top: "23px",
          width: "200px",
          transformOrigin: "left center",
          color: "var(--color-ink)",
          opacity: open ? 1 : 0,
          transform: `translateY(-50%) scaleY(${open ? 1 : 0})`,
          transition: "opacity 150ms ease-out, transform 120ms ease-out",
          transitionDelay: open ? "120ms" : "0ms",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// Left-center annotation: circle anchor at the card's left edge, vertically
// centered. Textbox opens LEFTWARD from the circle into the chat area.
// Rendered as a portal with position:fixed so the textbox can extend past
// the aside's overflow-y-auto clipping boundary.
function LeftCenterAnnotation({
  text,
  cardRef,
  open,
  circleY,
}: {
  text: string;
  cardRef: RefObject<HTMLElement | null>;
  open: boolean;
  circleY: number;
}) {
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
  children: React.ReactNode;
}) {
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
  // Drive the wing reveal off either local hover or thread activation.
  const annotationOpen = cardHovered || isThreadActive;
  // Title bounds in card-local coords (measured from the <h3> inside this
  // card). Falls back to sensible defaults before measurement completes.
  const [titleMetrics, setTitleMetrics] = useState<{
    center: number;
    bottom: number;
  }>({ center: 72, bottom: 90 });
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
  // configurable offset below the title's bottom edge.
  const circleY =
    annotationAnchor === "title-center"
      ? titleMetrics.center
      : titleMetrics.bottom + annotationBelowOffset;

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
      className={`group relative cursor-pointer border-t py-7 transition-colors ${
        isThreadActive
          ? "border-[var(--color-accent)]"
          : "border-[var(--color-hairline)] hover:border-[var(--color-accent)]"
      }`}
      onMouseEnter={() => {
        setCardHovered(true);
        if (thread) thread.setActive(artifactId);
      }}
      onMouseLeave={() => {
        setCardHovered(false);
        if (thread) {
          // Only clear if WE'RE the active one — never stomp another
          // card/chip's activation.
          thread.setActive((prev) => (prev === artifactId ? null : prev));
        }
      }}
      onClick={handleCardClick}
    >
      {annotation && !isLeftCenter && (
        <RightTopAnnotation
          text={annotation}
          circleY={circleY}
          open={annotationOpen}
        />
      )}
      {annotation && isLeftCenter && (
        <LeftCenterAnnotation
          text={annotation}
          cardRef={articleRef}
          open={annotationOpen}
          circleY={circleY}
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

function WorkArtifact({ id, data, annotation }: { id: string; data: WorkData; annotation?: string }) {
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

function ProjectArtifact({ id, data, annotation }: { id: string; data: ProjectData; annotation?: string }) {
  return (
    <ArtifactShell artifactId={id} label="Project" annotation={annotation} annotationBelowOffset={2}>
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
}: {
  id: string;
  data: InvolvementData;
  annotation?: string;
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

function BlogArtifact({ id, data, annotation }: { id: string; data: BlogData; annotation?: string }) {
  return (
    <ArtifactShell
      artifactId={id}
      label="Writing"
      href={`/blog/${data.slug}`}
      linkText="Read full"
      annotation={annotation}
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
function NoteArtifact({ id, data, annotation }: { id: string; data: NoteData; annotation?: string }) {
  // Fallback text for the rare case where a topic surfaces without a picker
  // quote (corpus is empty or the picker rejected every candidate). Keeps the
  // tile from rendering blank — but the card's whole reason to exist is the
  // quote, so this should be vanishingly rare.
  const quote = annotation && annotation.trim().length > 0
    ? annotation.trim()
    : (data.tagline || "");
  const thread = useChatThread();
  const articleRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!thread) return;
    const el = articleRef.current;
    thread.registerCard(id, el);
    return () => thread.registerCard(id, null);
  }, [thread, id]);
  const isThreadActive = thread?.activeId === id;
  return (
    <article
      ref={articleRef}
      data-thread-card={id}
      onMouseEnter={() => thread?.setActive(id)}
      onMouseLeave={() =>
        thread?.setActive((prev) => (prev === id ? null : prev))
      }
      className={`group relative border-t py-5 transition-colors ${
        isThreadActive
          ? "border-[var(--color-accent)]"
          : "border-[var(--color-hairline)] hover:border-[var(--color-accent)]"
      }`}
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

