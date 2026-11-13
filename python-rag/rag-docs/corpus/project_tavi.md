---
applies_to: [project:tavi]
topics: [Voice AI, sandboxed coding agents, synthetic meeting evaluations]
---

Engineering standups are supposed to unblock people. In practice, every small question becomes a follow-up: “what does that endpoint return?”, “can someone draft the ticket?”, “let’s just bump that timeout.” A team walks out with 15 tiny action items on top of the real work, and each one costs a context switch, a Slack thread, or another meeting. We’re building Tavi to clear those small items during the standup itself, so people only leave with the big tasks they own.

Tavi joins the standup as a voice teammate. When someone asks a question about the codebase, Tavi answers it on the spot. When someone needs a ticket, PR description, or summary, Tavi drafts it while everyone is still talking. When the team agrees on a small change, a sandboxed coding agent makes it and shows the result in a live preview before the meeting ends.

The hard part is that standups are several people talking to each other, not to an assistant. Tavi has to tell when it’s being asked something, when a comment follows up on its last answer, and when to stay quiet. We test that by playing scripted multi-person meetings into it with synthetic voices and scoring when it spoke and when it should have.
