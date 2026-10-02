"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import type { MinimalCategory } from "@/lib/living-corpus/minimalTypes";
import styles from "./corpus-navigation.module.css";

export const CORPUS_NAV_ITEMS = [
  { id: "about", label: "About", href: "/about" },
  { id: "work", label: "Work", href: "/?section=work" },
  { id: "projects", label: "Projects", href: "/?section=projects" },
  { id: "writing", label: "Writing", href: "/?section=writing" },
  { id: "involvement", label: "Involvement", href: "/?section=involvement" },
  { id: "photos", label: "Photos", href: "/gallery" },
] as const;

export type CorpusDestination = (typeof CORPUS_NAV_ITEMS)[number]["id"];

function isCategory(id: CorpusDestination): id is MinimalCategory {
  return id !== "about" && id !== "photos";
}

export function destinationForPath(pathname: string): CorpusDestination | null {
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/gallery")) return "photos";
  if (pathname.startsWith("/work")) return "work";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/involvement")) return "involvement";
  if (pathname.startsWith("/blog") || pathname.startsWith("/notes")) return "writing";
  return null;
}

export default function CorpusNavigation({
  className,
  compact = false,
  current,
  onSelectCategory,
  onAttentionStart,
  onAttentionEnd,
}: {
  className?: string;
  compact?: boolean;
  current?: CorpusDestination | null;
  onSelectCategory?: (category: MinimalCategory) => void;
  onAttentionStart?: (category: MinimalCategory) => void;
  onAttentionEnd?: () => void;
}) {
  return (
    <ViewTransition name="corpus-navigation" share="corpus-navigation" default="none">
      <nav
        className={[compact ? styles.compact : "", className].filter(Boolean).join(" ")}
        aria-label="Portfolio sections"
      >
        {CORPUS_NAV_ITEMS.map((item) => {
          if (isCategory(item.id) && onSelectCategory) {
            const category = item.id;
            return (
              <button
                key={category}
                type="button"
                data-selected={current === category ? "true" : "false"}
                aria-pressed={current === category}
                onBlur={onAttentionEnd}
                onClick={() => onSelectCategory(category)}
                onFocus={() => onAttentionStart?.(category)}
                onPointerEnter={() => onAttentionStart?.(category)}
                onPointerLeave={onAttentionEnd}
              >
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={current === item.id ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </ViewTransition>
  );
}
