# obarsal.dev

The source for my personal site and portfolio: a record of work, including an
engagement with Forrester Research and a build on an enterprise Adobe
Experience Manager platform, alongside independent projects and writing.

The rules this codebase is held to — the content boundary, naming, semantic
HTML, structure, comments, file size and testing — are in `CLAUDE.md`, each
with a check where one exists.

## Stack

- **Next.js 16 (App Router)** — server components and a file-based router
  keep the site's markup close to plain HTML, which matters for a project
  that is graded on Lighthouse scores as much as on code.
- **React 19** — required by Next 16; its automatic hoisting of preload
  links from JSX heads off a manual `<head>` element and the layout-shift
  risk that comes with one.
- **TypeScript, strict mode** — `noUncheckedIndexedAccess` is on
  deliberately, so that array access is checked at the type level rather
  than trusted at runtime.
- **Vitest** — a fast, ESM-native test runner that needs no separate
  transform configuration for a TypeScript/React codebase.
- **Cloudflare Workers via vinext** — the target deploy runtime. vinext
  adapts the Next build output to run on Workers, which keeps hosting on
  the same platform as this site's other infrastructure and avoids a
  Node.js server to operate.

## Running it

Requires Node 22 or later.

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build          # production build, then assert:static
npm run assert:static  # the built Worker serves the whole page without JavaScript
npm run preview        # build, then wrangler dev on :8787
npm run deploy         # deploy the built Worker to Cloudflare
npm run compat         # vinext check — Next feature support on Workers
npm run typecheck      # tsc --noEmit
npm run test           # vitest run
npm run test:e2e       # playwright test, desktop and mobile
npm run lh             # lhci autorun — Lighthouse against the preview
npm run lint:css       # stylelint "**/*.css"
npm run lint           # eslint .
```

No environment variables are required to build or run the site locally;
see `.env.example`.

## Deployment

The site builds with `next build` and deploys to Cloudflare Workers through
`vinext`, which translates the Next.js build output into a Worker. Deploys
run from GitHub Actions; credentials live in Actions secrets and in
Cloudflare, never in this repository.

## Budgets and measured numbers

The budgets below are enforced in CI by `npm run lh` (`lighthouserc.json`); a
run that misses one fails the build:

- Lighthouse Performance ≥ 90
- Lighthouse Accessibility = 100
- Lighthouse SEO = 100
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1

**Local-build figures**, median of three runs on 2026-09-05:

| | |
| --- | --- |
| Performance | 0.98 |
| Accessibility | 1.00 |
| SEO | 1.00 |
| Best Practices | 1.00 |
| Largest Contentful Paint | 2266 ms (the hero lede paragraph) |
| Cumulative Layout Shift | 0 |
| First Contentful Paint | 1666 ms |
| Total Blocking Time | 0 ms |

These are **not production numbers, and should not be quoted as such.** They
come from Lighthouse running against `wrangler dev` on localhost with
`throttlingMethod: "simulate"` — a modelled 150 ms RTT, 1.6 Mbps and a 4x CPU
slowdown on a mobile form factor — rather than from a real network against the
deployed Worker, whose asset caching and edge behaviour differ. The
authoritative numbers are the ones measured against the deployed
`*.workers.dev` URL, and this table should be replaced with them once that
deploy has happened.

LCP is the hero lede rather than the `<h1>`, and at 2266 ms it clears the
2.5 s budget by under 250 ms. That margin is the baseline Phase 5's background
canvas has to be measured against — it is the one piece of remaining work that
can plausibly spend it.

## Licence

This repository carries three licences:

- **Code** — MIT. See `LICENSE`.
- **Written copy, visual design and design artboards** — CC BY-NC 4.0.
  See `LICENSE-CONTENT`.
- **Bundled fonts** — SIL Open Font License 1.1. This repository
  self-hosts two families under it, subset to the Latin script and
  converted to woff2 by `scripts/build-fonts.mjs`:
  - Space Grotesk 2.0.0 — Copyright 2020 The Space Grotesk Project Authors
    (https://github.com/floriankarsten/space-grotesk)
  - JetBrains Mono 2.304 — Copyright 2020 The JetBrains Mono Project
    Authors (https://github.com/JetBrains/JetBrainsMono)

  The full licence text for both, with their copyright notices, is at
  `public/fonts/OFL.txt`.
