import { ViewTransition } from "react";

export default function CorpusPageTransition({
  page,
  children,
}: {
  page: "home" | "about" | "photos" | "reader";
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      key={page}
      enter="corpus-page-enter"
      exit="corpus-page-exit"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
