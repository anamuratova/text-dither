# Fix horizontal squish in the rendered dither (sampler aspect bug)

**Date:** 2026-06-13 11:07
**Scope:** src/core/sampler.ts, src/render/canvas.ts, tests/sampler.spec.ts

## Summary
The rendered output was stretched vertically / squished horizontally (~0.62x) versus the source image. Root cause was the luminance sampler cover-fitting the image into the cols x rows cell buffer as if cells were square. Fixed by cover-fitting in physical canvas space and mapping the draw rect into the non-square cells.

## Context & Problem
User reported the result looked "shrinked by weight," hypothesizing the font. It was not the font - fillText does not distort glyph shapes.

The renderer sizes the canvas to the image aspect (displayH = displayW * sh/sw) and fills it with a grid whose cells are narrow: cellW = 0.62 * cellH. So the grid has ~1.6x more columns than a square grid would. The old sampler did `scale = max(cols/sw, rows/sh)` and drew the image into the cols x rows buffer treating those cells as square pixels. For a square image that drew it at e.g. 79x79 into a 79x49 buffer, cropping the middle 62% of the height, which then stretched back across the full canvas height -> vertical stretch by 1/0.62 = 1.61x.

## Decisions Made

### Root fix in the sampler, no manual width control
- **Chose:** Cover-fit in physical (width x height) space, then convert the draw rect to cell-buffer units (multiply by cols/width, rows/height). New pure `coverRect()` exported for testing; `luminanceGrid` now takes width, height.
- **Why:** The squish is a correctness bug - the luminance grid must represent the image as it is actually displayed. Because the canvas aspect always equals the image aspect, this is an exact fill (no crop) for matching aspects, and correct cover-with-crop if they ever differ.
- **Alternatives considered:**
  - Manual width/stretch slider (the user's "or a control" option) - rejected as a band-aid that leaves the default wrong and hides the bug.
  - Stretch image to fill the buffer directly - correct only because canvas aspect == image aspect; coverRect is the general correct form and costs nothing extra.

## Architectural Notes
- coverRect is pure (no DOM), unit-tested in the node vitest env. luminanceGrid stays the only DOM-touching path.
- Deviates from base spec section 4 (literal "cover fit on cols x rows"); the spec's literal phrasing is what produced the squish. User report overrides the spec here.

## Verification
- Numeric: old logic on a 32x20 buffer / square canvas / square image gave dh=32 (cropping 38% vertically); fix gives dh=20 (fills exactly).
- 4 new coverRect unit tests (matching aspect fills; wide/tall sources crop the overflow axis). Full suite: 31 unit tests + 7 e2e green; typecheck + build green.
- Visual: rendered rose bloom is round with the stem below; measured ink bbox aspect 0.81 (rose + stem), vs ~0.50 the same content would measure pre-fix.

## Information Sources
- src/core/sampler.ts (old cover-fit), src/render/canvas.ts (grid derivation, cellW = 0.62*cellH).
- Plan: .plans/2026-06-13-110458-fix-sampler-aspect.md

## Key Files for Context
- src/core/sampler.ts - coverRect + luminanceGrid.
- src/render/canvas.ts:71-96 - canvas sizing, grid derivation, sampler call.
- tests/sampler.spec.ts - coverRect behavior.

## Next Steps / Continuation Plan
1. Push; confirm CI + Pages deploy green and the live render is un-squished.
2. If artistic non-uniform stretch is ever wanted, add it as an explicit param on top of the now-correct default - not as a fix.
