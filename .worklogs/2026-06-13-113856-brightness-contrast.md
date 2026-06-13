# Add brightness/contrast filters

**Date:** 2026-06-13 11:38
**Scope:** src/core/types.ts, src/core/layout.ts, src/ui/controls.ts, tests/layout.spec.ts, tests/plot.spec.ts

## Summary
Added brightness and contrast controls that adjust the image luminance before the dither tone mapping. Two new DitherParams fields, applied in computeLayout's first pass, exposed as sidebar sliders, with behavior + clamp tests.

## Context & Problem
User asked for brightness/contrast filters. The tone pipeline (invert -> 1-lum -> gamma -> normalize -> cutoff/banding) lives in computeLayout; the sampler returns faithful luminance only.

## Decisions Made

### Apply in computeLayout, on luminance, before invert
- **Chose:** `v = clamp((lum - 0.5) * contrast + 0.5 + brightness, 0, 1)`, then `lum01 = invert ? 1-v : v`, in the existing first pass.
- **Why:** Brightness/contrast are image-domain adjustments; keeping them with the other tone params (not in the sampler) leaves the sampler a faithful luminance read and keeps all tone mapping in one place. Operating on luminance makes "brighter" mean a lighter image -> less ink, which is the intuitive direction.
- **Alternatives considered:** apply to `dark` after gamma (rejected - less intuitive direction); apply in the sampler (rejected - muddies "faithfully sample the image").

### Ranges and defaults
- brightness -1..1 default 0 (additive); contrast 0..2 default 1 (gain around mid-gray 0.5). Defaults are exact identity (`v = lum`), so every existing pinned test holds unchanged.

## Architectural Notes
- DitherParams is a required-field interface, so all four full literals (DEFAULT_PARAMS + test BASE + two in plot.spec) gained the fields; `...BASE` spreads inherit.
- Composition: brightness/contrast run before gamma and auto-levels; normalize still stretches the result. Independent and intentional.
- High contrast can push a light cell to pure white (dark 0), which whiteCutoff then drops - correct behavior (the contrast test disables the cutoff to compare darkness).

## Verification
- 35 unit tests (4 new brightness/contrast cases: identity at defaults, brightness direction, contrast expansion both sides of mid-gray, clamp bounds under extremes) + 7 e2e green; typecheck + build green.
- Browser: both sliders present and wired; render changes with each; contrast 1.7 visibly increases dark/light separation.

## Information Sources
- src/core/layout.ts first pass; src/ui/controls.ts SLIDERS table.
- Plan: .plans/2026-06-13-113618-brightness-contrast.md

## Key Files for Context
- src/core/layout.ts:44 - the brightness/contrast/invert/gamma first pass.
- src/core/types.ts - DitherParams + DEFAULT_PARAMS.
- src/ui/controls.ts:20 - SLIDERS table.

## Next Steps / Continuation Plan
1. Push; confirm CI + deploy green and the sliders appear on the live site.
