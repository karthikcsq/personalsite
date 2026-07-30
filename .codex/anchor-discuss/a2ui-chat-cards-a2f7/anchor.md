# Anchor

## Original request (verbatim)
> I want to tackle something fairly ambitious. right now, we have cards that appear in conjunction to the chat window. I want to rework this to be A2UI - the agent can output custom json with the items that directly answer the user's question, not in the chat window, but rendered seperately. help me think through this, and how it plays into the quote system

## Captured at
2026-07-27T21:36:28.0007034-07:00

## Domain
- Product and system design

## Starting intent
- Replace the current assistant chat bubble and chat-adjacent card experience with an agent-authored A2UI answer.
- Make the rendered component tree tell the complete story that answers the user's question.
- Allow explanatory text inside the components without retaining a separate assistant prose response.
- Make the quote system a visible, first-class part of the answer.

## Goals
- Clarify the product behavior and system boundary for agent-generated UI JSON.
- Support derived structures such as comparisons, timelines, ranked lists, and grouped evidence.
- Determine the relationship among retrieved artifacts, visual components, and first-class quote components.
- Support ambitious interactivity through trusted component behavior and predefined semantic actions.
- Center each answer on one core component that carries the main argument.
- Keep the composition open, dynamic, and modular without resembling a chat transcript or stacked block feed.
- Surface architectural choices and failure modes before implementation.

## Non-goals
- No implementation has been requested yet.
- Do not discard the existing quote corpus or artifact identity without an explicit decision.
- Do not let the agent invent executable code, arbitrary HTML, arbitrary URLs, or novel action semantics.
- Do not render the answer as an indefinitely growing vertical sequence of cards or content blocks.

## Constraints and taste
- The rendered items should directly answer the user's question.
- The assistant's answer must be integrated into the rendered UI; there is no separate assistant chat response.
- Text is allowed only as content embedded within the component tree.
- The UI must tell a coherent story rather than present a loose collection of relevant cards.
- One focal component should own the screen. Supporting modules should clarify or transform that focus rather than compete with it.
- Interaction should replace, focus, reveal, or temporarily layer content instead of continually appending new sections.
- Each turn must have a bounded visible component count and bounded navigation depth.
- The agent may create derived structures from grounded portfolio facts and quotes.
- Quotes should be first-class, prominent components.
- Components own their available interactions, and explicit controls such as buttons may bind to a host-provided registry of default intents.
- The agent may select an allowed intent and supply schema-valid parameters, but it may not define the intent's runtime behavior.
- The agent should select content and composition through a constrained JSON contract.
- The design needs to account for the current quote system rather than treating it as unrelated.
- The composer remains fixed at the bottom center of the viewport.
- The latest turn receives the full answer canvas.
- When a new question is submitted, the previous answer becomes an immutable history snapshot represented compactly in a sidebar.
- Scrolling upward progressively loads prior questions with their corresponding saved A2UI documents.

## Good drift criteria
- A direction change is legitimate if Karthik explicitly chooses it after seeing the effect on conversational answers, artifact cards, quote provenance, and implementation complexity.
- The move from a companion artifact panel to a fully composed answer surface is explicitly accepted.
- The additional implementation complexity of derived structures and interactive components is explicitly accepted.

## Agreement-drift risks
- Treating "A2UI" as arbitrary model-authored HTML instead of a bounded component protocol.
- Expanding a card redesign into a full page-builder or general agent application runtime.
- Letting generated presentation replace factual provenance or Karthik's verbatim quote corpus.
- Preserving the current cards mechanically even if their product role should change.

## Ambiguities (resolved)
- Q: Should the chat answer remain a complete answer or become a short narrative companion to the rendered UI?
  A: Neither. The assistant response is integrated into A2UI, and embedded text plus visual elements must tell the complete story.
- Q: May A2UI compose only known portfolio artifacts or also generate derived structures?
  A: It may create derived structures, including comparisons, timelines, grouped evidence, and similar answer-native compositions.
- Q: Are quotes annotations, first-class components, or both?
  A: Quotes should be first-class components because the current annotations are difficult to see.
- Q: Is the first version read-only or interactive?
  A: It should be ambitious and interactive. Trusted components should own most interaction behavior so the agent does not invent actions dynamically.
- Q: How should explicit controls declare actions?
  A: Buttons and other controls may carry intents selected from a default intent set supplied to the model, such as creating a new chat prompt or opening another component.
- Q: Does each turn replace the prior answer, append a full document, or use a hybrid?
  A: Use a hybrid. The current answer renders fully, prior turns move into a compact sidebar, and scrolling upward progressively loads their saved questions and UIs.
- Q: Where does the primary chat input live?
  A: Fixed at the bottom center of the screen.
- Q: Should the active answer resemble a chat transcript or a stack of content blocks?
  A: No. It should be dynamic, open, and modular, with one core component as the center of the experience.
- Q: Should interactions keep expanding the current answer?
  A: No. Interactions should change or reveal bounded states around the focal component rather than creating an endless document.

## Ambiguities (unresolved)
- The exact initial intent registry and parameter schemas.
- Whether the server returns a complete validated tree after generation or streams progressive tree patches.
- How much model-authored explanatory text is permitted relative to source-bound facts and verbatim quotes.
- How the composer selects a focal component and one of the host-provided spatial composition modes.

## Drift budget
- Scope: high
- Complexity: high
- Interpretation: strict
