# Discussion

## Current question
How should the existing chat-adjacent cards become a bounded A2UI surface, and how should that surface use the quote system?

## Current recommendation
- [anchor] Define a versioned `AnswerScene` protocol. The model composes a bounded semantic scene from trusted component types; it does not emit HTML, JSX, CSS, URLs, or executable callbacks.
- [anchor] Split the runtime into materials, composition, hydration, validation, and rendering. The composer sees source handles and verified quote handles, while the host resolves those handles to canonical content.
- [anchor] Require exactly one focal component. Supporting modules can annotate, reveal context, or provide controls around it.
- [anchor] Let the composer choose a host-defined composition mode such as `spotlight`, `split`, `orbit`, `timeline`, or `comparison`. The host still owns responsive layout and pixels.
- [anchor] Give every model-authored claim explicit evidence references so a structurally valid tree can also be checked for grounding.
- [anchor] Let component definitions own their local behavior and supported semantic events.
- [anchor] Keep the application shell outside the A2UI protocol. The host owns the history sidebar, active canvas, fixed composer, responsive behavior, and scrollback virtualization.

## Proposed answer protocol
- [anchor] Root: `AnswerScene`, carrying schema version, tree id, question, thesis, one composition mode, one focal component, zero to two visible supporting modules, controls, and a source manifest.
- [anchor] The focal component can be a `ProjectStory`, `WorkStory`, `Comparison`, `Timeline`, `QuoteLens`, `RelationshipMap`, or another trusted high-level answer component.
- [anchor] Supporting modules can be a first-class `Quote`, compact `Evidence`, `ArtifactPreview`, or control cluster.
- [anchor] Narrative text lives inside the focal component and changes with its state. It does not form a separate prose column.
- [anchor] Hard bounds: one focal component, at most two visible supporting modules, maximum composition depth of two, and a bounded focus stack.
- [expansion] Generic layout nodes such as grid, columns, spacer, floating panel, arbitrary style tokens, or component-level CSS.
  - Why it might be worth it: More composition freedom.
  - Cost: The model begins designing pixels, answer quality becomes inconsistent, and the site drifts toward generic generated dashboards.

## Quote-system relationship
- [anchor] Keep corpus markdown and blog posts as the authoritative source of Karthik's prose.
- [anchor] Move quote selection before answer composition. Build a registry of server-validated quote candidates with stable per-response handles.
- [anchor] Let the composer select `quoteRef` values and position them in the story. It never copies or edits the quote text.
- [anchor] Hydrate each quote from the registry after composition and preserve artifact id, corpus file or blog slug, sub-topic, and exact source span.
- [anchor] Permit quote context expansion as trusted component behavior.
- [risk] If the composer receives raw prose and writes the quote field itself, punctuation changes and paraphrases will weaken the current verbatim guarantee.

## Interaction model
- [anchor] Local interactions belong entirely to components: expand details, reveal quote context, switch comparison dimensions, filter an artifact collection, or open a canonical link.
- [anchor] Buttons and other explicit controls bind to intents from a versioned registry supplied to the composer alongside the component catalog.
- [anchor] Suggested initial intent families:
  - Local UI: `component.open`, `component.close`, `component.focus`, `component.toggle`, `collection.filter`, and `comparison.select`.
  - Conversation: `conversation.prompt`, `conversation.compare`, `conversation.explain_quote`, and `conversation.show_evidence`.
  - Navigation: `source.open` and `page.open`.
- [anchor] Each intent definition owns its parameter schema, execution scope, accessibility label rules, and whether it creates a new agent turn.
- [anchor] The composer may select an allowed intent and provide schema-valid parameters. It cannot define callbacks or introduce a new intent name.
- [anchor] Components may generate canonical parameters from their bound source ids, reducing what the composer needs to repeat.
- [anchor] Every emitted event returns `treeId`, `componentId`, intent name, canonical source ids, and a bounded value object.
- [anchor] Conversation intents should be recorded as explicit UI events rather than silently inserted as ordinary user-authored messages.
- [anchor] If `conversation.prompt` carries model-authored prompt text, the exact prompt must be visible before activation, bounded in length, and shown as the resulting user action after the click.
- [anchor] `component.open` should replace or temporarily overlay the current focus through a bounded focus stack. It should not append a new block below the scene.
- [anchor] Add `component.swap`, `component.peek`, and `component.back` as explicit focus-management intents.
- [anchor] When an interaction would add a third visible supporting module, the host replaces the oldest transient module or requires a focus change.
- [risk] Encoding natural-language follow-up prompts directly in generated JSON would turn actions into a second ungrounded prompt-generation surface.
- [risk] If an assistant-authored button prompt is replayed as an invisible `user` message, conversation authority and debugging history become ambiguous.

## Conversation shape
- [anchor] Keep the input fixed at the bottom center of the viewport.
- [anchor] Render the latest turn as the full active A2UI canvas.
- [anchor] On the next submission, freeze the previous `AnswerScene` as an immutable turn snapshot and add a compact, host-derived entry to a history sidebar.
- [anchor] Let upward scrolling progressively hydrate prior turn snapshots with their original questions and saved A2UI scenes.
- [anchor] Sidebar summaries are derived deterministically from answer metadata; they are not separately generated summaries.
- [anchor] Clicking a sidebar entry focuses the matching turn in the scrollback canvas.
- [anchor] Loading history reuses the saved validated scene and quote registry. It never reruns composition or quote selection.
- [anchor] On narrow screens, collapse the sidebar into a history control while preserving the same turn model.
- [anchor] Stage prior-turn loading without regeneration:
  - Stage 1: render a stable placeholder and host-derived turn metadata.
  - Stage 2: deserialize and validate the saved `AnswerScene` near the viewport.
  - Stage 3: mount interactive components when the turn enters the viewport.
- [anchor] Keep only the active turn and a small neighboring window mounted; serialize older turns with their quote and source manifests.
- [anchor] Preserve component-local state only while a turn remains mounted unless a component explicitly declares restorable state.
- [risk] Keeping every full interactive tree mounted would increase DOM weight and preserve stale component state indefinitely.
- [risk] Regenerating old trees during lazy loading would cause answer and quote drift.
- [user-proposed] Use a hybrid active canvas plus progressive scrollback history.
  - Status: explicitly accepted
  - Reason: Keep the current answer immersive while retaining access to each previous question and its corresponding UI.

## Transport options
- [assistant-proposed] Complete scene: generate, validate, hydrate, then render one coherent scene.
  - Status: proposed
  - Reason: Story coherence and validation are more important than token-by-token rendering. Staged history hydration is independent of generation streaming.
- [expansion] Progressive scene events: stream complete validated focal and supporting modules in story order, followed by a final scene manifest.
  - Why it might be worth it: Faster perceived response and visible narrative construction.
  - Cost: More protocol states, harder retries, and the possibility that early blocks imply a story the final blocks do not complete.
- [expansion] Arbitrary JSON Patch operations against a live tree.
  - Why it might be worth it: Maximum streaming and update flexibility.
  - Cost: Complex reconciliation, accessibility churn, invalid intermediate states, and difficult debugging.

## Validation boundary
- [anchor] Reject unknown component types, unknown ids, unknown quote handles, excessive depth, excessive block counts, disallowed actions, arbitrary URLs, and claims without evidence references.
- [anchor] Hydrate canonical artifact fields after validation so the model cannot rewrite titles, dates, links, roles, or descriptions.
- [anchor] Treat a valid but empty or rejected scene as a recoverable answer failure with a simple grounded fallback component.

## Anchor-preserving points
- [anchor] Ground the discussion in the current implementation before choosing a contract.
- [anchor] Treat the composed A2UI tree as the assistant's complete answer.
- [anchor] Allow embedded prose only when it helps the component tree tell a coherent story.
- [anchor] Permit derived structures grounded in retrieved portfolio evidence.
- [anchor] Make quotes visible first-class components.
- [anchor] Put behavior in trusted host components and expose bounded semantic actions to the agent.
- [anchor] Preserve provenance for quotes and portfolio facts.

## Interpretations
- [interpretation] "A2UI" means the agent emits a typed component tree from an allowed catalog, which the host renders.
  - Alternative rejected: Allowing the model to emit arbitrary HTML, JSX, or styling.

## Options
- [anchor] A typed focal answer scene composed from a small catalog of story, evidence, artifact, comparison, timeline, quote, and action components.
- [expansion] Arbitrary model-generated HTML, JSX, CSS, or executable behavior.
  - Why it might be worth it: Maximum visual freedom.
  - Cost: Unsafe output, inconsistent design, poor accessibility, weak validation, and no stable interaction contract.

## Direction changes proposed
- [user-proposed] Replace the separate assistant prose response with a complete A2UI answer surface.
  - Status: explicitly accepted
  - Reason: The UI itself should tell the story and directly answer the question.
- [user-proposed] Support derived visual structures.
  - Status: explicitly accepted
  - Reason: The agent should be able to build comparisons, timelines, and other question-specific answers.
- [user-proposed] Promote quotes to first-class components.
  - Status: explicitly accepted
  - Reason: Current quote annotations are difficult to discover and read.
- [user-proposed] Include interactivity through component-owned behavior.
  - Status: explicitly accepted
  - Reason: The experience should be ambitious without requiring the agent to invent actions at runtime.

## Risks
- [risk] The component protocol could become broad enough to make answers inconsistent or difficult to validate.
- [risk] Quote selection could become presentation-driven and lose its link to source prose.
- [risk] A component tree can contain all the right facts while failing to form a coherent answer.
- [risk] Generated explanatory text can blur the boundary between sourced facts and model-authored connective prose.
- [risk] A large interactive catalog can turn the first implementation into a general application runtime.
- [risk] Treating every retrieved source as a visible module recreates the receipts panel under a new name.
- [risk] Allowing arbitrary nested containers recreates a block-based page builder and weakens the focal hierarchy.
