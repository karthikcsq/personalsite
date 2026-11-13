import { ViewTransition, type ReactNode } from "react";

// Every page fades and rises in as the last one fades out, both ways
// (links and the browser's back button). Styles in globals.css.
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}

/** A title that carries across pages: the same name on both ends morphs one into the other. */
export function SharedTitle({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}

/** One name per artifact, the same on the home page and its own page. */
export const titleName = (id: string) => `t-${id.replace(/[^a-z0-9]+/gi, "-")}`;
