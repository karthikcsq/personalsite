"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type Artifact =
  | { kind: "work"; id: string; data: WorkData }
  | { kind: "project"; id: string; data: ProjectData }
  | { kind: "blog"; id: string; data: BlogData };

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
  bullets: string[];
}

interface BlogData {
  title: string;
  slug: string;
  excerpt: string;
}

export function ChatArtifact({ artifact, index = 0 }: { artifact: Artifact; index?: number }) {
  const delay = `${index * 80}ms`;
  return (
    <div className="slip" style={{ animationDelay: delay }}>
      {artifact.kind === "work" && <WorkArtifact data={artifact.data} />}
      {artifact.kind === "project" && <ProjectArtifact data={artifact.data} />}
      {artifact.kind === "blog" && <BlogArtifact data={artifact.data} />}
    </div>
  );
}

function ArtifactShell({
  label,
  href,
  linkText,
  children,
}: {
  label: string;
  href?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="group relative border-t border-[var(--color-hairline)] py-7">
      <header className="mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-accent)]" />
          {label}
        </span>
        {href && linkText && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)]"
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

function WorkArtifact({ data }: { data: WorkData }) {
  const companyAnchor = `#${data.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return (
    <ArtifactShell label="Work" href={`/work${companyAnchor}`} linkText="See timeline">
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

function ProjectArtifact({ data }: { data: ProjectData }) {
  return (
    <ArtifactShell label="Project">
      <h3 className="text-[19px] font-medium leading-tight tracking-tight text-[var(--color-ink)]">
        {data.title}
      </h3>
      <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
        {data.date}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {data.tools}
      </p>
      <ul className="mt-4 space-y-2">
        {data.bullets.slice(0, 2).map((bullet, i) => (
          <li
            key={i}
            className="relative pl-4 text-[13.5px] leading-relaxed text-[var(--color-ink)]"
          >
            <span className="absolute left-0 top-[10px] h-px w-2 bg-[var(--color-hairline-strong)]" />
            {bullet}
          </li>
        ))}
      </ul>
      {data.link && (
        <Link
          href={data.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1 border-b border-[var(--color-accent)] pb-0.5 text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
        >
          Open project
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </ArtifactShell>
  );
}

function BlogArtifact({ data }: { data: BlogData }) {
  return (
    <ArtifactShell
      label="Writing"
      href={`/blog/${data.slug}`}
      linkText="Read full"
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

