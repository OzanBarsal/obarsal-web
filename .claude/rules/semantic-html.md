---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# Semantic HTML

MDN is the authority. An element is chosen by a quoted MDN rule, and the quote goes in the change's
description, not in a code comment. The decisions already made:

| Place | Element | MDN basis (quoted) |
| --- | --- | --- |
| Skills groups | `<dl>`; each group `<div><dt>…</dt><dd><ul><li>…</li>…</ul></dd></div>` — one `<dd>` holding the list, because one `<dd>` per item cannot sit in the two-column grid (grid items blockify) | `<dl>`: "display metadata (a list of key-value pairs)"; "HTML allows wrapping each name-value group in a `<dl>` element in a `<div>` element … or for styling purposes" |
| Metrics strip | `<dl>`; `<dt>` label, `<dd>` value; `dt` first in the DOM, `column-reverse` for the visual order | same |
| Contact block | `<address>` around the e-mail link and a `<ul aria-label>` of the social links; the `<footer>` stays outside it | `<address>`: "contact information for a person or people, or for an organization"; "may include … email address … social media handle". Permitted content excludes "sectioning content … and no `<header>` or `<footer>` element" — so no `<nav>` inside it |
| Footer lines | two `<p>`; the year is plain text, **not** `<time>` | `<time>`: "for presenting dates and times in a machine-readable format. For example, this can help a user agent offer to add an event to a user's calendar." A copyright year is not that. (`YYYY` is a valid `datetime`, so the rejection is about purpose, not validity — that is what "research, then decide" looks like.) |
| Hero eyebrow, `<h1>`, lede | `<hgroup>` around exactly those three | `<hgroup>` permitted content: "Zero or more `<p>` elements, followed by one h1, h2, h3, h4, h5, or h6 element, followed by zero or more `<p>` elements." The actions row and the role strip are not permitted content and stay siblings |
| Hero role strip, tags | `<ul>` of `<li>` | a list of items; the separators are presentation |
| Section shell, cards, nav, header, footer, skip link | `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`, `<a>` | `<section>`: "one single piece of functionality … or a theme"; `<article>`: "makes sense on its own" |
| Mobile menu | `<dialog>` opened with `showModal()` by invoker commands; a `<nav>` of `<a>` rows inside; the row's index is `::before { content: attr(data-index) / "" }`, visible and out of the accessible name like the rail's numbers | `<dialog>`: "represents a modal or non-modal dialog box or other interactive component, such as a dismissible alert, inspector, or subwindow" |
| Field canvas | `<canvas aria-hidden>` fixed behind the page, the first element after the inline gate script in `<body>`; the sky is its CSS background, so with no script a finished backdrop remains | `<canvas>`: "Use the HTML <canvas> element with either the canvas scripting API or the WebGL API to draw graphics and animations." |

Rules that follow:

- **Residual `div`/`span`** (MDN): use them only "if you can't think of a better semantic block
  element to use, or don't want to add any specific meaning". Today the JSX under `components/`
  holds **20 `<div>` and 9 `<span>`**, all layout wrappers, colour-only runs, or the rail's and the
  opening instrument's drawn parts:
  `Header .inner`; `Section .body`; `Hero .hero` (the `position: relative` box and the
  `#top` target), `.row`, `.body`, `.actions` (not permitted inside `<hgroup>`);
  the `<div>` group inside each `<dl>` in `DescriptionListSection` and `StatStrip`;
  `RailSegment .segment` (the gutter cell), `.line`, `.fill`, `.tick`, `.tip` — decoration with no
  meaning, hidden from assistive technology as one `aria-hidden` root;
  `InstrumentOverlay .overlay` (the instrument root, one `aria-hidden`), `.left`, `.right`, `.ruleA`,
  `.ruleB` — drawn measure lines and rules;
  `Header .wordmarkSuffix`, `RichText .accent`, `StatusPill .pill`, `RailSegment .num`;
  `InstrumentOverlay .readLeft`, `.readRight`, `.chipA`, `.chipB`, `.chipC` — live readouts of the
  rendered page, not copy;
  `NavDialog .bar` (the 66px row holding the close control at the hamburger's position) and `.clip`
  (the box whose `overflow: clip` hides the panel while it slides in).
  Check: `grep -rho '<div' components | wc -l` prints `20` and `grep -rho '<span' components | wc -l`
  prints `9`; a new one is added only with its reason, against the MDN rule above, in the PR.
  `app/opengraph-image.tsx`, `app/icon.tsx` and `lib/og/*` are Satori boxes — every element with more
  than one child must be `display: flex` — and are exempt from this rule.
- **Decorative glyphs** — separators, list dashes, the status dot — are CSS `::before`/`::after`
  content, never elements. A separator belongs to the *preceding* item (`:not(:last-child)::after`)
  so a wrapped line never begins with one, and is written as two consecutive declarations:
  ```css
  content: "/";
  content: "/" / "";
  ```
  The second is the alternative-text form, which keeps the glyph out of the accessibility tree (MDN
  `content`: generated content "will not be represented in the accessibility tree"); the first is the
  cross-engine fallback, because an engine that does not parse `/ <alt-text>` drops the second
  declaration and needs the first. Both are required.
  Check: `grep -rnE "<(i|em|b)[ >]" components/` prints nothing; `grep -rn 'aria-hidden=' components/`
  matches exactly three lines (the rail segment's root in `RailSegment.tsx`, the field canvas in
  `FieldCanvas.tsx`, and the overlay root in `InstrumentOverlay.tsx`).
- `RichText` renders plain segments as text nodes, not spans.
  Check: `grep -c "<span" components/ui/RichText/RichText.tsx` prints `1`.
- Landmarks: exactly one `banner`, one `main`, one `contentinfo`. The `<footer>` sits inside `<main>`,
  where it exposes no landmark of its own, so it carries `role="contentinfo"` explicitly.
  Check: `tests/e2e/page/semantics.spec.ts` asserts all three by role.
- A decision not in the table is made the same way: open the MDN page, quote the permitted-content
  row and the purpose sentence in the change's description, then edit.
