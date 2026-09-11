// One claim, one headline slot.
//
// The generation schema has the model plan the distinct claims of an answer as
// `points` before it writes any visible copy, and tag every slot with the point
// it expresses. This pass enforces that plan where repetition actually shows on
// the board: prose that restates a claim a higher slot already owns. Ownership
// follows the surface's allocation rules. The title owns the answer, items and
// options own specific facts, a body owns only connective explanation, and the
// lead only adds context:
//
//   title > primary items and options > primary body > primary title
//         > each supporting component (items, options, body, title) > lead
//
// Items and options claim their point but are never removed. Models tag a fact
// with the broader point it supports, so deleting a "repeated" item deletes the
// specifics the answer needs. Only prose is cleared: the lead, component titles
// and component bodies.
//
// It runs on raw model output, before sanitizing, and fails open. A document
// that tags fewer than two points, or would lose its whole primary answer, is
// returned untouched rather than risk an empty board.

type Raw = Record<string, unknown>;

type Claim = { id: string; clear?: () => void };

const isRecord = (value: unknown): value is Raw =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pointOf = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const hasText = (...values: unknown[]) =>
  values.some((value) => typeof value === "string" && value.trim().length > 0);

const listLength = (value: unknown) => (Array.isArray(value) ? value.length : 0);

export function enforcePointOwnership(raw: Raw): Raw {
  const doc = structuredClone(raw);
  const claims: Claim[] = [];

  // An empty slot never claims a point, so it cannot block a later owner.
  const proseSlot = (owner: Raw, field: string, pointField: string) => {
    if (!hasText(owner[field])) return;
    claims.push({ id: pointOf(owner[pointField]), clear: () => { owner[field] = ""; } });
  };
  const factSlots = (component: Raw, field: "items" | "options") => {
    if (!Array.isArray(component[field])) return;
    for (const entry of component[field] as unknown[]) {
      if (!isRecord(entry)) continue;
      if (!hasText(entry.label, entry.value, entry.summary, entry.detail)) continue;
      claims.push({ id: pointOf(entry.pointId) });
    }
  };
  const componentSlots = (component: unknown) => {
    if (!isRecord(component)) return;
    factSlots(component, "items");
    factSlots(component, "options");
    proseSlot(component, "body", "bodyPointId");
    proseSlot(component, "title", "titlePointId");
  };

  proseSlot(doc, "title", "titlePointId");
  componentSlots(doc.primary);
  if (Array.isArray(doc.supporting)) doc.supporting.forEach(componentSlots);
  proseSlot(doc, "lead", "leadPointId");

  const tagged = claims.filter((claim) => claim.id);
  if (new Set(tagged.map((claim) => claim.id)).size < 2) return raw;

  const owned = new Set<string>();
  for (const claim of tagged) {
    if (!owned.has(claim.id)) owned.add(claim.id);
    else claim.clear?.();
  }

  const primary = doc.primary;
  if (
    isRecord(primary) &&
    !hasText(primary.body) &&
    listLength(primary.items) === 0 &&
    listLength(primary.options) === 0 &&
    listLength(primary.quoteIds) === 0
  ) {
    return raw;
  }
  return doc;
}
