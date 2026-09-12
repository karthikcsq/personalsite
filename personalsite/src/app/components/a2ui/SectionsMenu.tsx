"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { NAV_ITEMS } from "@/app/components/navbar";
import styles from "./a2ui.module.css";

// Compact section nav for the in-chat view, where the global navbar is hidden.
// Conversation state lives only in memory, so links open in a new tab rather
// than navigating away and discarding the thread.
export default function SectionsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.sectionsMenu}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.sectionsTrigger}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Site sections"
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid aria-hidden="true" />
        <span>Menu</span>
      </button>

      {open ? (
        <nav id={panelId} className={styles.sectionsPanel} aria-label="Site sections">
          <span>Sections</span>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                  <small aria-hidden="true">↗</small>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
