"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { InvolvementEntry } from "@/utils/involvementUtils";

interface Props {
  involvements: InvolvementEntry[];
}

export function InvolvementClient({ involvements }: Props) {
  return (
    <article className="mx-auto max-w-[760px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        Involvement
      </p>
      <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
        Where I show up.
      </h1>
      <p className="mt-5 max-w-[560px] font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] italic leading-snug text-[var(--color-ink-muted)]">
        Communities and orgs I&apos;m part of.
      </p>

      {involvements.length === 0 ? (
        <p className="mt-14 text-[15px] text-[var(--color-ink-muted)]">
          Nothing here yet.
        </p>
      ) : (
        <div className="mt-14 space-y-16">
          {involvements.map((inv) => (
            <InvolvementSection key={inv.slug} inv={inv} />
          ))}
        </div>
      )}
    </article>
  );
}

function InvolvementSection({ inv }: { inv: InvolvementEntry }) {
  return (
    <section id={inv.slug} className="border-t border-[var(--color-hairline)] pt-10">
      <header>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[clamp(1.4rem,2.6vw,1.75rem)] font-medium leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            {inv.title}
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
            {inv.date}
          </span>
        </div>
        <p className="mt-1 text-[14.5px] text-[var(--color-ink-muted)]">
          {inv.role}
          {inv.location && (
            <span className="text-[var(--color-ink-subtle)]"> · {inv.location}</span>
          )}
        </p>
        {inv.tagline && (
          <p className="mt-4 font-serif text-[clamp(1.05rem,1.6vw,1.2rem)] italic leading-snug text-[var(--color-ink-muted)]">
            {inv.tagline}
          </p>
        )}
        {inv.link && (
          <Link
            href={inv.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 border-b border-[var(--color-accent)] pb-0.5 text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
          >
            Visit site
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </header>

      {inv.whatItIs && (
        <Block label="What it is" body={inv.whatItIs} />
      )}
      {inv.myRole && (
        <Block label="My role" body={inv.myRole} />
      )}

      {inv.contributions.length > 0 && (
        <div className="mt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
            Contributions
          </p>
          <dl className="mt-5 space-y-6">
            {inv.contributions.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr] md:gap-6"
              >
                <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--color-ink)]">
                  {c.area}
                </dt>
                <dd className="text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
                  {c.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {inv.pointOfView.length > 0 && (
        <div className="mt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
            Why it matters
          </p>
          <div className="mt-5 space-y-5">
            {inv.pointOfView.map((p, i) => (
              <p
                key={i}
                className="border-l-2 border-[var(--color-accent)] pl-4 font-serif text-[clamp(1rem,1.5vw,1.15rem)] italic leading-[1.55] text-[var(--color-ink)]"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {inv.bullets.length > 0 && (
        <div className="mt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
            Highlights
          </p>
          <ul className="mt-5 space-y-2.5">
            {inv.bullets.map((b, i) => (
              <li
                key={i}
                className="relative pl-5 text-[15px] leading-[1.65] text-[var(--color-ink)]"
              >
                <span className="absolute left-0 top-[12px] h-px w-3 bg-[var(--color-hairline-strong)]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="mt-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        {label}
      </p>
      <div className="mt-4 space-y-4 text-[15.5px] leading-[1.7] text-[var(--color-ink)]">
        {body.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  );
}
