---
paths:
  - "lib/field/**"
  - "lib/invokers.d.ts"
  - "components/layout/FieldCanvas/**"
  - "components/layout/InstrumentOverlay/**"
  - "components/layout/InvokerDialog/**"
  - "components/layout/NavDialog/**"
  - "components/layout/NavPanel/**"
  - "components/layout/RailSegment/**"
  - "app/styles/field.css"
  - "vite.config.ts"
---

# Client components, motion and the field

- **Client components and motion.** A `'use client'` file lives in its own family folder like any
  other, never owns copy, never reads `site`, and writes the DOM only through refs. Animation never
  enters the render cycle: no state, no re-render; values are computed in plain JavaScript on
  `requestAnimationFrame`, written at most once per frame per element, and CSS transitions do the
  easing — except the field's camera lift, which the renderer eases in JavaScript on elapsed time
  (`liftToward` at `LIFT_RATE`, the 60 Hz feel of 5% per frame, now identical at every refresh
  rate) because it is a uniform, not a style; the lift starts at `LIFT` and descends to zero as
  the page scrolls (the author, 2026-09-11). The rail eases one number, `--rail-tip` on `main`, registered with `@property` so it can
  transition; every segment derives its fill and dot from it in CSS, which is why the line never
  breaks at a seam. As a segment lights, `RailSegment` also toggles `data-lit` on its parent row
  (the `<section>`, or the hero's row `div`), and the row's own stylesheet colours its label from
  that; under reduced motion the loop never runs, so the lit colour is set statically there. Reduced motion is a static state in a `prefers-reduced-motion` block, never
  nothing. The logo band moves by CSS `@keyframes` on `transform` and needs no client component; under
  reduced motion it is a static wall.
  No absolute positioning and no negative margins unless absolutely necessary: stacking is a shared
  grid area, overhang is self-alignment inside a narrow track, offset is padding or a transform.
  `body` is that pattern at page scale: a one-column grid in which `header` and `main` share the
  first area, so the sticky header paints over the column instead of pushing it down, and `main`
  starts at the document's top pixel — the hero body pads by `--header-h` and sets `--rail-top` so
  its rail segment's number and tick clear the band while the line runs from the top.
  A transformed decoration must not extend the page's scrollable overflow — `RailSegment` clips its
  line column vertically (`overflow-y: clip`) so the tip's transform never grows the scroll range.
  Today: `RailSegment`, `InvokerDialog`, `FieldCanvas` and `InstrumentOverlay` are the four client
  components — `InvokerDialog` is the dialog shell and its toggle, no stylesheet, whose two handlers
  exist only for what the platform lacks (close on row activation; open where invoker commands are
  missing); `NavDialog` renders the menu's shell around it on the server so its stylesheet ships in
  the page CSS rather than as a fourth render-blocking file — the bar, the clip, the panel's slide
  in both directions and the backdrop's fade, with `display` and `overlay` in the dialog's and the
  backdrop's transition lists under `allow-discrete` so the close plays out before the dialog
  leaves the top layer, and the toggle's opacity returns on a 180 ms delay so the hamburger is not
  drawn under the closing X (visibility returns at once, so focus can come back to it); `NavPanel` renders the rows, the call-to-action and the strip inside it and
  takes the sliding class as a prop; `FieldCanvas` holds the field's canvas by
  ref and imports the WebGL2 renderer after an idle callback; the loop lives in
  `lib/field/gl/renderer.ts`, never in the component, and now runs a space-colonization simulation as
  well as the renderer; the scene renders into an offscreen target and the tips and sparks again into
  a half-resolution target blurred by `post.ts`, and one composite pass draws the sky from `--ground`,
  `--sky-mid` and `--sky-low` with vertical drift and a dither, the scene over it and scene plus bloom
  through a knee capped at `FIELD_CAP`; the canvas is opaque while running and the CSS sky in
  `field.css` is the fallback for no JavaScript, software renderers and lost contexts — one linear
  gradient through the same three tokens, no halo (the author, 2026-09-14), so the canvas's first
  frame matches it and the field itself fades in through the composite's `u_fade` (`fadeIn(clock)`
  over `FADE_IN` seconds, held at zero while the opening plays); motes are the
  fourth scene pass. `lib/field/gl/program.ts` holds the pass description and the per-frame uniform
  layout (`draw(gl, pass, frame)`), and `lib/field/gl/` is at its four-file cap: `program.ts`,
  `renderer.ts`, `shaders.ts` and `post.ts`. The canvas's stylesheet is the global `app/styles/field.css` so the canvas
  contributes no CSS to the client chunk; `InstrumentOverlay` holds its refs only, measures the rendered page once through
  `lib/instruments/frame.ts` (header and its inner row, `h1`, hero body, lede, actions, first
  section and its content box, the rail line, the first lead paragraph, and every on-screen copy
  rect the chips must keep clear of) and
  `lib/instruments/chips.ts` (live readings of tokens, timing and layout), hands the measured
  targets, readings and box sizes to `lib/instruments/layout.ts`, the pure pass that places every
  line, readout, anchored chip and block — the rail group's block left of the rail,
  `layout`/`tokens`/`env` right of the heading, the section group's beside the lead, each a
  flex-wrapped run of chips on a spine (`lib/instruments/place.ts` is its solver: `place` beside
  an anchor, `columns` for a block's column-major search inside its region,
  `rows`/`blockSize`/`blockAt` for a block's rows, size, spine and chips), and writes each its own
  `--x`, `--y` and `--i` (plus `--w`/`--h`/`--from`/`--n`/`--d`
  for a line) — nothing is
  clamped to a fixed pixel offset — and drives `data-beat` on the
  overlay and `data-opening` on the root from one `requestAnimationFrame` loop; `data-beat` lists
  every beat reached (`0 1 2`), matched with `~=`, so a later beat adds to the earlier ones' rules and
  the stagger inside a beat is `transition-delay` for the lines, whose stepped `clip-path`
  transition does their easing, and `animation-delay` for the readouts and chips, whose stepped
  keyframes do theirs; the four positioned rules are
  the skip link's off-screen state, the card's accent bar (`ArticleCard.module.css`), the field
  canvas's `position: fixed` in `app/styles/field.css` — the platform's mechanism for a viewport
  backdrop — and the overlay's own `position: fixed` in `InstrumentOverlay.module.css`, above the
  sticky header and under the dialog's top layer. Contrast over the field is carried by the per-section veil on `Section .body` and
  `Hero .body`, not by any sheet — and only because that veil holds its 75% tint to the body's edge
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
  prints exactly 4 lines: SkipLink, ArticleCard, field.css, InstrumentOverlay.
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
  `lib/instruments/` holds the opening's placement engine — `chips.ts` and `frame.ts` read the
  rendered page into readings and rule geometry, `place.ts` the pure solver and `layout.ts` the pure
  pass over them — four files, at the cap; their specs live in `tests/unit/instruments/`;
  `lib/opening/` holds the beat clock (`beats.ts`) and the
  inline pre-paint gate (`gate.ts`), each with its Vitest spec beside it — four files, at the cap.
