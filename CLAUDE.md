# CLAUDE.md — obarsal.dev

Rules for anyone, human or agent, editing this repository. They add to `~/.claude/CLAUDE.md` and
never relax it. Where a rule has a check, passing it is the standard. Read before your first edit:
§1 (where the words live), §3 (which element to use), §4 (where files go), §8 (what you must not
decide). §9 runs every check that does not need a build, in one paste.

## 1. Content boundary

- Every user-facing string is in `content/site.json`. `content/types.ts` holds `SiteContent`.
  `content/index.ts` is the typed export and nothing else:
  ```ts
  import data from './site.json' with { type: 'json' };
  import type { SiteContent } from './types';
  export const site: SiteContent = data;
  ```
  The import attribute is not optional: the package is `"type": "module"` and Node's ESM loader —
  the one Playwright's runner uses — refuses a JSON import without it.
  Check: `ls content` prints exactly `index.ts site.json types.ts`;
  `grep -c "validate\|throw\|console" content/index.ts` prints `0`.
- That assignment is the whole validation. No runtime schema, no count invariants, no placeholder or
  empty-string guard, no length warnings. A missing required key or a wrong primitive fails `tsc`; a
  misspelled optional key (`id`, `metrics`) or an unknown key does not — a non-literal assignment
  gets no excess-property check — and those are caught by the page tests or by the author.
  Check: `grep -rn "length !==\|includes('\[')\|ContentError" content/` prints nothing.
- `Segment.as` and `Action.variant` are `string`, because JSON cannot carry literal unions. A
  component renders any value it does not recognise as the plain case: `RichText` renders an unknown
  `as` as plain text; `Button` renders an unknown `variant` with the base class. That trade is
  chosen — a typo in `as` renders plain text rather than failing the build. Do not "fix" it into a
  validator. Check: `grep -n "as: string\|variant: string" content/types.ts` prints both lines.
- JSON arrays are `string[]`, never tuples. Check: `grep -c "\[string, string\]" content/types.ts`
  prints `0`.
- Components never import content. `site` is imported by `app/page.tsx`, `app/layout.tsx`,
  `app/opengraph-image.tsx`, `app/icon.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/jsonLd.ts` and
  `lib/og/OgCard.tsx`; `app/page.tsx` is the one place content meets components. Components import
  types only, from `@/content/types`. Tests may import `site`.
  Check: `grep -rnE "/content(/index)?'" components/` prints nothing — it catches a relative
  `../../content` as well as `@/content`, and still allows `@/content/types`.
- Copy is never retyped by an agent. A diff that changes a string value in `site.json` is a content
  edit and needs the author's words in the request (§8).

## 2. Naming

A component's name says what it renders and how, never which copy it currently shows. Test: change
the copy; the name must still be true. Components take props — they do not reach for content.

| Component | Why the name |
| --- | --- |
| `Hero` | A layout pattern, not copy |
| `ProseSection` | Optional statement plus paragraphs |
| `CardListSection` | A stacked list of cards |
| `ArticleCard` | It is an `<article>` |
| `StatStrip` | Figure/label pairs |
| `TileGridSection` | A lede plus a grid of tiles |
| `DescriptionListSection` | It is a `<dl>` (§3) |
| `Contact` | Contact is the function; `<address>` is named for it |
| `StatusPill` | "Availability" is the copy, not the function |
| `RichText` | The component; `Rich` is the type |
| `Section`, `Header`, `SkipLink`, `Button`, `Tag`, `TagList` | Already functional |

Types follow the same rule: `CardContent`, `DescriptionGroup`, `Stat`.

Check: `find components -name '*.tsx' | grep -iE 'about|client|skill|process|work|availability|metric'`
prints nothing; `grep -nE "(interface|type) (WorkCard|SkillGroup|Metric)\b" content/types.ts` prints
nothing.

## 3. Semantic HTML

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
| Field canvas | `<canvas aria-hidden>` fixed behind the page, first child of `<body>`; the sky is its CSS background, so with no script a finished backdrop remains | `<canvas>`: "Use the HTML <canvas> element with either the canvas scripting API or the WebGL API to draw graphics and animations." |

Rules that follow:

- **Residual `div`/`span`** (MDN): use them only "if you can't think of a better semantic block
  element to use, or don't want to add any specific meaning". Today the JSX under `components/`
  holds **15 `<div>` and 4 `<span>`**, all layout wrappers, colour-only runs, or the rail's drawn parts:
  `Header .inner`; `Section .body`; `Hero .hero` (the `position: relative` box and the
  `#top` target), `.row`, `.body`, `.actions` (not permitted inside `<hgroup>`);
  the `<div>` group inside each `<dl>` in `DescriptionListSection` and `StatStrip`;
  `RailSegment .segment` (the gutter cell), `.line`, `.fill`, `.tick`, `.tip` — decoration with no
  meaning, hidden from assistive technology as one `aria-hidden` root;
  `Header .wordmarkSuffix`, `RichText .accent`, `StatusPill .pill`, `RailSegment .num`;
  `NavDialog .bar` (the 66px row holding the close control at the hamburger's position) and `.clip`
  (the box whose `overflow: clip` hides the panel while it slides in).
  Check: `grep -rho '<div' components | wc -l` prints `15` and `grep -rho '<span' components | wc -l`
  prints `4`; a new one is added only with its reason, against the MDN rule above, in the PR.
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
  matches exactly two lines (the rail segment's root in `RailSegment.tsx` and the field canvas in
  `FieldCanvas.tsx`).
- `RichText` renders plain segments as text nodes, not spans.
  Check: `grep -c "<span" components/ui/RichText/RichText.tsx` prints `1`.
- Landmarks: exactly one `banner`, one `main`, one `contentinfo`. The `<footer>` sits inside `<main>`,
  where it exposes no landmark of its own, so it carries `role="contentinfo"` explicitly.
  Check: `tests/e2e/page/semantics.spec.ts` asserts all three by role.
- A decision not in the table is made the same way: open the MDN page, quote the permitted-content
  row and the purpose sentence in the change's description, then edit.

## 4. Structure limits

- One folder per component family, holding `Name.tsx` and `Name.module.css` and nothing else. A
  family with no styles of its own has only the `.tsx` (`CardListSection`). Almost every `.tsx`
  exports one component; the single sanctioned exception is `Tag.tsx`, which exports `TagList` (the
  `<ul>`) and `Tag` (its `<li>`) — a list and its item, which share a stylesheet and are never used
  apart. A second export is added only on the same footing.
  Check, from the repository root:
  `find components -type f | awk -F/ 'NF!=4 || ($NF != $(NF-1)".tsx" && $NF != $(NF-1)".module.css")'`
  prints nothing. It tests filenames, not exports — a second component smuggled into an existing file
  passes it, so the rule above is enforced in review.
- No folder holds five or more files. `app/` is the one exemption, at 8, because Next's file
  conventions live there: `layout.tsx`, `page.tsx`, `opengraph-image.tsx`, `twitter-image.tsx`,
  `icon.tsx`, `sitemap.ts`, `robots.ts`, `assets.d.ts`. Everything in `app/` that is not a convention
  lives in `app/styles/`. Check: the folder-limit command in §9 prints exactly `8 app`.
- A component's CSS module is its own. The single permitted cross-import is `TileGridSection` reading
  `.p` from `../ProseSection/ProseSection.module.css`.
  Check: `grep -rn "\.\./.*module\.css" components/` prints that one line.
- **Client components and motion.** A `'use client'` file lives in its own family folder like any
  other, never owns copy, never reads `site`, and writes the DOM only through refs. Animation never
  enters the render cycle: no state, no re-render; values are computed in plain JavaScript on
  `requestAnimationFrame`, written at most once per frame per element, and CSS transitions do the
  easing — except the field's camera lift, which the renderer eases in JavaScript at 5% per frame
  because it is a uniform, not a style. The rail eases one number, `--rail-tip` on `main`, registered with `@property` so it can
  transition; every segment derives its fill and dot from it in CSS, which is why the line never
  breaks at a seam. Reduced motion is a static state in a `prefers-reduced-motion` block, never
  nothing.
  No absolute positioning and no negative margins unless absolutely necessary: stacking is a shared
  grid area, overhang is self-alignment inside a narrow track, offset is padding or a transform.
  A transformed decoration must not extend the page's scrollable overflow — `RailSegment` clips its
  line column vertically (`overflow-y: clip`) so the tip's transform never grows the scroll range.
  Today: `RailSegment`, `InvokerDialog` and `FieldCanvas` are the three client components —
  `InvokerDialog` is the dialog shell and its toggle, no stylesheet, whose two handlers exist only for
  what the platform lacks (close on row activation; open where invoker commands are missing);
  `NavDialog` renders the menu's markup around it on the server so its stylesheet ships in the page CSS
  rather than as a fourth render-blocking file; `FieldCanvas` holds the field's canvas by ref and
  imports the WebGL2 renderer after an idle callback; the loop lives in `lib/field/gl/renderer.ts`,
  never in the component, and the canvas's stylesheet is the global `app/styles/field.css` so the
  canvas contributes no CSS to the client chunk; the three positioned rules are the skip link's
  off-screen state, the card's accent bar (`ArticleCard.module.css`), and the field canvas's `position: fixed` in
  `app/styles/field.css` — the platform's mechanism for a viewport backdrop.
  `vite.config.ts` predates the field (the CDN cache adapter and the Cloudflare environment wiring live
  there); the field added one `codeSplitting` group that merges the three client-component chunks into
  one, because each chunk is `modulepreload`ed at page load and the third cost a round trip of first
  contentful paint under Lighthouse's simulated connection. A fourth client component joins that regex
  or the round trip returns.
  Check: `grep -rlnE "['\"]use client['\"]" components app lib` prints exactly `RailSegment.tsx`,
  `InvokerDialog.tsx` and `FieldCanvas.tsx`;
  `grep -rnE "position: (absolute|fixed)|margin[a-z-]*:[^;]*-[0-9]" app components --include='*.css'`
  prints exactly 3 lines: SkipLink, ArticleCard, field.css.
- `lib/` holds what is neither a component nor a route: helpers, the Satori card and the faces it
  bundles, and `lib/invokers.d.ts`, the one ambient declaration file; `lib/field/` holds the field's
  world — constants, terrain, camera, growth — and `lib/field/gl/` its WebGL2 renderer, shaders and
  program helpers; the world modules are pure and have Vitest specs in `tests/unit/`, the renderer is
  proven in `tests/e2e/field/`. `lib/og/fonts/` holds the `.ttf` files Satori needs; they are not
  public assets. Check: `ls dist/client/fonts` after a build prints only the two `.woff2` and
  `OFL.txt`.
- Vitest specs live in `tests/unit/`, or beside the module they test in `lib/`
  (`vitest.config.ts` includes exactly `tests/unit/**/*.test.ts` and `lib/**/*.test.ts`;
  `lib/jsonLd.test.ts` is the second kind). Playwright specs live in `tests/e2e/<concern>/`, except
  the harness check `tests/e2e/smoke.spec.ts`, which stays at the root. `tests/e2e/page/` is at the
  four-file cap: the next spec there forces a re-split by concern, not a fifth file.
  `tests/e2e/presentation/` is at the cap too (a11y, responsive, tokens, twins).
  `tests/e2e/field/` holds four (budget, contrast, state, static), one under the cap.
  `tests/e2e/software-gpu.ts` and `tests/e2e/canvas-sampling.ts` are helpers, not specs
  (`allowSoftwareGpu` hides `WEBGL_debug_renderer_info` so the field runs under CI's software renderer;
  `forceSoftwareGpu` reports a software renderer so the guard is proven on any machine); like
  `rail/segments.ts` they are never collected but count against the cap — `tests/e2e/` holds three files.
  `tests/e2e/rail/` holds three, one of them `tests/e2e/rail/segments.ts` — a shared helper, not a
  spec: Playwright's default `testMatch` collects `*.spec.ts` and `*.test.ts`
  (`**/*.@(spec|test).?(c|m)[jt]s?(x)`, which is why `playwright.config.ts` needs
  `testIgnore: '**/unit/**'` for the Vitest specs), so a helper carrying neither suffix is never
  collected — but it still counts against the folder cap.

The buckets, which is all a reader needs to place a new file — `components/layout/` for page
furniture (`Header`, `Section`, `SkipLink`), `components/sections/` for a section of the page,
`components/ui/` for a piece one of them draws; `app/styles/` for stylesheets that belong to no
component; `lib/og/` for the Satori card and the faces it bundles; `tools/stylelint/` for the local
lint rules. For the current file list, read it from the tree rather than from here:

```bash
find app components content lib scripts tests tools -type f | sort
```

## 5. Comments

The global rule applies verbatim: rare, minimal, technical only; never business logic, requirements,
reasoning or history. The one test: *would a competent engineer reading this file need this line to
avoid a mistake?* Read these eleven before writing one — they are the calibration set, each naming a
platform constraint that the code alone does not show. §9 checks that each pointer still lands on a
comment line; a comment that moves takes its pointer with it.

```
lib/og/OgCard.tsx:12
lib/jsonLd.ts:3
lib/ogFonts.ts:1
playwright.config.ts:5
components/ui/StatStrip/StatStrip.module.css:12
components/sections/DescriptionListSection/DescriptionListSection.module.css:40
lib/invokers.d.ts:1
tools/stylelint/focus-visible-twin.mjs:23
lib/field/terrain.ts:3
lib/field/gl/shaders.ts:23
components/layout/FieldCanvas/FieldCanvas.tsx:5
```

"This is deliberate because …" does not pass; it goes in the change's description or nowhere.

- No comment names a task, phase, brief, plan, report file, artboard or design folder.
  Check: `grep -rnE "Task [0-9]+|Phase [0-9]+|brief|plan|artboard|report\.md|design folder" app components content lib scripts tests tools`
  prints nothing.
- A comment block runs to four lines at most; twelve for a block in `scripts/`. A block is every
  consecutive comment line, including the continuation lines of a `/* … */` that do not themselves
  begin with `*`. Check: the two `BLOCKS` commands in §9 print nothing. Paste the `BLOCKS=` line with
  them — they are written `"${BLOCKS:?}"` so a partial paste aborts instead of running an empty awk
  program and passing everything.
- No comment restates what the code plainly does, and no doc comment sits on a field whose name
  already says what it is.

## 6. File size

- Ceiling: **150 lines** for every `.ts`, `.tsx`, `.css` and `.mjs` under `app/`, `components/`,
  `content/`, `lib/`, `scripts/` and `tests/`. `site.json` is exempt; it is data.
  Check: the `wc -l` command in §9 prints only the `total` line.
- How to split, by kind: a component extracts the child it is drawing into its own folder (§4); a
  route moves its JSX into a `lib/` helper — `app/opengraph-image.tsx` → `lib/og/OgCard.tsx` is the
  precedent; a spec splits by concern into a `tests/e2e/<concern>/` folder; a script moves its data
  table into a sibling module. Never split by line count alone: each part gets one concern and a name
  that says it.

## 7. Testing

- A guard is proven by breaking it. Every new or changed assertion ships with its failing run — RED
  before GREEN — in the change's description. A test that has only ever passed is unproven. When the
  break is made by editing `site.json`, restore it byte for byte afterwards (`git diff` must be empty).
- No privacy or confidentiality guards. Content is reviewed by hand before publishing (§8).
  Check: `git grep -n -i "confidential\|denylist\|deny list" -- app components content lib scripts tests tools .github README.md`
  prints nothing.
- No content validation beyond the type (§1). No test asserts a count of content items as a literal:
  counts read `site.<x>.length`. `tests/e2e/page/no-js.spec.ts` is the net that every string in
  `site.json` reaches the page as rendered text — never from a `<script>` payload; other specs assert
  individual strings and read them from `site` rather than retyping them. `scripts/assert-static.mjs`
  is the one deliberate exception: its three needles are hardcoded, because an expectation read from
  the source under test always passes.
  Check: `grep -rnE "toHaveCount\([0-9]+\)|toHaveLength\([0-9]+\)" tests/` matches only structural
  facts (one `h1`, one of each landmark, the empty metrics grid, the open dialog).
- **A Playwright spec cannot import any module with a CSS import in its graph.** Playwright registers
  the babel plugin that strips `.css` imports only on its CommonJS path
  (`playwright/lib/transform/babelBundle.js`, inside `if (!isModule)`), and this package is
  `"type": "module"`, so every spec takes the ESM path and babel is handed the CSS as JavaScript.
  Type-only imports are fine — which is why `no-js.spec.ts` carries its own `plainText()` rather than
  importing a helper out of `RichText`.
- A test's title says what it asserts: a title that names a number asserts that number; a title that
  names an order asserts the order. Selectors follow markup — the change that alters an element
  updates every e2e selector that named it, in the same commit.
- Before `npx playwright test`, nothing may be listening on :8787 (`ss -ltnp | grep 8787` names the
  pid). Kill it only if this session started it — check `ps -o lstart,ppid -p <pid>` — otherwise stop
  and ask; `reuseExistingServer` is on outside CI and would silently test a stale preview.
- The gate for every change, in this order: `npm run typecheck`, `npm run lint`, `npm run lint:css`,
  `npm test`, `npm run build` (which runs `assert:static`), `npx playwright test` (both projects).
  Today that is Vitest **39 passed**, Playwright **121 passed / 19 skipped**, axe **0 violations**, and
  lint clean of *warnings*, not only errors — `npx eslint .` prints nothing and exits `0`.
- `npm run lh` at the end of a branch equals the baseline in `README.md`: Performance 0.98,
  Accessibility 1.00, SEO 1.00, Best Practices 1.00, CLS 0. A drop is a regression to find, not a
  number to re-baseline.

## 8. The author's job, not the codebase's

Decided by the author, never by an agent and never by a check:

- **Content.** What the site says, how an engagement is described, which words are confidential. The
  author edits `content/site.json` and reviews it by hand before a deploy. An agent changes a string
  value only when the author's message contains the new string.
- **Design values.** Every px, em, ch and colour, and the wrap and hit-target rules. An agent changes
  one only on an explicit instruction that quotes the number — never rounds, never "improves". The
  48px hit-target test at `tests/e2e/presentation/responsive.spec.ts:13` excludes five elements by
  selector — `a[href="#top"]`, the wordmark, and `address a`, the e-mail link and the three social
  links (GitHub, LinkedIn, X). Three of the five are actually below the floor: the wordmark and the
  "X" link at every width, the e-mail link at mobile width only. The exclusion stands until a design
  round pads them; widen it no further.
- **The field's constants** in `lib/field/constants.ts` and the veil stops in `Section.module.css` and
  `Hero.module.css` — every number is the reference generator's or the author's (Phase 5 plan Part A
  §A3, §A6); the hero's wider veil is the author's 2026-09-08 decision. The contrast spec's `BOUNDS`
  are derived from `--accent`, `--ground` and the text tokens; re-derive them when any of those change.
- **Generated visuals.** The Open Graph card and the favicon are drawn from tokens and copy; the
  author signs them off.
- **Prose that is not code.** README wording, commit messages, the licence text.
- **Branch and history decisions.** What is pushed, what is squashed, what stays in history.
- **Measured numbers.** The README's Lighthouse table is replaced with production numbers by the
  author once the deploy exists.

A change that touches `content/site.json`, values in `app/styles/tokens.css`, or the layout numbers in
`lib/og/` quotes the author's instruction in its description; otherwise it does not merge.

## 9. How to check

Run from the repository root; every check here works on the sources alone, except the built-fonts
one in §4, which needs a build first.

```bash
grep -rnE "/content(/index)?'" components/ && echo "FAIL: a component imports content" || echo "OK: components are content-free"

find app components content lib scripts tests tools -type d | while read d; do n=$(find "$d" -maxdepth 1 -type f | wc -l); [ "$n" -ge 5 ] && echo "$n $d"; done
# expect exactly: 8 app

find app components content lib scripts tests tools -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.mjs' \) | xargs wc -l | awk '$1>150'
# expect only the `total` line

find components -type f | awk -F/ 'NF!=4 || ($NF != $(NF-1)".tsx" && $NF != $(NF-1)".module.css")'   # expect nothing
grep -rn "\.\./.*module\.css" components/                       # expect the one TileGridSection line

ls content                                                      # expect: index.ts site.json types.ts
grep -c "validate\|throw\|console" content/index.ts             # expect 0
grep -rn "length !==\|includes('\[')\|ContentError" content/    # expect nothing
grep -n "as: string\|variant: string" content/types.ts          # expect both lines
grep -c "\[string, string\]" content/types.ts                   # expect 0

find components -name '*.tsx' | grep -iE 'about|client|skill|process|work|availability|metric'   # expect nothing
grep -nE "(interface|type) (WorkCard|SkillGroup|Metric)\b" content/types.ts                      # expect nothing

grep -rho '<div' components | wc -l                             # expect 15
grep -rho '<span' components | wc -l                            # expect 4
grep -c "<span" components/ui/RichText/RichText.tsx             # expect 1
grep -rnE "<(i|em|b)[ >]" components/                            # expect nothing
grep -rn 'aria-hidden=' components/                             # expect 2 lines: RailSegment.tsx, FieldCanvas.tsx
grep -rlnE "['\"]use client['\"]" components app lib             # expect RailSegment.tsx, InvokerDialog.tsx and FieldCanvas.tsx
grep -rnE "position: (absolute|fixed)|margin[a-z-]*:[^;]*-[0-9]" app components --include='*.css'   # expect 3 lines: SkipLink, ArticleCard, field.css

grep -rnE "Task [0-9]+|Phase [0-9]+|brief|plan|artboard|report\.md|design folder" app components content lib scripts tests tools   # expect nothing

BLOCKS='{ if (b) { n++; if ($0 ~ /\*\//) b=0 } else if ($0 ~ /^[[:space:]]*(\/\/|\{?\/\*)/) { n++; if ($0 ~ /\/\*/ && $0 !~ /\*\//) b=1 } else n=0; if (n>max) { print FILENAME": line "NR; exit } }'
find app components content lib tests tools -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.mjs' \) -exec awk -v max=4  "${BLOCKS:?}" {} \;
find scripts -type f -exec awk -v max=12 "${BLOCKS:?}" {} \;
# both: expect nothing. `:?` aborts if the BLOCKS line above was not pasted — without it awk runs an
# empty program and passes every file.

for p in lib/og/OgCard.tsx:12 lib/jsonLd.ts:3 lib/ogFonts.ts:1 playwright.config.ts:5 components/ui/StatStrip/StatStrip.module.css:12 components/sections/DescriptionListSection/DescriptionListSection.module.css:40 lib/invokers.d.ts:1 tools/stylelint/focus-visible-twin.mjs:23 lib/field/terrain.ts:3 lib/field/gl/shaders.ts:23 components/layout/FieldCanvas/FieldCanvas.tsx:5; do sed -n "${p##*:}p" "${p%%:*}" | grep -qE '^[[:space:]]*(//|/\*)' || echo "stale pointer: $p"; done
# expect nothing — the eleven §5 pointers still land on comment lines

git grep -n -i "confidential\|denylist\|deny list" -- app components content lib scripts tests tools .github README.md || echo CLEAN
grep -rnE "toHaveCount\([0-9]+\)|toHaveLength\([0-9]+\)" tests/  # expect only structural counts
npx eslint .                                                     # expect no output, exit 0
```
