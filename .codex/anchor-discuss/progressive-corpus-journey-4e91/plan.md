# Accepted Implementation Direction

## The Unfolding Index

Replace the Work / Projects / Ideas / Writing home menu with four short topical beginnings: AI, Research, Products, and Founders. A visitor's selection expresses interest and becomes the first chapter of a single coherent journey.

Each selection adds a new sparse chapter below the existing page instead of navigating away. Earlier chapters remain readable above. A chapter contains a human-scale hook, one concrete and source-grounded receipt from the corpus, optional inline access to the full note, and three possible next directions. The selected direction remains in the document; unselected options disappear.

The route begins with a lens and then uses a flexible vocabulary of narrative moves: substantiate, complicate, transfer to another domain, make personal, or resolve. These are possible moves rather than a mandatory order. The source material determines the shape of a particular journey.

Code still ensures the path develops rather than becoming an infinite related-content feed, and ends once it has formed a coherent idea. A restrained coda indexes the exact sources encountered on that route.

## Visual behavior

- Use one narrow reading field with substantial negative space, not cards, nodes, a mind map, or a flowchart.
- Add each new chapter below and scroll it into view; permit normal upward review of the accumulated path.
- Allow only slight horizontal variation inside a stable reading measure.
- Keep Solar Shadow and Winter Branch as the environmental language. The branch may extend subtly as choices accumulate, but it must not become a literal navigation graph.
- Expand full notes inline without making that expansion part of the branching path.

## AI behavior

TypeSafe does not generate corpus prose, summaries, or choice labels at request time. Deterministic retrieval first produces unused candidates. TypeSafe then makes several atomic judgments against the current path: which candidate continues the active question, adds new information, introduces a useful complication, or transfers the idea to a different domain.

Application code combines those distributions with the current path, source/topic diversity, and repetition penalties. The visible next options should play meaningfully different roles for the current moment, selected from a broader narrative vocabulary rather than a fixed three-part taxonomy. Bounded nondeterminism chooses among high-quality candidates and freezes the result for the session. Low confidence falls back to authored connections.

Each visible continuation includes a compact source name and topical label. Editorial lanes may narrow the candidate corpus when a broad semantic match would violate the visitor's chosen intent; specifically, Founders stays focused on BuildPurdue and Repple founder material.

## Example path

The belief that agents should save time rather than merely effort → Samsung's permission system and its intent/reversibility model → classified NRL RAG and context constraints → the NRL acoustic-to-RGB representation insight → Verbatim's failure and the technical belief that survived it → a source index describing the route as restraint → trust → context → representation → failure.

## Explicit boundaries

- No freeform chat.
- No likes or dislikes; choosing is the signal.
- No attempt to expose the whole corpus during one journey.
- No quiz, onboarding wizard, conventional filter UI, dense graph, or endless related-content feed.
- No arbitrary model-written biography.
