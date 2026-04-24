"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export type Artifact = { annotation?: string } & (
  | { kind: "work"; id: string; data: WorkData }
  | { kind: "project"; id: string; data: ProjectData }
  | { kind: "blog"; id: string; data: BlogData }
  | { kind: "involvement"; id: string; data: InvolvementData }
);

interface WorkData {
  role: string;
  company: string;
  year: string;
  description: string[];
  icon: string;
}

interface ProjectData {
  title: string;
  tools: string;
  date: string;
  link?: string;
  description: string;
}

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
}

export function ChatArtifact({ artifact, index = 0 }: { artifact: Artifact; index?: number }) {
  const delay = `${index * 80}ms`;
  return (
    <div className="slip" style={{ animationDelay: delay }}>
      {artifact.kind === "work" && (
        <WorkArtifact data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "project" && (
        <ProjectArtifact data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "blog" && (
        <BlogArtifact data={artifact.data} annotation={artifact.annotation} />
      )}
      {artifact.kind === "involvement" && (
        <InvolvementArtifact data={artifact.data} annotation={artifact.annotation} />
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
function RightTopAnnotation({ text, circleY }: { text: string; circleY: number }) {
  // Wing internal geometry places the circle at cy=44 within an 80-tall wing.
  // So the wing's top edge is (circleY - 44) in card-local coords.
  const wingTop = Math.max(circleY - 44, 0);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute hidden lg:block"
      style={{ top: `${wingTop}px`, right: "90px", width: "240px", height: "80px" }}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
        <div
          className="absolute rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left font-mono text-[11px] leading-[15px] tracking-[0.01em] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
          style={{ right: "4px", top: "23px", transform: "translateY(-50%)", width: "200px" }}
        >
          {text}
        </div>
        <svg
          className="absolute inset-0 text-[var(--color-accent)] opacity-80"
          viewBox="0 0 240 80"
          width={240}
          height={80}
          fill="none"
        >
          <path
            d="M 40 23 L 30 23 L 9 44"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <svg
        className="absolute inset-0 text-[var(--color-accent)] opacity-40 transition-opacity duration-200 ease-out group-hover:opacity-80"
        viewBox="0 0 240 80"
        width={240}
        height={80}
        fill="none"
      >
        <circle cx={6} cy={44} r={3} stroke="currentColor" strokeWidth="1.25" />
      </svg>
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
  isHovered,
  circleY,
}: {
  text: string;
  cardRef: RefObject<HTMLElement | null>;
  isHovered: boolean;
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
      {/* Textbox + connector: hover-revealed */}
      <div
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{ opacity: isHovered ? 1 : 0 }}
      >
        <div
          className="absolute rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left font-mono text-[11px] leading-[15px] tracking-[0.01em] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
          style={{ left: "4px", top: "20px", transform: "translateY(-50%)", width: "190px" }}
        >
          {text}
        </div>
        <svg
          className="absolute inset-0 text-[var(--color-accent)] opacity-80"
          viewBox={`0 0 ${wingWidth} ${wingHeight}`}
          width={wingWidth}
          height={wingHeight}
          fill="none"
        >
          <path
            d="M 194 20 L 214 20 L 234 40"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Indicator: always-visible circle at the card's left edge. */}
      <svg
        className="absolute inset-0 text-[var(--color-accent)] transition-opacity duration-200 ease-out"
        viewBox={`0 0 ${wingWidth} ${wingHeight}`}
        width={wingWidth}
        height={wingHeight}
        fill="none"
        style={{ opacity: isHovered ? 0.8 : 0.4 }}
      >
        <circle cx={234} cy={40} r={3} stroke="currentColor" strokeWidth="1.25" />
      </svg>
    </div>,
    document.body,
  );
}

function ArtifactShell({
  label,
  href,
  linkText,
  annotation,
  annotationVariant,
  annotationAnchor = "below-title",
  annotationBelowOffset = 10,
  children,
}: {
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
  const articleRef = useRef<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
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
      className="group relative cursor-pointer border-t border-[var(--color-hairline)] py-7 transition-colors hover:border-[var(--color-accent)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {annotation && !isLeftCenter && <RightTopAnnotation text={annotation} circleY={circleY} />}
      {annotation && isLeftCenter && (
        <LeftCenterAnnotation
          text={annotation}
          cardRef={articleRef}
          isHovered={isHovered}
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

function WorkArtifact({ data, annotation }: { data: WorkData; annotation?: string }) {
  const companyAnchor = `#${data.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return (
    <ArtifactShell
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

function ProjectArtifact({ data, annotation }: { data: ProjectData; annotation?: string }) {
  return (
    <ArtifactShell label="Project" annotation={annotation} annotationBelowOffset={2}>
      <h3 className="text-[19px] font-medium leading-tight tracking-tight text-[var(--color-ink)]">
        {data.title}
      </h3>
      <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
        {data.date}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {data.tools}
      </p>
      <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-ink)]">
        {data.description}
      </p>
      {data.link && (
        <Link
          href={data.link}
          data-primary-link
          className="mt-5 inline-flex items-center gap-1 border-b border-[var(--color-accent)] pb-0.5 text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
        >
          See full
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </ArtifactShell>
  );
}

function InvolvementArtifact({
  data,
  annotation,
}: {
  data: InvolvementData;
  annotation?: string;
}) {
  return (
    <ArtifactShell
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
    </ArtifactShell>
  );
}

function BlogArtifact({ data, annotation }: { data: BlogData; annotation?: string }) {
  return (
    <ArtifactShell
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

