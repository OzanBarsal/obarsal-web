---
paths:
  - "lib/field/**"
  - "app/styles/tokens.css"
  - "app/styles/field.css"
  - "components/**/*.module.css"
  - "tests/e2e/veil/**"
  - "tests/e2e/field/**"
  - "tests/unit/contrast.test.ts"
---

# The veil, the page envelope and the field's values

Decided by the author, never by an agent and never by a check:

- **The veil, the page envelope and the field's constants.** The veil's tint is the author's: in both
  `Section.module.css` and `Hero.module.css` it ramps from opaque `--ground` to
  `color-mix(in oklab, var(--ground) 88%, transparent)` — at 46% across on desktop, 56% down on
  mobile — and holds that tint to the edge. **There is no transparent stop, and adding one is a
  contrast regression, not a softening**: the canvas is opaque while running and the composite can
  reach `FIELD_CEILING` at any pixel under the veil, so text under a transparent stop would sit on the
  ceiling with no protection; 88% is the floor that keeps every text token at 4.5:1 over the ceiling —
  and the field is not `--accent`. The composite pass caps the field term at `FIELD_CAP` through `cap * (1 - exp(-f / cap))`
  (near-identity at low `f`; the author chose it over `f / (f + 1)`, 2026-09-11), so the
  brightest composite is the sky's maximum plus `DRIFT`, a dither step and the cap — `ceiling()` in
  `camera.ts`, held to `FIELD_CEILING` in `sweep.ts` by `tests/unit/contrast.test.ts`; every bound is
  solved against that colour; `field-colour.spec.ts` holds the composite under it. At the 12% the veil
  transmits, `--muted` is 4.74:1 over `FIELD_CEILING`.
  `tests/unit/contrast.test.ts` holds that arithmetic; the per-pixel alpha guard
  (`tests/e2e/field/contrast.spec.ts` and its `tests/e2e/veil-sampling.ts` sampler) was retired when
  the canvas became opaque, because its product was exactly the two guards that remain:
  `tests/e2e/veil/transmission.spec.ts` holds every text run on the page to it, and
  `tests/e2e/veil/field-colour.spec.ts` holds the field inside the ceiling the bounds assume. `--page-max` (1280px)
  and `--content-max` (1080px) in `app/styles/tokens.css` are the author's too, the page envelope the
  rows and bodies are capped to. So are
  the field's constants in
  `lib/field/constants.ts` and `lib/field/camera.ts`: the camera values (`CAM_H`, `THETA`,
  `HORIZON_DESKTOP`, `HORIZON_MOBILE`, `HORIZON_MIN`) and the three grading values (`GRADE_NEAR`,
  `GRADE_SPAN`, `GRADE_FLOOR`) plus `REACH` are the author's 2026-09-08 choices, made from rendered
  candidates. So is `SPEED`, the flight, set to `30 / 2.5` by the author on 2026-09-10 (from `30 / 1.4`);
  lowering it is the safe direction, since the growth frontier's margin over the camera only widens.
  `FIELD_CAP`, `BLOOM_STRENGTH`, `BLOOM_SPREAD`, `DRIFT`, `DRIFT_PERIOD`, `MOTES` and `MOTE_LIFE` join
  that list as of 2026-09-11, candidates pending the author's sign-off from rendered candidates (the
  chosen values are recorded here once the author signs them). `--horizon` in `app/styles/tokens.css` mirrors `HORIZON_DESKTOP` and `HORIZON_MOBILE`
  and is held to them by a test; changing either constant means changing the token. `DARTS` is the
  seeding density dial, not `MAX_NODES`: the segment ring settles near 2870 of its 6000 slots
  at 1440×900, and its occupancy rises with viewport aspect ratio, so on a very wide viewport the
  ring reaches its limit and the oldest — meaning nearest — segments are dropped every step.
  `life.ts`'s taper, `max(0, 5 − path/DI)`, is an implementer's scale the author has not signed.
  **`CULL_SPAN = 0.12` is a derived correctness constant, not a design value.** It scales the cull
  margin with viewport height, because the worst on-screen segment span grows with viewport height
  while `CULL_MARGIN` is fixed, so above about 1276px of height the old fixed margin dropped
  segments that were still on screen. 0.12 covers a growth-step segment, whose length is `D` scaled
  by the graded detail: a measured worst `span / height` of 0.0982, a 24% headroom. **It does not
  cover every segment.** `life.ts`'s `join` commits a merge segment reaching `DK · detail`, three
  times longer, and about 42% of live segments exceed `D`; the true worst projected span at 1440×900
  is near 400px against a 120px margin, and roughly 12 segments a second still leave view while
  partly on screen there — against 29 before the camera was raised, which is where that improvement
  came from rather than from this constant. Covering the merge path by margin alone would need a
  scale near 0.55, which keeps far more off-screen geometry alive and pushes the upload budget the
  wrong way, so it is a trade rather than an oversight. Changing `D`, `DK`, `GRADE_FLOOR`,
  `GRADE_NEAR`, `THETA`, `CAM_H` or the horizon fractions means re-deriving it. The contrast spec's `BOUNDS` are
  derived from `FIELD_CEILING` (the three sky tokens, `FIELD_CAP` and `DRIFT` through `ceiling()`),
  `--ground` and the text tokens; re-derive them when any of those change.
- **The rail's contrast exemption.** The rail's numbers, tick and dot sit outside every veil, on the
  field itself, and the composite can reach `FIELD_CEILING` behind it, so no text colour survives the
  ceiling: an inactive number in `--muted` is **2.69:1** against the ceiling; an active one, which is
  `--accent`, is **1.22:1**.
  Those are the ratios at the ceiling, not the floor. `--muted`'s contrast bottoms out where the
  composite's luminance equals the token's, which the knee can reach, so the true floor is 1.00:1;
  the rendered-frame figures are re-measured when the author signs the post values.
  It cannot be fixed by brightening the token or by veiling the gutter without ending the design.
  The rail is
  `aria-hidden` decoration whose numbers duplicate the section order the page already states in text,
  so WCAG 1.4.3's incidental exemption applies. A knowing exemption, not an oversight:
  `tests/e2e/veil/transmission.spec.ts` excludes `[aria-hidden="true"]` for this reason and no other.
  The header is excluded from that sweep for a different, checked reason — its band sits above the
  drawn horizon, so no field is ever behind it, and the last test in that file holds it there.
