# Deferred chat UX work

Items deferred from the 2026-04-30 chat UX critique. Items 1-8 from that
critique are shipped on `redesign-chat-first`; the list below is what remains.
Each entry includes enough context to pick up cold.

## 9. Hero nav duplicates the global navbar

**Problem.** The pre-chat hero (`!inChat`, `src/app/page.tsx`) renders a
six-link section nav (Work / Projects / Involvement / Writing / Photography /
About) at the bottom of the column, *while the global `Navbar` is also showing
the same links at the top of the page*. The user sees two navigation systems
on a page that has exactly one job: surface the chat input.

**Fix options, ordered by aggressiveness:**
1. Hide the global navbar on the unscrolled home (`!inChat`) and let the
   in-hero rail carry it. The wordmark + "karthik ·" dot can move into the
   hero column header so identity isn't lost.
2. Keep the navbar and remove the hero rail. Leaner code, but loses the
   editorial "rail of sections" framing that signals this site has more than
   chat.
3. Make the navbar appear only after the user scrolls past the hero (or after
   `inChat`). Keeps both navigations but never shows them together.

Recommended: option 1. Closest to the "chat is the home" principle in
PRODUCT.md — the navbar's reason to exist is to navigate AWAY from chat, and
on the home page that's the opposite of what we want.

## 10. Keyboard shortcuts: Cmd/Ctrl+K and Cmd+Enter

**Cmd/Ctrl+K**: start a new conversation. Power-user expectation; currently
the only way is the small `MessageSquarePlus` icon. Wire to `resetChat` (now
soft-confirmed via the undo toast, so the shortcut is safe).

**Cmd+Enter**: force-send even when shift is held. Less critical — Enter
already sends. Skip unless people complain.

Place the listener at the in-chat layout level so it doesn't fire on other
pages.

## 11. Generic "Something snapped" error copy

**Status: partially shipped.** The error path now renders an inline `Retry`
button (see `ErrorRetry` in `page.tsx`). Still deferred:

- Distinguish error classes. Network failure, 429 rate limit, and
  500-from-OpenAI all collapse to the same generic message. The 429 path is
  already handled separately (it shows the API-supplied error string), but
  network errors and 5xx errors share one bucket. Worth splitting into:
  - "Lost the connection. Retry?" (network)
  - "The model is taking too long. Retry?" (timeout/abort that wasn't user-initiated)
  - "Something snapped on the way to the answer." (generic 5xx — current copy)

Implementation: store `(err as Error).name` and the response status on the
error path, render a different copy variant based on it.

## 12. ReactMarkdown re-renders on every streamed token

**Problem.** `AssistantBubble` runs `<ReactMarkdown>{content}</ReactMarkdown>`
on every chunk. With long answers, this is 50+ full markdown parses per
message. No measured perf complaint yet, but worth a single afternoon to
fix before the next big refactor.

**Fix.**
1. Memoize `AssistantBubble` with `React.memo` keyed on `(content, artifacts,
   isStreaming, onRegenerate)`.
2. Inside the bubble, debounce parses while streaming: parse the first
   ~30 tokens immediately (so the user sees the answer start), then re-parse
   only every ~120ms while `isStreaming` is true. Final parse on
   `isStreaming` flipping false.
3. Keep the existing `linkifyUrls`/`repairMarkdownLinks` pre-pass — they're
   cheap.

## 13. Share / permalink for an answer

**Problem.** A user reads a great answer, has nothing to send a friend.
The product strategy in PRODUCT.md says "a founder reads a post they didn't
come for" — so making conversations shareable is a natural compounding move.

**Fix, two phases:**

**Phase A (cheap).** A `?q=<question>` URL that, on load, auto-runs the
question against the chat. No persistence, no DB. The chat just submits the
prefilled question and renders normally. "Copy link" button under the
assistant message generates this URL.

**Phase B (more work).** Persist the conversation. Two options:
- Client-only via `sessionStorage` + share-via-export (the user sees their
  own history, but can't share it as a URL someone else can replay).
- Server-side via a `/api/conversation/:id` endpoint backed by Upstash Redis
  (already provisioned for rate limiting). Each shareable link
  is `/?c=<id>`; loading it hydrates `messages` from the stored payload.
  Adds privacy considerations (anyone with the link can read it) and TTL.

Phase A is a half-day. Phase B is a full feature with infra implications;
worth doing but not before measuring whether anyone actually wants to share.

---

## Status of items 1-8 (shipped on this branch)

For reference when the deferred items get picked up:

1. ✅ Stop-generation button replaces Send while `isProcessing`.
2. ✅ Smart auto-scroll: only auto-scrolls when the user is within 80px of
   the bottom; "Jump to latest" pill appears otherwise.
3. ✅ Regenerate (last assistant turn) and edit-and-resend (any user bubble).
4. ✅ Soft-confirm reset chat with a 6s undo toast.
5. ✅ Queue + Try chip rail wrapped in a `min-height: 72px` container so
   chip position doesn't jitter as the queue grows/empties.
6. ✅ `ArtifactSkeleton` (two shimmering hairline rows) renders while the
   first turn is fetching.
7. ✅ Citation chip dot at rest bumped from `hairline-strong` to `ink-subtle`
   so the chip's "this connects to a card" signal reads pre-attentively.
8. ✅ Hover-revealed Copy + Regenerate action row under each assistant
   answer, with 1.8s "Copied" confirmation state.
