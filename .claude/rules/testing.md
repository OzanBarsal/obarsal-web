---
paths:
  - "tests/**"
  - "lib/**/*.test.ts"
  - "playwright.config.ts"
  - "vitest.config.ts"
---

# Tests

- Vitest specs live in `tests/unit/`, or beside the module they test in `lib/`
  (`vitest.config.ts` includes exactly `tests/unit/**/*.test.ts` and `lib/**/*.test.ts`;
  `lib/jsonLd.test.ts`, `lib/opening/beats.test.ts` and `lib/opening/gate.test.ts` are the second
  kind). `tests/unit/instruments/` and `tests/unit/field/` are the two subfolders there.
  `tests/unit/instruments/` holds `frame.test.ts`,
  `place.test.ts` (the point solvers), `blocks.test.ts` (columns, rows, a block's size and placement,
  and `span`, which binds the row width a block is given to the column `columns` can open) and
  `layout.test.ts`, because `lib/instruments/` is at the four-file cap and could hold none of their
  specs directly; the subfolder is at the cap too. `tests/unit/field/` holds `terrain.test.ts` and
  `camera.test.ts` — the `camera`, `view`, `lift` and `ceiling` blocks — for the same reason:
  `lib/field/` is at its five-file cap and could hold neither directly. Playwright specs live in
  `tests/e2e/<concern>/`, except
  the harness check `tests/e2e/smoke.spec.ts`, which stays at the root. `tests/e2e/page/` is at the
  four-file cap: the next spec there forces a re-split by concern, not a fifth file.
  `tests/e2e/presentation/` is at the cap too (a11y, responsive, tokens, twins).
  `tests/e2e/field/` is at the cap too — `budget.spec.ts`, `state.spec.ts`, `static.spec.ts` and
  `composite.spec.ts` (the opaque canvas, the sky rows, the still frame, a lost context); the veil
  test that lived in `static.spec.ts` moved to `tests/e2e/column/column.spec.ts`, one spec: the
  column is continuous from the document's top to its bottom, every body wears the same veil and
  right border, the header sits over the column, and in-page navigation is smooth and lands under the
  header. `tests/e2e/envelope/rows.spec.ts` holds the row envelope: the rows' 12px right padding
  (a 12px inset at 1000px, `--content-max` bodies at 1440px), the rows' zero left margin
  and centred chips at mobile width, and the foot's 26px padding on both sides of its rule.
  `tests/e2e/band/` holds two. `band.spec.ts`: the thirteen logos listed twice with the
  loop's second copy `aria-hidden`, every file served, the running track and its two equal halves, the
  reduced-motion wall and the hover pause. `pause.spec.ts`: the switch's name from content, its 48px
  box under the band, on pauses and off resumes by pointer and by keyboard, hidden under reduced
  motion. Both act on the band's clipping box, never on the track: Playwright waits for a stable
  bounding box, which a moving track never has.
  `tests/e2e/first-load/fade.spec.ts` holds the fade guard — sky only while the opening
  holds the field, the field and the motes fade in once it ends — because `state.spec.ts` is at the
  line ceiling and its folder at the cap.
  `tests/e2e/software-gpu.ts` and `tests/e2e/canvas-sampling.ts` are
  helpers, not specs (`allowSoftwareGpu` hides `WEBGL_debug_renderer_info` so the field runs under CI's
  software renderer; `forceSoftwareGpu` reports a software renderer so the guard is proven on any
  machine); `canvas-sampling.ts` reads each row's per-channel minimum as its sky and calls a pixel lit
  when any channel rises more than a threshold — called at 8 — above that row's minimum; like
  `rail/segments.ts` it is never collected but counts against the cap — `tests/e2e/` root holds three
  files: `canvas-sampling.ts`, `smoke.spec.ts` and `software-gpu.ts`. The motes rise from the
  horizon, so `countLitPixels` starts at 0.5, below every horizon fraction; `sampleLitGrid` with
  eight rows from `horizonFraction` has a row straddling the mobile horizon, so the grid test's
  mobile skip in `state.spec.ts` (its own reason: ground closer than one mesh cell at 390 px) can
  only be lifted with that row excluded.
  `tests/e2e/veil/` holds three: `transmission.spec.ts`, the geometric guard that reads the veil's
  alpha at every text run's own extent across the whole document; `field-colour.spec.ts`, which holds
  the field inside the ceiling those bounds are solved against; and their `sweep.ts` helper, which
  exports `BOUNDS`, `FIELD_CEILING` and `luminance`; `--accent` is bounded since the section labels
  light in it, and both sweeps first wait for the hero row's `data-lit` — the rail's settled signal —
  because the lit label is the only reachable accent text and it appears once the rail's frame loop
  has run. Three guards read that helper — the two specs
  beside it and `tests/unit/contrast.test.ts`, which now also binds `FIELD_CEILING` to `ceiling()` in
  `lib/field/camera.ts` — so the ceiling and the bounds have one definition and
  cannot drift apart. A Vitest file importing from `tests/e2e/` is deliberate: `sweep.ts` has no
  imports of its own, so it carries no CSS into a Playwright graph and nothing Node cannot run.
  `tests/e2e/rail/` holds three, one of them `tests/e2e/rail/segments.ts` — a shared helper, not a
  spec (`readSegments`, and `readLabelsLit`, which reads whether each row's label is drawn in
  `--accent` against a live probe of the token): Playwright's default `testMatch` collects `*.spec.ts` and `*.test.ts`
  (`**/*.@(spec|test).?(c|m)[jt]s?(x)`, which is why `playwright.config.ts` needs
  `testIgnore: '**/unit/**'` for the Vitest specs), so a helper carrying neither suffix is never
  collected — but it still counts against the folder cap.
  `tests/e2e/opening/` holds four, at the cap: `gates.spec.ts`, `motion.spec.ts`, `stagger.spec.ts`
  (the enter and exit staggers) and `skip.ts` — a helper, not a spec: `skipOpening` injects a
  `navigator.connection` with `saveData` so the sequence is skipped, and `played` loads the page and
  waits for beat 0 with the overlay displayed, shared by every spec that reads the played overlay;
  never collected, but counted against the cap like `rail/segments.ts`.
  `tests/e2e/instruments/` holds four, at the cap: `placement.spec.ts` (inside the viewport, nothing
  overlaps, no chip on copy), `stacks.spec.ts` (spines, blocks and their rows, the opaque chip),
  `lines.spec.ts` (dash stepping, the head, lede and section boxes against their elements, the rail
  and fold rules, the exit) and `readings.spec.ts` (no chip reads a fractional pixel); they import
  `OVERLAY` and `played` from `../opening/skip`. A vertical spine's `background-image` cannot be asserted with `to bottom` —
  CSSOM omits a linear-gradient's initial direction on serialisation — so `stacks.spec.ts` asserts
  the absence of `to right` instead.

- A guard is proven by breaking it. Every new or changed assertion ships with its failing run — RED
  before GREEN — in the change's description. A test that has only ever passed is unproven. When the
  break is made by editing `site.json`, restore it byte for byte afterwards (`git diff` must be empty).
- No privacy or confidentiality guards. Content is reviewed by hand before publishing (`CLAUDE.md` §8).
  Check: `git grep -n -i "confidential\|denylist\|deny list" -- app components content lib scripts tests tools .github README.md`
  prints nothing.
- No content validation beyond the type (`CLAUDE.md` §1). No test asserts a count of content items as a literal:
  counts read `site.<x>.length`. `tests/e2e/page/no-js.spec.ts` is the net that every string in
  `site.json` reaches the page as rendered text — never from a `<script>` payload; other specs assert
  individual strings and read them from `site` rather than retyping them. `scripts/assert-static.mjs`
  is the one deliberate exception: its three needles are hardcoded, because an expectation read from
  the source under test always passes.
  Check: `grep -rnE "toHaveCount\([0-9]+\)|toHaveLength\([0-9]+\)" tests/` matches only structural
  facts (one `h1`, one of each landmark, the empty metrics grid, the open dialog).
- A rect-based contrast sweep reports `--wall-text` at **4.29:1** in the client grid. That is
  `--wall-text` over `--line-soft` — the 1px rule between tiles, caught because a text run's rectangle
  spans the gap. The tiles are `--cell` and opaque, so the field never reaches that text. A
  pre-existing token pair absent from the unit `PAIRS` list, not a field or veil regression; do not
  re-litigate it as one. The band replaced that grid with logos, so no text is drawn in `--wall-text`
  today and the token has no consumer; whether it goes is the author's call (`CLAUDE.md` §8).
- **A Playwright spec cannot import any module with a CSS import in its graph.** Playwright registers
  the babel plugin that strips `.css` imports only on its CommonJS path
  (`playwright/lib/transform/babelBundle.js`, inside `if (!isModule)`), and this package is
  `"type": "module"`, so every spec takes the ESM path and babel is handed the CSS as JavaScript.
  Type-only imports are fine — which is why `no-js.spec.ts` carries its own `plainText()` rather than
  importing a helper out of `RichText`.
- `twins.spec.ts` and `tokens.spec.ts` run under reduced motion: the global block collapses the
  `.15s` colour transitions, so a sample read right after a hover or a token flip is final. Specs
  that jump and then measure pass `behavior: 'instant'` to `scrollTo` and `scrollIntoView`, because
  `html` scrolls smoothly whenever the opening is not playing.
- A test's title says what it asserts: a title that names a number asserts that number; a title that
  names an order asserts the order. Selectors follow markup — the change that alters an element
  updates every e2e selector that named it, in the same commit.
