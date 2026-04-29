# Product

## Register

brand

## Users

Three audiences land on this site, in roughly this order of weight:

1. **Recruiters and hiring managers.** Scanning fast, looking for credibility signals (Repple, Purdue CS+AI, research labs, hackathons) and a way to reach out. They want the work surfaced without effort.
2. **Fellow founders and VCs.** Peers and potential collaborators who care about taste, building velocity, and how Karthik thinks about agents, MCP, and AI-native products. They read for judgment, not just credentials.
3. **General blog readers.** People who landed via a post or a link, here for the writing and the photography. They want a calm reading experience and a reason to come back.

All three meet the same front door: a chat that answers questions about Karthik, with receipts.

## Product Purpose

A personal site that behaves like a conversation, not a CV. Visitors ask anything about Karthik and the site answers in his voice, surfacing the underlying work entries, projects, and writing as receipts in a side panel. Success looks like: a recruiter finds the right project in two questions, a founder reads a post they didn't come for, a blog reader leaves with a sense of who Karthik is beyond the resume.

The chat is the product. Everything else (work, projects, blog, gallery, about) exists to be cited.

## Brand Personality

Confident, curious, warm.

Voice is plainspoken and a little dry. First person on the about page, third person in chat answers (the site speaks about Karthik, not as him). No marketing gloss, no humblebragging, no startup-founder voice. Lines like "happiest with a hard problem" and "Someone who can't leave a good idea alone" set the register: assertive but unshowy.

Emotionally the interface should feel like a well-lit room with good books in it. Calm, considered, with one bright object on the desk.

## Anti-references

Three things this site should never read as:

- **Vibecoded.** No AI-template aesthetic. No bento grids, no hero-metric stat blocks, no glassmorphism cards, no gradient-text headlines, no purple-to-pink anything, no "Built with Next.js + shadcn" look that says nothing about who lives here.
- **Corporate.** No SaaS landing-page voice, no feature-grid sections, no "Trusted by" logo wall, no stock-photo gradients, no navy-and-gold finance-bro palette.
- **Brutalist.** No oversize black borders, no monospace-everywhere, no Helvetica-on-white-with-yellow-blocks, no deliberately ugly grid systems. Restraint, not aggression.

In the right lane: Lovable (for the chat-first UX with artifacts), Tennr (for editorial-warm UI density that still feels engineered). Anything that reads as a thoughtful editorial product with a single committed accent color.

## Design Principles

1. **Chat is the home.** Every other surface is something the chat can cite. Don't build pages that compete with the conversation, build pages that reward someone who clicked through from one.
2. **One bright object.** Vermilion accent is the only saturated color on the page. It marks the live cursor of attention: the avatar dot, the send button, the active citation, the focused border. Never decorative, always functional.
3. **Editorial over UI.** Serif italics for voice, sans for structure, mono for system labels (Receipts, Try, Queued). Type does the heavy lifting; chrome stays out of the way.
4. **Show the work, not the marketing.** No claims the site can't immediately back up with a citation, a project page, or a blog post. Receipts beat adjectives.
5. **Quiet by default, alive on interaction.** Stillness is the resting state. Motion only when something actually happens (a message arrives, a citation threads to its card, a chip is clicked). No ambient animation, no decorative scroll effects.

## Accessibility & Inclusion

Target WCAG 2.1 AA as the floor. Specific commitments already wired into the codebase that should be preserved:

- `prefers-reduced-motion` disables `rise`, `slip`, and `tick` animations.
- All text-on-cream pairings need to clear AA contrast (the ink scale is built for this; verify any new color additions against `--color-surface` and `--color-surface-raised`).
- Focus is communicated through border-color changes on the input wrapper rather than a global outline ring. New interactive elements need their own visible focus state, not a missing one.
- The vermilion accent at `oklch(53% 0.225 26)` is the only saturated hue and should never be the sole signal for state (pair with text, weight, or position).
- Chat answers render through ReactMarkdown, so any new markdown features need to keep semantic structure (real headings, lists, links) rather than styled divs.

No specific assistive-tech user research has been done; revisit if and when that surfaces.
