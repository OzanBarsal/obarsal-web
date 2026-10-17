# CLAUDE.md — obarsal.dev

Rules for anyone, human or agent, editing this repository. They add to `~/.claude/CLAUDE.md` and
never relax it. Where a rule has a check, passing it is the standard. This file holds what applies
to every edit. The decisions that apply only to one part of the tree live in `.claude/rules/` and
load when a matching file is opened: `semantic-html` (which element to use), `client-and-field`
(client components, motion, the WebGL field), `veil-and-field-values` (the author's numbers and why
they are fixed), `testing` (specs and guards). Every mechanical check lives in
`scripts/check-rules.sh` (§9), which runs when a turn ends.

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
- That assignment is the whole validation. No runtime schema, no count invariants, no placeholder or
  empty-string guard, no length warnings. A missing required key or a wrong primitive fails `tsc`; a
  misspelled optional key (`id`, `metrics`) or an unknown key does not — a non-literal assignment
  gets no excess-property check — and those are caught by the page tests or by the author.
- `Segment.as` and `Action.variant` are `string`, because JSON cannot carry literal unions. A
  component renders any value it does not recognise as the plain case: `RichText` renders an unknown
  `as` as plain text; `Button` renders an unknown `variant` with the base class. That trade is
  chosen — a typo in `as` renders plain text rather than failing the build. Do not "fix" it into a
  validator.
- JSON arrays are `string[]`, never tuples.
- Components never import content. `site` is imported by `app/page.tsx`, `app/layout.tsx`,
  `app/opengraph-image.tsx`, `app/icon.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/jsonLd.ts` and
  `lib/og/OgCard.tsx`; `app/page.tsx` is the one place content meets components. Components import
  types only, from `@/content/types`. Tests may import `site`.
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
| `LogoBandSection` | A lede plus a moving band of logos |
| `DescriptionListSection` | It is a `<dl>` (§4) |
| `Contact` | Contact is the function; `<address>` is named for it |
| `StatusPill` | "Availability" is the copy, not the function |
| `RichText` | The component; `Rich` is the type |
| `Section`, `Header`, `SkipLink`, `Button`, `Tag`, `TagList` | Already functional |

Types follow the same rule: `CardContent`, `DescriptionGroup`, `Stat`.

## 3. Structure limits

- One folder per component family, holding `Name.tsx` and `Name.module.css` and nothing else. A
  family with no styles of its own has only the `.tsx` (`CardListSection`). Almost every `.tsx`
  exports one component; the single sanctioned exception is `Tag.tsx`, which exports `TagList` (the
  `<ul>`) and `Tag` (its `<li>`) — a list and its item, which share a stylesheet and are never used
  apart. A second export is added only on the same footing. The check tests filenames, not
  exports — a second component smuggled into an existing file passes it, so the rule is enforced in
  review.
- No folder holds five or more files. `app/` and `lib/field/` are the two exemptions: `app/` at 8,
  because Next's file conventions live there and everything else in `app/` lives in `app/styles/`;
  `lib/field/` at 5, because the space-colonization world is one module per concern, and a sixth
  file there forces a split by concern, not a sixth file in the same folder.
- A component's CSS module is its own. The single permitted cross-import is `LogoBandSection` reading
  `.p` from `../ProseSection/ProseSection.module.css`.
- Client components, motion, positioning and the field's modules have their own rule
  (`.claude/rules/client-and-field.md`). Today's four client components are `RailSegment`,
  `InvokerDialog`, `FieldCanvas` and `InstrumentOverlay`; a fifth joins the `codeSplitting` group in
  `vite.config.ts` or the round trip it costs returns.

The buckets, which is all a reader needs to place a new file — `components/layout/` for page
furniture (`Header`, `Section`, `SkipLink`), `components/sections/` for a section of the page,
`components/ui/` for a piece one of them draws; `app/styles/` for stylesheets that belong to no
component; `lib/og/` for the Satori card and the faces it bundles; `tools/stylelint/` for the local
lint rules. For the current file list, read it from the tree rather than from here:

```bash
find app components content lib scripts tests tools -type f | sort
```

## 4. Semantic HTML

MDN is the authority. An element is chosen by a quoted MDN rule, and the quote goes in the change's
description, not in a code comment. The decisions already made — every element in the table, the
residual `div`/`span` budget, decorative glyphs as CSS content, the three landmarks — are in
`.claude/rules/semantic-html.md`. A decision not in that table is made the same way: open the MDN
page, quote the permitted-content row and the purpose sentence in the change's description, then
edit.

## 5. Comments

The global rule applies verbatim: rare, minimal, technical only; never business logic, requirements,
reasoning or history. The one test: *would a competent engineer reading this file need this line to
avoid a mistake?* `scripts/check-rules.sh` names the eleven comments that are the calibration set,
each naming a platform constraint that the code alone does not show, and checks that each pointer
still lands on a comment line; a comment that moves takes its pointer with it.

"This is deliberate because …" does not pass; it goes in the change's description or nowhere.

- No comment names a task, phase, brief, plan, report file, artboard or design folder.
- A comment block runs to four lines at most; twelve for a block in `scripts/`. A block is every
  consecutive comment line, including the continuation lines of a `/* … */` that do not themselves
  begin with `*`.
- No comment restates what the code plainly does, and no doc comment sits on a field whose name
  already says what it is.

## 6. File size

- Ceiling: **150 lines** for every `.ts`, `.tsx`, `.css` and `.mjs` under `app/`, `components/`,
  `content/`, `lib/`, `scripts/` and `tests/`. `site.json` is exempt; it is data.
- How to split, by kind: a component extracts the child it is drawing into its own folder (§3); a
  route moves its JSX into a `lib/` helper — `app/opengraph-image.tsx` → `lib/og/OgCard.tsx` is the
  precedent; a spec splits by concern into a `tests/e2e/<concern>/` folder; a script moves its data
  table into a sibling module. Never split by line count alone: each part gets one concern and a name
  that says it.

## 7. The gate

- Before `npx playwright test`, nothing may be listening on :8787 (`ss -ltnp | grep 8787` names the
  pid). Kill it only if this session started it — check `ps -o lstart,ppid -p <pid>` — otherwise stop
  and ask; `reuseExistingServer` is on outside CI and would silently test a stale preview.
- The gate for every change, in this order: `npm run typecheck`, `npm run lint`, `npm run lint:css`,
  `npm test`, `npm run build` (which runs `assert:static`), `npx playwright test` (both projects).
  Today that is Vitest **119 passed**, Playwright **298 passed / 52 skipped**, axe **0 violations**, and
  lint clean of *warnings*, not only errors — `npx eslint .` prints nothing and exits `0`.
- Between checkpoints, `npm run test:e2e:quick` is the per-task e2e run: the desktop project without
  the `@slow` tests — the five field and veil specs that wait 10–35 s for the field to settle. The
  full run, both projects, is required at every checkpoint and before any commit.
- `npm run lh` at the end of a branch equals the baseline in `README.md`: Performance 0.97,
  Accessibility 1.00, SEO 1.00, Best Practices 1.00, CLS 0. A drop is a regression to find, not a
  number to re-baseline; the one re-baseline so far (0.98 → 0.97, 2026-09-15) is the author's, with
  its cause in the README: the gzipped document crossed Lantern's 14,600-byte initial window.
- A guard is proven by breaking it: RED before GREEN, in the change's description. The rest of what
  a spec may and may not do is in `.claude/rules/testing.md`.

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
- **The veil, the page envelope, the field's constants and the rail's contrast exemption.** Which
  numbers are fixed, what each one was solved against, and why the rail is exempt are in
  `.claude/rules/veil-and-field-values.md`. Changing any of them means re-deriving what that rule
  says depends on it.
- **Generated visuals.** The Open Graph card and the favicon are drawn from tokens and copy; the
  author signs them off.
- **Prose that is not code.** README wording, commit messages, the licence text.
- **Branch and history decisions.** What is pushed, what is squashed, what stays in history.
- **Measured numbers.** The README's Lighthouse table is replaced with production numbers by the
  author once the deploy exists.

A change that touches `content/site.json`, values in `app/styles/tokens.css`, or the layout numbers in
`lib/og/` quotes the author's instruction in its description; otherwise it does not merge.

## 9. Checks and checkpoints

- `scripts/check-rules.sh` runs every check that needs no build, with its expected values, and exits
  non-zero on drift. A Stop hook in `.claude/settings.json` runs it when a turn ends and blocks the
  turn with the failing lines. A new element, file or exemption changes the expected value in the
  script in the same commit, with the reason in the change's description.
- Playwright and Vitest print dots instead of per-test lines when `CLAUDECODE` is set, so a run costs
  the conversation its failures and its summary. Read a full run from `playwright-report/`.
- A PreToolUse hook refuses an `Agent` spawn that names no `subagent_type` or whose prompt lacks
  `Budget: <n> tool calls`. A search or a read-only survey goes to `Explore`. An implementer's brief
  carries the code or names the in-repo pattern; it never points at a plan file to re-read.
- A user-level UserPromptSubmit hook (`~/.claude/hooks/context-check.sh`, registered in
  `~/.claude/settings.json`) reports when the last call carried more than 300K tokens of context. That
  is the signal to reach the next checkpoint and invoke the `checkpoint` skill, not to keep going.
- A checkpoint is a commit, a passed gate, or a finished task. When a task or phase is complete and
  further work remains, invoke the `checkpoint` skill. It writes `handoff.md` at the project root
  (gitignored) and runs `cc-checkpoint request`; relay that command's output verbatim and end the
  turn. Do not write the handoff by hand and do not ask the author to run `/clear` or start a new
  session. Never force a compaction; a long session that still needs its history keeps it.
- `handoff.md` stays under 120 lines (`check-rules.sh`). Decisions and backlog detail live in dated
  files under `docs/superpowers/`, opened only when needed. Machine-specific environment (library
  and browser paths) lives in `.claude/settings.local.json` under `env`, never in prose.
- When compacting, preserve: the branch, every modified file, the gate commands and their last
  result, the open task from `handoff.md`, and every instruction the author gave in this session.
