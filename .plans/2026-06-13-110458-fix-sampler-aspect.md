# Fix horizontal squish: sampler aspect-ratio bug

**Date:** 2026-06-13 11:04
**Task:** User reports the rendered dither looks horizontally squished vs the source image. Fix at the root.

## Goal
Rendered output matches the underlying image's proportions. A circle in the source reads as a circle on canvas (no vertical stretch / horizontal squish).

## Input Information
- src/core/sampler.ts luminanceGrid does cover-fit into the cols x rows buffer treating cells as square.
- src/render/canvas.ts: canvas sized to image aspect (displayH = displayW * sh/sw), grid fills it, cells are non-square (cellW = 0.62*cellH), so cols ~= 1.6x more than a square grid.
- Result: cover-fit in cell space crops the image (square image: 79x79 drawn into 79x49 buffer, middle 62% kept) then that band stretches to full canvas height -> vertical stretch / horizontal squish by ~0.62.
- Cause is the sampler, NOT the font (fillText does not distort glyph shapes).

## Approach

### Step-by-step plan
1. Extract pure `coverRect(cols, rows, width, height, sw, sh)` in sampler.ts: cover-fit in physical (width x height) space, convert the draw rect to cell-buffer units (multiply by cols/width, rows/height). Since canvas aspect == image aspect, this is an exact fill (no crop) for the rose; still correct cover behavior if aspects ever differ.
2. `luminanceGrid` takes `width, height` and uses coverRect.
3. canvas.ts: pass `width, height` to luminanceGrid.
4. tests/sampler.spec.ts: prove the bug via the pure function - non-square cells with matching physical aspect must fill the buffer exactly (old code cropped); wide physical aspect crops the overflow axis (cover preserved).
5. Verify: typecheck, npm test, e2e, build; screenshot rose render and confirm bloom aspect ~1:1.
6. Worklog, commit, push, confirm CI + deploy green.

### Key decisions
- **Root fix in sampler, no manual width control:** the squish is a correctness bug, not an aesthetic choice. Cover-fitting in physical space makes the luminance grid faithfully represent the displayed image. A manual stretch slider would be a band-aid hiding the bug.
  - Alternatives considered: add a width-stretch slider (rejected - band-aid, leaves the default wrong); stretch image to fill buffer directly (works only because canvas aspect == image aspect; coverRect is the general correct form).

## Risks & Edge Cases
- Deviates from base spec section 4 (literal cover-fit on cols x rows). User report overrides; note in worklog.
- Degenerate sw/sh = 0: image sources always have nonzero dims; not guarded (same as before).
- coverRect is pure (no DOM) so it is unit-testable in the node vitest env.

## Files to Modify
- src/core/sampler.ts - coverRect + luminanceGrid signature
- src/render/canvas.ts - pass width, height
- tests/sampler.spec.ts - new, prove fix
