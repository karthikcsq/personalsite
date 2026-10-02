# Discussion

## Status
Anchor confirmed. Interaction ideation is active.

## Current question
Can a minimalist, single-page portfolio become a visitor-shaped journey that progressively weaves together Karthik's real corpus, while staying legible, non-chatty, and genuinely insightful?

## Decisions
- The choose-your-own-adventure interaction is accepted as the leading direction.
- Thematic entry directions replace the glanceable Work / Projects / Ideas / Writing menu.
- Choosing a direction expresses interest; there will be no explicit like/dislike controls.
- Each session constructs one coherent path rather than a comprehensive corpus index.

## Discussion log

### 2026-09-18 — Anchor confirmation
- User clarified: “choosing a direction should expressi nterest, and this should replace the glanceable categories. the journey should be one coherent path”
- Consequence: optimize the first screen for curiosity and the accumulated page for narrative continuity, not taxonomic coverage.

### 2026-09-18 — Proposed interaction: The Unfolding Index

#### Core experience
- The homepage offers three or four thematic ways into Karthik rather than portfolio categories.
- A choice does not navigate away. It becomes the first chapter heading and reveals one source-grounded story fragment below it.
- Every chapter contains a human hook, one concrete technical or personal receipt, an expandable path to the full source note, and three possible continuations.
- Choosing a continuation is the only interest signal. The selected option stays in the document; unselected options disappear.
- Earlier chapters remain above, so the page gradually becomes a readable record of one coherent route.
- The journey ends after a deliberately short arc rather than scrolling forever. Its coda indexes the exact experiences, projects, and notes visited along that route.

#### Narrative motion
- The opening establishes a lens: what kind of question drew the visitor in.
- Later chapters may substantiate it, complicate it, transfer it into another domain, make it personal, or resolve it.
- Those moves are a vocabulary, not a mandatory sequence. The source material determines the shape of a particular path.
- Code still prevents an endless “more related things” feed and ends a route once it has developed a coherent idea.

#### Candidate opening directions
- How I decide what AI should be allowed to do.
- The strange representations that made hard problems tractable.
- What separates a project from something people actually use.
- Why progress feels slow until it happens all at once.

These are provisional copy directions. They are grounded respectively in the agent/AI boundary notes and Samsung permissions; NRL acoustics and context work; Repple, Verbatim, and Google Tools MCP; and the QKD and IDEAS Lab research notes.

#### Example coherent path
1. “How I decide what AI should be allowed to do” opens with the belief that an agent should save time or money, not merely effort.
2. “Show me where trust mattered more than capability” reaches Samsung's permission system and the relationship between user intent, reversibility, and possible action.
3. “What happens when the model has almost no context?” reaches the classified NRL RAG work and the practical cost of indiscriminate context injection.
4. “Show me the stranger technical leap” reaches the NRL acoustic-to-RGB representation insight.
5. “Give me the failure, not the success” reaches Verbatim and what survived after the product died.
6. The coda renders the route as restraint → trust → context → representation → failure, linking every original source.

#### Visual grammar
- One sparse reading field, not cards, nodes, rails, or a flowchart.
- The active chapter occupies a small focal area with substantial whitespace; previous chapters remain fully readable above.
- New material enters below and the page scrolls it into view. The visitor can always scroll back through the route.
- Chapters may alternate their horizontal position slightly, but remain inside a narrow, stable reading measure.
- The Solar Shadow / Winter Branch environment changes very slowly across the journey. A branch can gain a subtle extension after each choice, making the path perceptible without drawing a literal graph.
- Full notes expand inline as optional depth and do not change the path.

#### TypeSafe's role
- Corpus text remains authored and source-grounded. TypeSafe does not generate summaries, connective prose, or choice labels at request time.
- A deterministic retrieval pass produces a candidate pool of unused story nodes.
- One TypeSafe call asks several atomic questions in parallel, such as:
  - Which candidate most directly continues the visitor's active question?
  - Which candidate adds genuinely new information rather than repeating the trail?
  - Which candidate best complicates or challenges what came before?
  - Which candidate transfers the underlying idea into a different domain?
- Code combines the probability distributions with stage, topic diversity, source diversity, and repetition penalties.
- The visible continuations should occupy meaningfully distinct narrative roles selected for the current moment. They must not become three nearly identical “related notes,” but they do not always need to be deepen, complicate, and transfer.
- Bounded nondeterminism samples among high-quality candidates, then freezes the result for the session.
- Low confidence falls back to authored connections. The user never sees an uncertain or incoherent path.

#### Why this is potentially valuable
- The visitor is choosing questions, not operating a portfolio taxonomy.
- Every click reveals a specific claim plus evidence, so interaction pays off immediately.
- Cross-domain transitions show a recurring way of thinking that a Work / Projects / Ideas split cannot show.
- The finished route is small enough to feel authored but personal enough to feel responsive.

#### Open design questions
- Whether the opening should offer three directions or four.
- Whether each chapter begins with Karthik's exact quote or a short authored setup followed by the quote.
- Whether the final coda should simply index the route or add one restrained, source-grounded synthesis sentence.

#### Drift correction
- An independent check found minor drift in treating a five-stage arc and a fixed deepen/complicate/transfer taxonomy as mandatory.
- Both are now explicitly flexible heuristics. Coherence and distinct choices remain required; a universal story template does not.

### 2026-09-19 — Copy correction and build authorization
- User rejected thematic opening sentences as vague AI copy and asked for topical, short, immediately legible beginnings.
- The accepted home choices are now exactly: AI, Research, Products, Founders.
- User explicitly approved building the interaction and the slowly shifting Solar Shadow background.
- Implementation keeps every revealed passage verbatim from the corpus; TypeSafe only ranks which real passage should come next.
- Continuation choices now show their source as well as a short topic, so fragments such as “why it ended” cannot be mistaken as claims about the current chapter.
- The Founders path is an editorial lane through BuildPurdue and Repple founder material. TypeSafe chooses within that lane instead of drifting into unrelated projects.
