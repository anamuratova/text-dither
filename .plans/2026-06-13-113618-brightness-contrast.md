# Add brightness/contrast filters

**Date:** 2026-06-13 11:36
**Task:** User wants brightness and contrast controls for the source image.

## Goal
Two new tone controls (brightness, contrast) that adjust the image luminance before the dither tone mapping, with live sliders and tests.

## Input Information
- Tone pipeline lives in computeLayout (src/core/layout.ts): per cell `lum01 = invert ? 1-lum : lum`, `dark = clamp(1-lum01,0,1)^gamma`, then optional auto-levels (normalize), then cutoff/banding/scale. The sampler returns faithful luminance only.
- DitherParams is a required-field interface; full literals at: src/core/types.ts DEFAULT_PARAMS, tests/layout.spec.ts BASE, tests/plot.spec.ts (2). Spreads `...BASE` inherit.
- Controls SLIDERS table in src/ui/controls.ts drives the sidebar sliders + readouts.

## Approach

### Step-by-step plan
1. types.ts: add `brightness: number` (-1..1, default 0) and `contrast: number` (0..2, default 1) to DitherParams; add to DEFAULT_PARAMS.
2. layout.ts: apply in the first pass on raw luminance, before invert (image-domain adjustment): `v = clamp((lum - 0.5) * contrast + 0.5 + brightness, 0, 1)`; then `lum01 = invert ? 1-v : v`. Identity at defaults (contrast 1, brightness 0).
3. controls.ts: add two sliders (brightness -1..1 step 0.01; contrast 0..2 step 0.01).
4. Tests (layout.spec.ts): brightness raises luminance -> lowers dark (less ink); contrast expands around mid-gray; identity at defaults reproduces current dark; clamp keeps dark in [0,1]. Update BASE + plot.spec literals with the new fields (brightness 0, contrast 1 = identity, so existing assertions unchanged).
5. Verify typecheck, unit, e2e, build; screenshot a strong brightness/contrast setting to confirm visible effect.
6. Worklog, commit, push, confirm CI + deploy.

### Key decisions
- **In computeLayout, on luminance, before invert:** brightness/contrast are image-domain adjustments; keeping them with the other tone params (and out of the sampler) keeps the sampler a faithful luminance read and all tone mapping in one place.
  - Alternatives: apply to `dark` after gamma (rejected - less intuitive: "brighter" should mean lighter image/less ink, which is natural on luminance); apply in sampler (rejected - muddies "faithfully sample the image").
- **Standard formula** `(v-0.5)*contrast + 0.5 + brightness`, clamped. Ranges brightness -1..1 (default 0), contrast 0..2 (default 1).

## Risks & Edge Cases
- Defaults must be exact identity so all existing pinned tests hold (contrast 1, brightness 0 -> v = lum).
- Composition with normalize: brightness/contrast happen before gamma+normalize; normalize still stretches the result. Independent and acceptable.
- All four full DitherParams literals must gain the fields or typecheck fails.

## Files to Modify
- src/core/types.ts - interface + DEFAULT_PARAMS
- src/core/layout.ts - first-pass formula
- src/ui/controls.ts - two sliders
- tests/layout.spec.ts - BASE + new assertions
- tests/plot.spec.ts - two literals
