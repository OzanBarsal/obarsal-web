---
paths:
  - "lib/field/**"
  - "lib/invokers.d.ts"
  - "components/layout/FieldCanvas/**"
  - "components/layout/InstrumentOverlay/**"
  - "components/layout/InvokerDialog/**"
  - "components/layout/NavDialog/**"
  - "components/layout/RailSegment/**"
  - "app/styles/field.css"
  - "vite.config.ts"
---

# Client components, motion and the field

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
  Today: `RailSegment`, `InvokerDialog`, `FieldCanvas` and `InstrumentOverlay` are the four client
  components — `InvokerDialog` is the dialog shell and its toggle, no stylesheet, whose two handlers
  exist only for what the platform lacks (close on row activation; open where invoker commands are
  missing); `NavDialog` renders the menu's markup around it on the server so its stylesheet ships in
  the page CSS rather than as a fourth render-blocking file; `FieldCanvas` holds the field's canvas by
  ref and imports the WebGL2 renderer after an idle callback; the loop lives in
  `lib/field/gl/renderer.ts`, never in the component, and now runs a space-colonization simulation as
  well as the renderer; the canvas's stylesheet is the global `app/styles/field.css` so the canvas
  contributes no CSS to the client chunk; `InstrumentOverlay` holds its refs only, measures the
  rendered page once, and drives `data-beat` on the overlay and `data-opening` on the root from one
  `requestAnimationFrame` loop, with CSS transitions doing the easing; the three positioned rules are
  the skip link's off-screen state, the card's accent bar (`ArticleCard.module.css`), and the field
  canvas's `position: fixed` in `app/styles/field.css` — the platform's mechanism for a viewport
  backdrop. Contrast over the field is carried by the per-section veil on `Section .body` and
  `Hero .body`, not by any sheet — and only because that veil holds its 88% tint to the body's edge
  with no transparent stop (`CLAUDE.md` §8); a veil that fades leaves the text in the fade with
  nothing.
  `vite.config.ts` predates the field (the CDN cache adapter and the Cloudflare environment wiring live
  there); the field added one `codeSplitting` group that merges the four client-component chunks into
  one, because each chunk is `modulepreload`ed at page load and the third cost a round trip of first
  contentful paint under Lighthouse's simulated connection. A fifth client component joins that regex
  or the round trip returns.
  Check: `grep -rlnE "['\"]use client['\"]" components app lib` prints exactly `RailSegment.tsx`,
  `InvokerDialog.tsx`, `FieldCanvas.tsx` and `InstrumentOverlay.tsx`;
  `grep -rnE "position: (absolute|fixed)|margin[a-z-]*:[^;]*-[0-9]" app components --include='*.css'`
  prints exactly 3 lines: SkipLink, ArticleCard, field.css.
- `lib/` holds what is neither a component nor a route: helpers, the Satori card and the faces it
  bundles, and `lib/invokers.d.ts`, the one ambient declaration file; `lib/field/` holds the field's
  world as a space-colonization simulation — `constants.ts`, `terrain.ts`, `camera.ts`, `life.ts` and
  `attractors.ts` (`growth.ts` is gone) — and `lib/field/gl/` its WebGL2 renderer, shaders and program
  helpers; the world modules are pure and have Vitest specs in `tests/unit/`, the renderer is proven
  in `tests/e2e/field/`. `camera.ts` also exports the detail scale that the simulation's spacing is
  graded by, so the simulation never needs to know where the camera is. The spatial hash in `life.ts`
  bins by the unscaled influence radius and searches a 3×3 neighbourhood, so that scale may only ever
  shrink the radius, never grow it. The internode is floored separately from the four spacing lengths,
  because it sets how fast the growing frontier advances rather than how far apart veins sit — without
  the floor the frontier falls below the camera's speed and the field cannot establish itself.
  `lib/field/` is at the five-file cap: a sixth file forces a split by concern,
  not a sixth file in the same folder. `lib/og/fonts/` holds the `.ttf` files Satori needs; they are
  not public assets. Check: `ls dist/client/fonts` after a build prints only the two `.woff2` and
  `OFL.txt`.
