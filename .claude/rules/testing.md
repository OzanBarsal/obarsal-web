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
  kind). `tests/unit/instruments/` is the one subfolder there, holding `frame.test.ts`,
  `place.test.ts` (the point solvers), `blocks.test.ts` (columns, rows, a block's size and placement,
  and `span`, which binds the row width a block is given to the column `columns` can open) and
  `layout.test.ts`, because `lib/instruments/` is at the four-file cap and could hold none of their
  specs directly; the subfolder is at the cap too. Playwright specs live in
  `tests/e2e/<concern>/`, except
  the harness check `tests/e2e/smoke.spec.ts`, which stays at the root. `tests/e2e/page/` is at the
  four-file cap: the next spec there forces a re-split by concern, not a fifth file.
  `tests/e2e/presentation/` is at the cap too (a11y, responsive, tokens, twins).
  `tests/e2e/field/` holds four (budget, contrast, state, static), one under the cap.
  `tests/e2e/software-gpu.ts`, `tests/e2e/canvas-sampling.ts` and `tests/e2e/veil-sampling.ts` are
  helpers, not specs (`allowSoftwareGpu` hides `WEBGL_debug_renderer_info` so the field runs under CI's
  software renderer; `forceSoftwareGpu` reports a software renderer so the guard is proven on any
  machine); the two samplers are split by what they sample — `canvas-sampling.ts` counts lit canvas
  pixels, `veil-sampling.ts` evaluates what the veil transmits under a text run; like `rail/segments.ts`
  they are never collected but count against the cap — `tests/e2e/` holds four files.
  `tests/e2e/veil/` holds three: `transmission.spec.ts`, the geometric guard that reads the veil's
  alpha at every text run's own extent across the whole document; `field-colour.spec.ts`, which holds
  the field inside the ceiling those bounds are solved against; and their `sweep.ts` helper, which
  exports `BOUNDS`, `FIELD_CEILING` and `luminance`. Three guards read that helper — the two specs
  beside it and `tests/unit/contrast.test.ts` — so the ceiling and the bounds have one definition and
  cannot drift apart. A Vitest file importing from `tests/e2e/` is deliberate: `sweep.ts` has no
  imports of its own, so it carries no CSS into a Playwright graph and nothing Node cannot run.
  `tests/e2e/rail/` holds three, one of them `tests/e2e/rail/segments.ts` — a shared helper, not a
  spec: Playwright's default `testMatch` collects `*.spec.ts` and `*.test.ts`
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
  re-litigate it as one.
- **A Playwright spec cannot import any module with a CSS import in its graph.** Playwright registers
  the babel plugin that strips `.css` imports only on its CommonJS path
  (`playwright/lib/transform/babelBundle.js`, inside `if (!isModule)`), and this package is
  `"type": "module"`, so every spec takes the ESM path and babel is handed the CSS as JavaScript.
  Type-only imports are fine — which is why `no-js.spec.ts` carries its own `plainText()` rather than
  importing a helper out of `RichText`.
- A test's title says what it asserts: a title that names a number asserts that number; a title that
  names an order asserts the order. Selectors follow markup — the change that alters an element
  updates every e2e selector that named it, in the same commit.
