/** Extract only fully closed JSON values. Delimiters inside strings, escaped
 * quotes and chunk boundaries never turn incomplete components into UI. */
function valueEnd(text: string, start: number): number | null {
  const first = text[start];
  if (first === '"') {
    let escaped = false;
    for (let i = start + 1; i < text.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (text[i] === "\\") { escaped = true; continue; }
      if (text[i] === '"') return i + 1;
    }
    return null;
  }
  if (first !== "{" && first !== "[") return null;
  const stack: string[] = [];
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      const open = stack.pop();
      if ((ch === "}" && open !== "{") || (ch === "]" && open !== "[")) return null;
      if (stack.length === 0) return i + 1;
    }
  }
  return null;
}

/** Every closed element at the head of an array that is still being written.
 * A half-written element is simply not there yet. */
function completedElements(text: string, start: number): unknown[] | null {
  if (text[start] !== "[") return null;
  const elements: unknown[] = [];
  let pos = start + 1;
  const skip = () => { while (pos < text.length && /\s/.test(text[pos])) pos++; };
  skip();
  while (pos < text.length && text[pos] !== "]") {
    const end = valueEnd(text, pos);
    if (end === null) break;
    elements.push(JSON.parse(text.slice(pos, end)));
    pos = end; skip();
    if (text[pos] !== ",") break;
    pos++; skip();
  }
  return elements;
}

/** Read an object that may still be open, keeping only the fields whose values
 * have closed. `growable` names the array fields whose completed head elements
 * may be published before the array itself closes; nothing else is guessed. */
function readOpenObject(
  text: string,
  start: number,
  keep: Set<string>,
  growable: Set<string>,
): Record<string, unknown> | null {
  if (text[start] !== "{") return null;
  const value: Record<string, unknown> = Object.create(null);
  let pos = start + 1;
  const skip = () => { while (pos < text.length && /\s/.test(text[pos])) pos++; };
  skip();
  while (pos < text.length && text[pos] !== "}") {
    const keyEnd = valueEnd(text, pos);
    if (text[pos] !== '"' || keyEnd === null) break;
    const key = JSON.parse(text.slice(pos, keyEnd)) as string;
    pos = keyEnd; skip();
    if (text[pos++] !== ":") break;
    skip();
    const end = valueEnd(text, pos);
    if (end === null) {
      if (growable.has(key) && text[pos] === "[") {
        const elements = completedElements(text, pos);
        if (elements) value[key] = elements;
      }
      break;
    }
    if (keep.size === 0 || keep.has(key)) value[key] = JSON.parse(text.slice(pos, end));
    pos = end; skip();
    if (text[pos] !== ",") break;
    pos++; skip();
  }
  return value;
}

const fields = new Set(["version", "question", "points", "title", "titlePointId", "lead", "leadPointId", "compositionOptions", "quotes", "primary", "supporting", "actions"]);
const componentArrays = new Set(["items", "options"]);

/**
 * Read the answer as far as it has actually been written.
 *
 * Granularity is per completed item, not per completed component: as soon as an
 * item's JSON object closes it can be placed on the board, while the component
 * around it is still being written. Nothing partial ever escapes. A field is
 * published only once its value has closed, so a half-written string, item,
 * artifact id or quote is invisible until it is whole.
 */
export function readCompletedA2UI(buffer: string): Record<string, unknown> | null {
  if (buffer.length > 100_000) return null;
  const doc: Record<string, unknown> = Object.create(null);
  let pos = 0;
  const skip = () => { while (/\s/.test(buffer[pos] ?? "") && pos < buffer.length) pos++; };
  skip();
  if (buffer[pos++] !== "{") return null;
  try {
    while (pos < buffer.length) {
      skip();
      if (buffer[pos] === "}") break;
      const keyEnd = valueEnd(buffer, pos);
      if (buffer[pos] !== '"' || keyEnd === null) break;
      const key = JSON.parse(buffer.slice(pos, keyEnd)) as string;
      pos = keyEnd; skip();
      if (buffer[pos++] !== ":") break;
      skip();
      const end = valueEnd(buffer, pos);
      if (end === null) {
        if (key === "primary") {
          // A component is renderable only once it has declared its type.
          const primary = readOpenObject(buffer, pos, new Set(), componentArrays);
          if (primary && typeof primary.type === "string") doc.primary = primary;
        }
        if (key === "supporting" && buffer[pos] === "[") {
          const supporting: unknown[] = [];
          pos++; skip();
          while (buffer[pos] === "{") {
            const itemEnd = valueEnd(buffer, pos);
            if (itemEnd === null) {
              const open = readOpenObject(buffer, pos, new Set(), componentArrays);
              if (open && typeof open.type === "string" && typeof open.body === "string" && (open.type !== "quote_focus" || Array.isArray(open.quoteIds)) && open.type !== "navigation") supporting.push(open);
              break;
            }
            supporting.push(JSON.parse(buffer.slice(pos, itemEnd)));
            pos = itemEnd; skip();
            if (buffer[pos] !== ",") break;
            pos++; skip();
          }
          doc.supporting = supporting;
        }
        break;
      }
      const value: unknown = JSON.parse(buffer.slice(pos, end));
      if (fields.has(key)) doc[key] = value;
      pos = end; skip();
      if (buffer[pos] !== ",") break;
      pos++;
    }
  } catch { return null; }
  if (!doc.primary || typeof doc.primary !== "object" || Array.isArray(doc.primary)) return null;
  return { ...doc, supporting: doc.supporting ?? [], actions: doc.actions ?? [] };
}

export function stablePresentationSeed(previous: number | undefined, create: () => number): number {
  return previous ?? create();
}
