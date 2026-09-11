import type { A2UIComponent, A2UIDocument } from "./protocol";

// The one-call generator writes a document, not prose, so there is no reply
// string to keep. This flattens the finished document back into readable text
// for the three places that still need one:
//   1. the assistant turn stored in conversation history (follow-up questions
//      resolve pronouns against it, so it has to carry the same facts),
//   2. the copy-answer action,
//   3. the suggested-reply cache.
// It is derived, never generated: no second model call.

const MAX_HISTORY_CHARS = 4000;

function itemLine(label: string, value: string, detail: string): string {
  const head = [label.trim(), value.trim()].filter(Boolean).join(": ");
  const tail = detail.trim();
  if (head && tail) return `- ${head}. ${tail}`;
  return `- ${head || tail}`;
}

function componentText(component: A2UIComponent): string {
  const lines: string[] = [];
  if (component.title.trim()) lines.push(component.title.trim());
  if (component.body.trim()) lines.push(component.body.trim());
  for (const item of component.items) {
    const line = itemLine(item.label, item.value, item.detail);
    if (line !== "- ") lines.push(line);
  }
  for (const option of component.options) {
    const line = itemLine(option.label, option.summary, option.detail);
    if (line !== "- ") lines.push(line);
  }
  return lines.join("\n");
}

export function a2uiHistoryText(document: A2UIDocument): string {
  const blocks = [
    document.title.trim(),
    document.lead.trim(),
    componentText(document.primary),
    ...document.supporting.map(componentText),
  ].filter((block) => block.length > 0);

  const text = blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length <= MAX_HISTORY_CHARS) return text;
  const slice = text.slice(0, MAX_HISTORY_CHARS);
  const boundary = slice.lastIndexOf("\n");
  return (boundary > MAX_HISTORY_CHARS * 0.6 ? slice.slice(0, boundary) : slice).trim();
}
