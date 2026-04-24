import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projectsData";
import type { Project, ProjectLink } from "@/data/projectsData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected projects, experiments, and things Karthik has shipped.",
};

const LINK_LABEL: Record<ProjectLink["type"], string> = {
  github: "GitHub",
  devpost: "Devpost",
  website: "Visit",
  npm: "npm",
  appstore: "App Store",
  linkedin: "LinkedIn",
  arxiv: "arXiv",
  pdf: "PDF",
  youtube: "YouTube",
};

export default function ProjectsPage() {
  return (
    <article className="mx-auto max-w-[800px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        Projects
      </p>
      <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
        Things I&apos;ve built.
      </h1>
      <p className="mt-5 max-w-[560px] font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] italic leading-snug text-[var(--color-ink-muted)]">
        Hackathon wins, research prototypes, and shipped products.
      </p>

      <ol className="mt-14">
        {projects.map((project) => (
          <ProjectBlock key={project.id} project={project} />
        ))}
      </ol>
    </article>
  );
}

function ProjectBlock({ project }: { project: Project }) {
  const { display, links } = project;
  return (
    <li
      id={project.id}
      className="border-t border-[var(--color-hairline)] py-10 last:border-b"
    >
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[22px] font-medium leading-tight tracking-[-0.01em] text-[var(--color-ink)] md:text-[26px]">
          {project.title}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          {project.date}
        </span>
        {project.awards && (
          <span className="rounded-sm bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent-hover)]">
            {project.awards}
          </span>
        )}
      </header>

      <p className="mt-3 text-[15.5px] leading-[1.7] text-[var(--color-ink)]">
        {project.description}
      </p>

      <p className="mt-2 text-[13px] text-[var(--color-ink-muted)]">
        {project.tools}
      </p>

      {display.embedUrl && (
        <div className="mt-6 overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-muted)]">
          <iframe
            className="block w-full"
            height={display.embedHeight ?? 375}
            src={display.embedUrl}
            title={`${project.title} embed`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {display.images && display.images.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {display.images.map((img) => (
            <div
              key={img.src}
              className="overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-muted)]"
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                className="h-auto w-full"
              />
            </div>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-surface-raised)] px-3.5 py-1.5 text-[13px] text-[var(--color-ink)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {LINK_LABEL[link.type] ?? link.label}
              <ArrowUpRight className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
