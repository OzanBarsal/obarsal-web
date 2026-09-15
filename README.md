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
run locally with `npm run deploy` under wrangler's own login; CI verifies and
never deploys. No credential lives in this repository, and none is needed to
build or test it.

## Budgets and measured numbers

The budgets below are enforced in CI by `npm run lh` (`lighthouserc.json`); a
run that misses one fails the build:

- Lighthouse Performance ≥ 90
- Lighthouse Accessibility = 100
- Lighthouse SEO = 100
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1

**Production figures**, median of three runs against https://obarsal.dev on
2026-09-15 (Lighthouse 13.4.1, mobile form factor, `throttlingMethod: "simulate"`:
a modelled 150 ms RTT, 1.6 Mbps and a 4x CPU slowdown):

| | |
| --- | --- |
| Performance | 0.96 |
| Accessibility | 1.00 |
| SEO | 1.00 |
| Best Practices | 1.00 |
| Largest Contentful Paint | 2219 ms (the hero lede paragraph) |
| First Contentful Paint | 2219 ms |
| Speed Index | 3047 ms |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| HTML document | 14,273 bytes on the wire, over HTTP/2 |

The same build measures 0.97 against `wrangler dev` on localhost (FCP 1818 ms,
LCP 2418 ms, median of three runs on 2026-09-15). The one-point gap is the
origin connection Lighthouse models for a remote host, not a difference in the
page; the production numbers are the ones to quote.

LCP is the hero lede rather than the `<h1>`, and clears the 2.5 s budget by
under 300 ms. In the local build the 2026-09-05 figures were 0.98, FCP 1666 ms
and LCP 2266 ms; the client logo band added 150 ms to both paints because the
gzipped HTML document grew from 13,806 to 15,081 bytes and crossed Lantern's
14,600-byte initial congestion window (ten packets of 1,460 bytes), which costs
one modelled round trip before the first byte of the rest arrives. The inline
RSC payload repeats every logo entry, and trimming attributes recovers tens of
bytes, not the 481 needed, so the author re-baselined rather than cut.

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
