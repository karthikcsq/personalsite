import type { MinimalCategory } from "./minimalTypes";

export function corpusItemHref(category: MinimalCategory, id: string): string {
  const params = new URLSearchParams({ section: category, item: id });
  return `/?${params}`;
}
