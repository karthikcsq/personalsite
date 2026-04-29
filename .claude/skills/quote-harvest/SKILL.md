---
name: quote-harvest
description: Use when Karthik wants to capture, expand, or revise his thinking on a topic, project, work experience, blog post, or community involvement so it can power the chatbot's annotation feature. Drives an open-ended interview, transcribes his answers into clean prose without rewording, and merges them into a per-artifact corpus file under python-rag/rag-docs/corpus/. Reusable for any new topic; safe to re-run on the same artifact (idempotent, organized by sub-topic of opinion).
---

You are running an interview to capture Karthik's thinking on one artifact (a project, work experience, blog, involvement) or a free-form topic. The output is long-form Karthik prose, organized by sub-topic, written to a markdown file the chatbot will quote from at runtime. Your job is preserve, not summarize.

## Sources of truth (read once, at the start)

Always check current state before asking. Don't ask Karthik what artifacts exist — read them.

| Artifact kind | Source file |
|---|---|
| `work:<Company>` | `python-rag/rag-docs/karthik_thyagarajan_truth.yaml` (`experience` list) |
| `project:<title>` | `personalsite/src/data/projects.json` (each entry's `id` IS the slug; the artifact id is `project:<id>`) |
| `involvement:<slug>` | `python-rag/rag-docs/involvement.yaml` (each entry's `slug` field) |
| `blog:<slug>` | `personalsite/blog/posts/*.md` (filename without `.md` is the slug) |
| `topic:<slug>` | Free-form. No registry. Karthik names it. |

The artifact id grammar must match the chat API's emitted ids exactly. If unsure, grep `personalsite/src/app/api/chat/route.ts` for `work:` / `project:` / `involvement:` / `blog:` to confirm.

## Corpus location

`python-rag/rag-docs/corpus/<slug>.md` — one file per artifact id. Slug derives from the id by replacing the colon with an underscore and lowercasing the rest:

- `project:google-tools-mcp` → `corpus/project_google-tools-mcp.md`
- `work:Peraton Labs` → `corpus/work_peraton-labs.md` (lowercase, spaces → hyphens)
- `involvement:buildpurdue` → `corpus/involvement_buildpurdue.md`
- `topic:agents` → `corpus/topic_agents.md`

## Flow

### 1. Pick the artifact

**If invoked with an argument** (e.g. `/quote-harvest project:google-tools-mcp` or `/quote-harvest BuildPurdue`), resolve it directly. Confirm only if ambiguous.

**If invoked with no argument**, suggest. Don't open with a blank "what do you want to talk about?" — Karthik already knows there's a long list of artifacts; he wants you to surface what's worth doing next.

To build the suggestion list:
1. Enumerate every artifact id from the source registries (above).
2. List every existing corpus file under `python-rag/rag-docs/corpus/` and its sub-topic headings.
3. Group artifacts into three buckets:
   - **No corpus yet** — highest priority. These cards currently render annotation-less.
   - **Thin corpus** — has a file but only 1–2 sub-topics; room to deepen.
   - **Already covered** — has 3+ sub-topics; lower priority unless something new happened.
4. Surface 3–5 specific candidates from the top two buckets, AND propose 2–3 free-form `topic:<slug>` ideas (see "Finding topic ideas" below). Be concrete:

> You haven't captured anything for these artifacts yet:
> - `project:google-tools-mcp` — your MCP server. Likely takes: why MCP needed unification, what the auth pain point was, how you think about the tool's design contract.
> - `work:Peraton Labs` — your RL-vs-malware work. Likely takes: what most defenders get wrong, what surprised you about adversarial traffic.
> - `involvement:keel` — your other accelerator. Likely takes: how it differs from BuildPurdue, what you've learned from running both.
>
> Or these have a thin corpus you could deepen:
> - `involvement:buildpurdue` — currently has *Founding rationale*. Could add: operating model, alumni pipeline, internal platform, what you'd do differently.
>
> Free-form topics worth capturing (no artifact tie-in needed):
> - `topic:agents` — recurring across google-tools-mcp, Repple, and your blog. Likely takes: what most agent stacks get wrong, why control beats capability.
> - `topic:ai-tooling` — comes up across your MCP work and Memories.ai. Likely takes: what dev tooling is missing, what you'd build next.
>
> Pick one (or name a topic that's not on the list).

Karthik picks. Resolve his answer to an artifact id. If ambiguous, confirm.

#### Finding topic ideas (when Karthik doesn't know what to write)

`topic:<slug>` corpus files capture takes that aren't tied to any single project, role, or post. They surface in the chatbot when a visitor asks general questions ("what do you think about X?") that no artifact directly answers. Karthik often won't know what topics he has views on — your job is to surface candidates from the evidence, not ask him cold.

To propose topics:

1. **Scan recurring themes across existing corpus.** If three project corpus files all touch "agent control," that's a topic begging to be extracted (`topic:agent-control`). Read the sub-topic headings of every existing `corpus/*.md` and look for words/phrases that repeat across artifacts.
2. **Mine blog posts.** A blog post is one piece of writing; a topic is a stance that survives across many. If a blog post argues a thesis, the topic is the underlying belief — and adjacent musings that didn't fit in the post belong in `topic:<slug>`, not the blog itself.
3. **Look at projects/work bullets for stance words.** YAML bullets like "argued for X over Y" or "believed Z" are stance-shaped. The artifact corpus captures the local stance; the topic corpus captures the general one.
4. **Check the topics registry for gaps.** Read `python-rag/rag-docs/topics.yaml` — entries listed there but with no `corpus/topic_<slug>.md` file are explicit asks Karthik already flagged but never wrote.
5. **Phrase candidates as questions a visitor might ask.** Good topic slugs answer "what do you think about X?" cleanly. `topic:open-source` is good. `topic:my-thoughts` is bad. `topic:why-mcp-matters` works only if it survives without naming a specific project.

Surface candidates with the evidence trail:

> `topic:agents` — recurring sub-topics across `project_google-tools-mcp.md` ("why this exists"), `project_repple.md` ("design rationale"), and your blog post `agents-need-rails`. There's a stance pattern about control-vs-capability that doesn't live in any one artifact.

When in doubt, propose, don't ask. Karthik will reject ideas faster than he generates them, and rejection itself sharpens the slug.

A single session covers ONE artifact. If he wants a second, finish this one and re-invoke the skill.

### 1b. Blog artifacts: refuse and exit

Blog posts at `personalsite/blog/posts/<slug>.md` are already authoritative long-form Karthik prose, and the runtime loader reads them directly. Corpus files for blogs are intentionally NOT consulted — having both invites drift between the published post and the corpus copy.

When Karthik invokes the skill on a `blog:<slug>` artifact:

1. Tell him: "The blog post is already the corpus — the runtime reads it directly. The skill won't write a corpus file for blogs. If you want to expand on a post, edit the post itself; if you want a take that doesn't belong in the post, capture it under a `topic:<slug>` artifact instead."
2. Exit. Do NOT write a `corpus/blog_<slug>.md` file under any circumstances.

### 2. Load existing corpus

If `corpus/<slug>.md` exists, read it. Note the existing `## <sub-topic>` headings under the frontmatter. Show them to Karthik:

> "You've already talked about this artifact under: **Founding rationale**, **Operating model**. Want to extend one of those, or open up a new sub-topic?"

If no file exists, say so: "No existing corpus for this artifact — starting fresh."

### 3. Interview

Open-ended. 5–15 questions. **Each question branches off the previous answer.** Don't run a fixed script.

**Bias every question toward producing opinions, not facts.** The chatbot's runtime picker pulls verbatim sentences as standalone quotes. Sentences that describe what something *does* ("We run Night Shift every week") aren't quotable — they're operational facts. Sentences that state what Karthik *believes* ("People don't listen to advice unless they're faced with a challenge") are quotable. Optimize for the second.

Heuristic: if Karthik's answer could be lifted from a Wikipedia page or a job description, you asked the wrong question. Re-ask, pushing for the take underneath.

Anchors that produce opinions:
- "Why does this exist? What was missing without it?"
- "What's the take you keep coming back to that most people get wrong?"
- "What does most of [the field/the campus/the industry] get wrong about this?"
- "What's the strongest claim you'd defend about [X]?"
- "What's the part you're most proud of, and the part that you're still unhappy with?"
- "If a journalist quoted one sentence from you about this, what would you want it to be?"
- "When you argue with someone about [X], what's the line you keep coming back to?"
- "What's a decision you made here that someone else would push back on?"

Anchors to avoid (they extract facts, not takes):
- "Walk me through how it works." (operational)
- "What does your week-to-week look like?" (job-description)
- "How did you get into this?" (résumé prose)
- "What does the org do?" (mission-statement boilerplate)

Use operational questions sparingly and only as setup for an opinion follow-up. Example: if you need to ask "how does the cohort work" to get oriented, immediately follow with "and what would most other accelerators get wrong about that selection process?"

For follow-ups, push past the first surface answer. If he gives a one-liner, ask for the texture under it. If he gives 5 paragraphs of *facts*, pick the most opinion-bearing strand and dig there — don't just ask for more facts.

Stop when he signals (he says he's done, repeats himself, or starts hedging). Don't fish for more material than he has.

### 4. Transcribe — preserve his voice

Take his free-form answers and lightly clean them into coherent paragraphs:

**Allowed:**
- Fix grammar, spelling, run-ons
- Break a long unbroken thought into paragraph-sized pieces
- Remove obvious filler ("um", "I guess", "you know") if he was speaking
- Trim parentheticals he abandoned mid-sentence

**Forbidden:**
- Reword for clarity (his phrasing IS the value)
- Condense or summarize ("he said X, in other words Y" — never)
- Add transitions or stitching language he didn't say
- "Improve" claims, hedge them, or soften strong takes
- **Introduce em dashes ("—" or "--").** Karthik does not use em dashes in his writing. If a sentence breaks, use a comma, period, or parentheses. Never insert an em dash to "fix" a run-on or join two ideas. (If Karthik dictated an em dash himself, leave it.)
- Introduce contrastive parallelism ("not X, but Y" / "less about X, more about Y" / "it's not just X, it's Y") that wasn't in his original phrasing.

When in doubt, keep more of his words, not fewer. The chatbot's runtime picker pulls verbatim from this file — anything you reword is a phrasing the picker can never use.

### 4b. Cleanup pass (mandatory before diff)

After transcribing, re-read every paragraph once with cleanup eyes before showing the diff. The "Allowed" list in step 4 is not optional — it's a checklist. Past sessions have shipped corpus files with run-ons, broken parallelism, and pronoun mismatches because the model erred too far on "preserve his words." Preserving his words does NOT mean preserving his typos.

For each paragraph, scan for:

1. **Em dashes anywhere.** Replace with comma, period, or parentheses. (Even em dashes that arrived via paste from his messages — Karthik does not use them; assume they came from a tool, not him.)
2. **Run-on sentences.** A sentence with 4+ commas chaining clauses about different subjects is almost always a run-on. Split into two sentences.
3. **Sentence fragments lacking a verb.** "Also events, check-ins, everything integrated with our website" is a fragment. Add the verb ("are integrated") or fold into the previous sentence.
4. **Subject-verb / number agreement.** "a problem... solve them" → "a problem... solve it". "Workshops are problems" → "workshops address problems".
5. **Pronoun antecedent ambiguity.** If "they"/"it" could refer to two things, restructure so the referent is unambiguous. Don't introduce new nouns; reorder his existing nouns.
6. **Broken parallel structure in lists.** "for X to do A, for Y to do B, and to do C" — the third item dropped its subject. Either restore it or merge into the previous clause.
7. **Restrictive vs non-restrictive comma errors.** "a priority, that's adjustable" → "a priority that's adjustable" (restrictive, no comma). "Foo, which is bar" stays as-is (non-restrictive).
8. **Speech-to-text artifacts.** "We were speaking, and thought" → "We were talking and thought". "set up process" (verb) → "setup process" (noun). Numerals where prose would use words: "3rd agent" → "third agent". Hyphenation in compound modifiers: "multi agent system" → "multi-agent system".
9. **Filler that survived dictation.** "to spend time sifting" → just "sifting" if the previous clause already said "spend time". "in regards to" stays (his voice); "you know"/"like"/"I guess" go.

The cleanup pass is conservative, not stylistic. You are NOT making it sound better. You are making it grammatical. If a fix requires inventing phrasing he didn't use, stop and ask him to restate instead. The test: if Karthik re-read the corrected version, would he say "yeah, that's what I meant" or "wait, where did that phrase come from"? Only ship fixes that pass the first test.

When you do apply fixes, list them concisely after writing (e.g. "Fixed: em dashes around teammates clause; run-on of 'He remembered sitting down...' split; parallel structure in 'There was no reason...'"). Karthik wants to see what you changed, not justify each one.

### 4c. Style review with approval (mandatory before diff)

After the grammar cleanup pass, do a second pass for weak phrasing. Unlike 4b (which is automatic and applied silently), this pass requires Karthik's explicit approval per item. The fixes here touch voice and word choice, so the risk of overwriting his phrasing is real — never apply silently.

Scan the cleaned prose (both newly transcribed sections AND any older sections you'll be appending into) for the following failure points. These are the patterns that ship past the grammar pass but still read as weak.

1. **Dangling intensifiers.** "Especially X," "particularly Y," "even Z" used with no comparison baseline. The intensifier promises a contrast the sentence never delivers. Either supply the baseline ("especially in robotics, compared to NLP") or drop the intensifier.
2. **"Doesn't make sense" misused.** Karthik uses this to mean "is unjustified" or "is irrational," but the phrase literally means "is incoherent." If the thing being described is merely frustrating or unjustified — not logically incoherent — replace with the actual claim ("was unjustifiable," "was wasteful," "was avoidable").
3. **Vague or passive verbs.** "Got installed," "process stuff," "do things," "deal with it." If the verb hides who acts or what specifically happens, replace it. Models aren't "installed" — they're deployed, loaded, integrated, run on. Don't soften the action.
4. **Hedge-then-complain structure.** Opening a thought with "I'm not sure exactly..." or "I don't really know..." followed by a grievance. The hedge undercuts the complaint and abdicates the take. Either commit to the take or commit to the question — not both.
5. **Filler intensifiers used 3+ times in one doc.** "Genuinely," "really," "absolutely," "actually," "literally," "definitely." Once is fine. Three or more means the word has stopped doing work. Cut all but the one or two where the contrast against its absence is the actual point.
6. **Redundancy in qualifier stacks.** "Primary single problem," "nearly completely solved," "most very best." Pick one. Stacked qualifiers cancel each other out or reveal the writer hedging mid-claim.
7. **Orphan pronouns.** Sentences starting with "It" or "they" where the antecedent is two paragraphs back, ambiguous, or missing. Distinct from the 4b pronoun pass — this is about distance and clarity, not grammar agreement.
8. **Number/agreement that survived 4b.** Singular product names ("Gemini") with plural pronouns ("they"). Aggregate nouns treated inconsistently. The grammar pass catches most; this pass catches the ones that read as grammatical but feel off.
9. **Broken metaphors.** Figurative phrases that don't actually track ("build an elephant" for a moat, "boil the ocean" used as praise). If the metaphor doesn't compress meaning faster than literal phrasing, drop it or replace with a metaphor that does work.
10. **Wrong word choice.** "Concession" where "tradeoff" is meant. "Disinterested" where "uninterested" is meant. Words that are close to right but carry the wrong connotation. Trust the reader to feel the slip even if they can't name it.
11. **Tense slips inside one thought.** Past tense narrating a problem the speaker says they're still inside. "I'm working on X, and X didn't make sense" — pick one frame.
12. **Contrastive parallelism that crept in.** "It's not X, it's Y" / "less about X, more about Y." Already forbidden in 4b for transcription, but easy to introduce when rewriting. Re-check.

For each instance you find, present a numbered item to Karthik with this shape:

> **N. `<filename>:<line>` — <one-line failure mode label>**
>
> > "<original sentence verbatim>"
>
> **Issue:** <one sentence; name the failure mode and what it does to the reader>
>
> **Proposed:**
> > "<rewritten sentence>"

Then wait. Karthik replies "approve / deny / edit" per number, possibly in batch ("apply 1, 3, 5; deny 2; reword 4 to..."). For denials, ask whether the original is fine or whether the failure point itself was a false positive (so you don't flag it again next pass). For edits, apply his version verbatim — never re-rewrite his rewrite.

**Discipline:**
- Cap the list at the strongest 8–12 items per session. If you find more, surface only the strongest and offer to do a second pass after.
- Don't reach. If a sentence is plain but not weak, leave it. Karthik's voice is plain on purpose.
- Don't propose rewrites that introduce contrastive parallelism or em dashes. The rewrite must pass 4b's checklist itself.
- Show the user-facing text only, not your scan notes. Don't say "I'm scanning for hedge-then-complain..." — just present the items.
- If zero issues are found, say so in one sentence and move on. Don't manufacture findings to justify the step.

After Karthik responds, apply the approved rewrites in place (in the cleaned prose, before sub-topic organization). The diff in step 6 reflects the post-rewrite state.

### 5. Organize by sub-topic

Group the cleaned prose into sub-topics. Each sub-topic gets a `## <Title>` heading. Examples of good sub-topic titles:

- "Founding rationale"
- "Operating model"
- "Internal platform"
- "Alumni pipeline"
- "What I'd do differently"
- "How I describe it to outsiders"

Bad sub-topic titles: "Session 1", "Notes", "More thoughts" — these are dated/ordinal blobs. Use thematic names.

If new material extends a sub-topic that already exists in the file: append to it. Don't create a near-duplicate heading. If the new material warrants a new sub-topic: open one.

### 6. Show the diff

Before writing, show Karthik the proposed change. For an existing file, surface:
- Which sub-topics will be modified (with the new prose appended underneath)
- Which sub-topics will be newly created
- Frontmatter diffs (e.g. new `topics` tags)

For a new file, show the full proposed body.

Accept edits. He may push back on phrasing — apply his correction verbatim, never argue. He may decide a sub-topic should be split or merged — restructure.

### 7. Write the file

File frontmatter format:

```markdown
---
applies_to: [<artifact_id>]
topics: [<short>, <free-form>, <tags>]
---
```

Multiple `applies_to` ids are allowed if the same prose is genuinely useful for several cards (e.g. a take on MCP applies to both `project:google-tools-mcp` and `topic:agents`). Topics-only files (no `applies_to`) are allowed for cross-cutting takes; they're stored but not yet consulted by the chatbot's runtime.

Body: `## <Sub-topic>` headings, prose paragraphs underneath. No dated session blobs.

Idempotent: if Karthik aborts before step 7, no file is written. If he aborts mid-write, the file is left in its prior state — never half-written.

### 8. Reindex Pinecone

After writing the corpus file (and updating `topics.yaml` if a new `topic:<slug>` was created), automatically run:

```bash
cd python-rag && uv run python create-pinecone.py
```

This is UPDATE mode (incremental, keeps existing vectors). Run it without asking — the corpus file has zero effect on the live chatbot until indexing completes, so skipping this step ships a silent no-op. If the command fails, surface the error to Karthik; do not retry blindly. Skip only if Karthik explicitly says he'll reindex later.

## Anti-patterns

- **Asking before reading.** "What artifacts do you have?" — wrong. Read the registries first.
- **Pre-extracting "quotes."** This skill writes prose, not bullet lists of one-liners. The picker extracts at runtime.
- **Stitching sessions chronologically.** Sub-topic, not date.
- **Putting words in his mouth.** If he said something muddled, ask him to restate. Don't write a "cleaner" version yourself.
- **Demanding completeness.** A short, sharp file beats a sprawling thin one. He doesn't need to cover every angle in one sitting.
