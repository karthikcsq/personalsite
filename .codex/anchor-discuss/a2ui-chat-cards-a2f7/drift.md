# Drift Check

## Verdict

**ON-ANCHOR**

The move from a stacked answer document to a dynamic, open, modular scene is a consciously accepted refinement of the original A2UI direction. The discussion preserves the bounded component protocol, grounding, quote provenance, and host-owned behavior while operationalizing the user's newly explicit focal-component requirement.

## Evidence

### On-anchor

- The anchor now explicitly requires one core component to carry the main argument and rejects a chat transcript, stacked block feed, or indefinitely growing vertical sequence.
- The discussion implements that choice through an `AnswerScene` with exactly one focal component, zero to two visible supporting modules, bounded composition depth, and a bounded focus stack.
- The anchor says supporting modules should clarify or transform the focus rather than compete with it. The discussion restricts them to quote, evidence, artifact preview, and control roles around the focal component.
- The anchor says interactions should replace, focus, reveal, or temporarily layer content rather than append sections. The discussion adds bounded swap, peek, back, replacement, and overlay behavior and explicitly prevents `component.open` from appending blocks.
- The anchor still requires the UI to tell a coherent, complete story. The discussion places narrative text inside the focal component and binds it to component state rather than recreating a separate prose column.
- The bounded JSON contract remains intact: the model selects trusted components and a host-defined composition mode, while the host owns pixels, responsive layout, behavior, and validation.
- Quote selection still uses validated handles and canonical hydration, preserving verbatim text and provenance.
- The accepted hybrid history model remains unchanged: the latest scene owns the active canvas and earlier turns become immutable, progressively hydrated snapshots.

## Direction changes detected

| Direction change | Explicitly chosen by user? | Assessment |
|---|---:|---|
| Replace separate assistant prose with a complete A2UI answer surface | Yes | Explicitly accepted and preserved. |
| Support grounded derived structures | Yes | Explicitly accepted and preserved through focal component types such as comparison, timeline, and relationship map. |
| Promote quotes to first-class components | Yes | Explicitly accepted and preserved. |
| Add component-owned interactivity through bounded intents | Yes | Explicitly accepted and made more precise through focus-management actions. |
| Use hybrid active-canvas and progressive history | Yes | Explicitly accepted and unchanged. |
| Reject chat-like stacked blocks in favor of one focal component in an open modular scene | Yes | Newly and consciously accepted; this is legitimate good refinement within the original ambition. |
| Bound visible support, composition depth, and navigation depth | Yes in product direction; exact numeric limits are assistant elaboration | The limits directly operationalize the user's bounded-expansion requirement without changing its intent. |
| Let the composer choose among host-defined spatial modes | Direction accepted; exact mode catalog not yet chosen | Properly remains unresolved in the anchor at the selection-detail level. |
| Generate a complete document before rendering | No | Still labeled assistant-proposed and remains unresolved rather than being presented as agreement. |

## Assistant framing

Assistant framing does not appear to substitute for user intent. The scene model, focal hierarchy, and non-appending interaction rules directly reflect explicit additions to the anchor. The proposed exact component catalog, composition modes, two-module cap, and focus intents are reasonable design elaborations, not silent product redirections.

One terminology inconsistency remains: the discussion's scene protocol is named `AnswerScene`, while the history and validation sections still refer to saved `AnswerDocument` values. This appears to be stale naming rather than intent drift, but it could create ambiguity about whether history stores the same scene contract or a separate wrapper.

## Recommended action

**Continue.**

Continue within the accepted focal-scene direction. Normalize `AnswerDocument` and `AnswerScene` terminology, or explicitly define their relationship. Keep the exact focal-selection rules, composition-mode catalog, and complete-versus-progressive transport choice visibly proposed until the user chooses them.
