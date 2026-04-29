---
name: Karthik Thyagarajan
description: A personal site that behaves like a conversation, with vermilion as the only saturated color
colors:
  surface: "oklch(95% 0.022 82)"
  surface-raised: "oklch(97% 0.016 82)"
  surface-muted: "oklch(92% 0.028 82)"
  surface-sunken: "oklch(90% 0.032 82)"
  ink: "oklch(20% 0.018 55)"
  ink-muted: "oklch(42% 0.018 60)"
  ink-subtle: "oklch(58% 0.014 65)"
  ink-faint: "oklch(72% 0.012 70)"
  hairline: "oklch(84% 0.024 78)"
  hairline-strong: "oklch(74% 0.028 78)"
  accent: "oklch(53% 0.225 26)"
  accent-hover: "oklch(47% 0.22 25)"
  accent-soft: "oklch(92% 0.05 25)"
  accent-tint: "oklch(95% 0.024 23)"
typography:
  display:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6.5vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  voice:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(1.1rem, 2vw, 1.4rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
    fontStyle: "italic"
  body:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.2em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-send:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "36px"
  button-send-hover:
    backgroundColor: "{colors.accent-hover}"
  chip-suggestion:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  chip-suggestion-hover:
    textColor: "{colors.ink}"
  bubble-user:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  input-shell:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  input-shell-focus:
    backgroundColor: "{colors.surface-raised}"
  citation-chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Karthik Thyagarajan

## 1. Overview

**Creative North Star: "The Lit Reading Room."**

A warm, paper-cream surface holding a quiet conversation, with one bright object on the desk. The site reads first as a piece of writing and second as software. Density is low at rest, but the chrome is engineered, not sketched: hairlines are deliberate, type is set with care, and one saturated color is reserved for the moment something actually happens.

The aesthetic rejects three things by name. It rejects the **vibecoded** look: bento grids, glassmorphism, gradient text, hero-metric stat blocks, the generic Next.js + shadcn template aesthetic. It rejects the **corporate** look: SaaS landing voice, "Trusted by" logo walls, navy-and-gold finance palettes, feature-grid sections. It rejects the **brutalist** look: oversize black borders, monospace-everywhere, deliberately ugly grid systems. The reference points are Lovable (chat-first interface with a receipts panel) and Tennr (editorial-warm UI density that still feels engineered).

**Key Characteristics:**
- Cream surface, warm ink, one vermilion accent
- Sans for structure, serif italic for voice, mono for system labels
- Hairlines and tonal layering instead of shadows
- Stillness at rest, motion only on real events
- Functional color: vermilion marks the live cursor of attention, never decoration

## 2. Colors: The Cream and Vermilion Palette

A palette of one accent against a tonal cream-and-ink stack. Every neutral is tinted toward warm hues (60° to 82° in OKLCH), so nothing reads as cold gray.

### Primary
- **Vermilion** (`oklch(53% 0.225 26)`): The single saturated color. Used on the avatar dot, the send button, the focus border on the input shell, the active citation chip, the blockquote rule, and the underline on inline links inside chat answers. Never decorative.
- **Vermilion Deep** (`oklch(47% 0.22 25)`): Hover state for vermilion surfaces and links. Slightly darker, same hue.

### Tertiary (accent supports)
- **Vermilion Wash** (`oklch(92% 0.05 25)`): Soft fill for accent backgrounds where the full vermilion would shout. Reserved for selection highlight and rare accent surfaces.
- **Vermilion Tint** (`oklch(95% 0.024 23)`): The faintest cream-tinted-with-red. Used for the queued-message chip background when active.

### Neutral
- **Cream Surface** (`oklch(95% 0.022 82)`): The page. Warm, paper-like, not white.
- **Cream Raised** (`oklch(97% 0.016 82)`): Input shell, chip background, artifact card surface. Slightly lighter than the page so interactive elements lift without shadow.
- **Cream Muted** (`oklch(92% 0.028 82)`): Inline code background, disabled states.
- **Cream Sunken** (`oklch(90% 0.032 82)`): Reserved for nested wells if needed; rare.
- **Warm Ink** (`oklch(20% 0.018 55)`): Body text, headlines, the user message bubble. Near-black with a warm cast, never `#000`.
- **Ink Muted** (`oklch(42% 0.018 60)`): Secondary text, chip text at rest, subtitle copy.
- **Ink Subtle** (`oklch(58% 0.014 65)`): Mono labels, metadata, dividers.
- **Ink Faint** (`oklch(72% 0.012 70)`): Placeholder text, the "↗" external-link glyph, separator pips.
- **Hairline** (`oklch(84% 0.024 78)`): The default 1px border. Used on cards, dividers, input shells, citation chips.
- **Hairline Strong** (`oklch(74% 0.028 78)`): Slightly heavier border for connect-link underlines and project-link chips.

### Named Rules
**The One Bright Object Rule.** Vermilion is the only saturated color on any screen. It marks the live cursor of attention and nothing else. If you find yourself reaching for vermilion to decorate a heading, a divider, or a card edge that is not interactive, stop. The accent stays rare so it stays loud.

**The No True Black, No True White Rule.** Never `#000`, never `#fff`. Every neutral carries a hue cast (warm 55°-82° in OKLCH). Cold grays read as default-template; the warm cast is the signature.

## 3. Typography

**Display Font:** Host Grotesk (with `ui-sans-serif`, `system-ui`, `sans-serif` fallbacks). Loaded as a Next.js variable font; OpenType features `ss01` and `cv11` are on globally for sharper alternates.

**Voice Font:** Source Serif 4 (with `Iowan Old Style`, `Georgia`, `serif` fallbacks). Used **only in italic**. This is the voice of the site, not a body face.

**Label Font:** `ui-monospace` system stack. Used at small caps for system labels (Receipts, Try, Queued, About, the kicker line above each headline).

**Character:** Host Grotesk gives precise sans structure with subtle warmth in its terminals; Source Serif 4 italic adds the bookish, first-person register. Mono labels keep system chrome legibly engineered. The pairing reads as *editorial product*, not *startup landing*.

### Hierarchy
- **Display** (Host Grotesk, weight 500, `clamp(2.5rem, 6.5vw, 4.25rem)`, line-height 0.96, tracking -0.02em): The home headline ("Karthik Thyagarajan."). One per page.
- **Headline** (Host Grotesk, weight 500, `clamp(2rem, 5vw, 3rem)`, line-height 1.02, tracking -0.02em): Section openers on About, Work, Projects.
- **Voice** (Source Serif 4 italic, weight 400, `clamp(1.1rem, 2vw, 1.4rem)`, line-height 1.3): Subtitle quotes, the artifact-empty line, blockquotes. Always italic, always serif, always voicing Karthik.
- **Body** (Host Grotesk, weight 400, 15px, line-height 1.7): Chat answers, About prose, project descriptions. Capped at 65-75ch in long-form contexts.
- **Label** (Mono, weight 400, 11px, tracking 0.2em, uppercase): Kickers ("Portfolio · conversational"), section labels (Education, Skills, Interests), system rails (Receipts, Try, Queued).
- **Inline** (Host Grotesk, weight 400, 13px-14.5px): Chip text, navigation, metadata.

### Named Rules
**The Italic Voice Rule.** Source Serif 4 only ever appears italic. Roman serif weights are forbidden on this site. The italic carries the personal voice; setting it upright would turn voice into editorial drag.

**The Mono Labels Only Rule.** Mono is reserved for system labels and kickers. Not for body, not for code blocks larger than a phrase, not for emphasis. Inline `code` fragments inside chat answers use mono; full prose passages do not.

## 4. Elevation

The system is **flat-by-default with tonal layering**. Depth comes from cream tonal steps (`surface` < `surface-raised` < `surface-muted`) and 1px hairlines, not from shadows. Two soft shadow tokens exist for the input shell and its focus state, and they are the only shadow vocabulary on the site.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 1px 2px oklch(20% 0.015 60 / 0.04), 0 2px 6px oklch(20% 0.015 60 / 0.04)`): Resting state of the input shell. Almost invisible, just enough to lift the input off the page.
- **Lift** (`box-shadow: 0 4px 12px oklch(20% 0.015 60 / 0.06), 0 1px 3px oklch(20% 0.015 60 / 0.04)`): Focus state of the input shell. Slightly more presence when active.

### Named Rules
**The Tonal Lift Rule.** When a surface needs to sit above the page, raise it by stepping up the cream scale (`surface` → `surface-raised`) and outlining it with a hairline. Reach for `shadow-soft` only on the input shell. Cards, chips, citation tiles, and artifact entries lift with tone and hairline alone.

**The No Decorative Shadow Rule.** Shadows are not atmospheric. They never sit under hero text, never glow under buttons, never blur a card edge for "depth." Two shadow tokens exist; both belong to the input.

## 5. Components

### Buttons
- **Send button** (the one true button on the site): vermilion fill (`accent`), cream text (`surface`), pill shape (36×36px circle), single arrow-up icon (16px). Hover swaps to `accent-hover`. Disabled drops to 30% opacity. This is the only filled button on the site.
- **Text links and "See everything" actions**: no fill, no border. `ink-muted` at rest, `ink` on hover. Underline only on chat-answer inline links (vermilion underline, 1px, 3px offset).
- **Connect links** (LinkedIn, GitHub, Email, Resume): `ink` text with a `hairline-strong` 1px bottom border that switches to `accent` on hover, with a trailing "↗" glyph that also switches to `accent`.

### Chips
- **Suggestion chip** (Try, hero rotation): `surface-raised` fill, `hairline` 1px border, `ink-muted` text, pill shape, 14px×6px padding. Hover: border switches to `ink`, text to `ink`. Never vermilion at rest.
- **Citation chip** ("Pulled from"): same shell as suggestion chip but text is `ink`. When active or threaded to its card in the receipts panel, the border becomes `accent` and text becomes `accent`.
- **Queued chip**: pill, `surface-raised` fill, `hairline` border, `ink-muted` text. The active (currently-edited) queued chip swaps to `accent` border, `accent-tint` background, `accent-hover` text.

### User message bubble
- `ink` fill, `surface` text, asymmetric radius (`rounded-lg` everywhere except the top-right which is `rounded-xs`), 10px×16px padding, max-width 85% of the column. Right-aligned in the chat column. Never vermilion.

### Input shell
- `surface-raised` background, `hairline` 1px border at rest, 14px radius, 16px×12px padding, `shadow-soft`. On focus-within: border becomes `accent`, shadow becomes `shadow-lift`. The textarea inside is transparent, max height 160px, auto-resizing. Placeholder is `ink-faint`.

### Artifact card (Receipts panel)
- No card surface. Each artifact is separated by a 1px top hairline (`border-t border-hairline`) and 28px vertical padding. The hairline becomes `accent` on hover or when threaded from a citation chip. A 5×5px vermilion dot anchors the upper-left of the title row. Never a filled card, never a shadow, never nested.

### Citation thread
- A faint SVG line drawn from each citation chip in the chat column to its corresponding artifact in the right panel, on hover or focus. Stroke is `hairline-strong` at rest, `accent` when active. Hidden below `lg` breakpoint.

### Navigation
- Top nav: `surface/85` background with `backdrop-blur-sm`, sticky. Wordmark "karthik" set in Source Serif 4 italic with a 6px vermilion dot trailing. Inline link list in `ink-muted`, hover to `ink`. Bottom rail on the home page is the same: dot-separated link list, mono-faint pip dividers.
- Mobile artifact treatment: cards render inline below the assistant message instead of in a side panel.

### Quote / Blockquote
- Left border: 2px vermilion. 1em padding-left. Source Serif 4 italic, `ink-muted` text. Used sparingly: the closing Nietzsche quote on About, blockquotes inside blog posts.

### Named Rules
**The No Filled Surfaces Rule.** Outside of the user message bubble and the send button, no UI element has a filled background heavier than `surface-raised`. Cards, chips, artifacts, citations: all live on the cream scale, separated by hairlines.

**The Asymmetric Bubble Rule.** The user bubble has one corner cut to `rounded-xs` (top-right). That asymmetry is the only place radius varies inside a single shape on the site. Don't propagate it.

## 6. Do's and Don'ts

### Do:
- **Do** keep vermilion (`oklch(53% 0.225 26)`) reserved for the live cursor of attention: send button, avatar dot, focused input border, active citation, blockquote rule, inline links inside chat answers.
- **Do** layer surfaces tonally (`surface` → `surface-raised` → `surface-muted`) and separate them with 1px hairlines. Reach for shadow only on the input shell.
- **Do** use Source Serif 4 only in italic, only for voice (subtitles, blockquotes, the artifact-empty line). Roman serif is forbidden.
- **Do** use mono at 11px, 0.2em tracking, uppercase, for system labels (Receipts, Try, Queued, kickers).
- **Do** cap body line length at 65-75ch in long-form contexts (About prose, blog posts, chat answers).
- **Do** ease motion with `cubic-bezier(0.2, 0.8, 0.2, 1)` (rise) or `cubic-bezier(0.16, 1, 0.3, 1)` (slip). Both are exponential ease-out curves. Disable all custom motion when `prefers-reduced-motion: reduce`.
- **Do** match new interactive states to the existing pattern: hairline border at rest, vermilion border on focus or active.

### Don't:
- **Don't** use `#000` or `#fff`. Every neutral carries a 55°-82° hue cast in OKLCH. Cold grays read as template.
- **Don't** decorate with vermilion. No vermilion underlines on every link, no vermilion section dividers, no vermilion icons that aren't interactive. The accent is rare on purpose.
- **Don't** wrap things in cards. The artifact panel uses hairlines and tonal lift, not card surfaces. Nested cards are always wrong.
- **Don't** use side-stripe borders (`border-left` greater than 1px as a colored stripe) on callouts, alerts, or list items. The blockquote vermilion rule is the exception, not a pattern to copy.
- **Don't** ship a hero-metric template (big number + small label + supporting stat). That's the SaaS cliché. Anti-reference.
- **Don't** use bento grids, glassmorphism, gradient text, or "Trusted by" logo walls. These are the **vibecoded** and **corporate** anti-references from PRODUCT.md.
- **Don't** ship a brutalist grid: oversize black borders, monospace-everywhere, Helvetica-on-white-with-yellow-blocks. Restraint, not aggression.
- **Don't** add ambient or decorative motion (looping background animations, scroll-driven parallax, hover wiggles). Motion fires on real events only.
- **Don't** introduce a second saturated color. If a feature seems to need one, the answer is almost always a tonal step or a hairline change instead.
- **Don't** rename or reorder the section headers in this file. "Colors" not "Color Palette". "Do's and Don'ts" not "Guidelines".
