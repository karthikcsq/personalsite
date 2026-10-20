import { MINIMAL_CATEGORIES, type MinimalCategory } from "./minimalTypes.ts";

export function corpusSectionHref(category: MinimalCategory): string {
  return `/${category}`;
}

export function corpusSectionFromPath(pathname: string): MinimalCategory | null {
  return MINIMAL_CATEGORIES.find(({ id }) => corpusSectionHref(id) === pathname)?.id ?? null;
}

export function corpusItemHref(category: MinimalCategory, id: string): string {
  return `${corpusSectionHref(category)}?${new URLSearchParams({ item: id })}`;
}
