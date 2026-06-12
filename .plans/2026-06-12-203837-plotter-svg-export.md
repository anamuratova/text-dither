# Plotter SVG export (spec addendum sections 11-16)

**Date:** 2026-06-12 20:38
**Task:** Implement /Users/anna/Downloads/TASK-text-dither-plotter (1).md: stroke-only layered plotter SVG export with Hershey glyphs, tonal bands, mm units; auto-levels amendment to the core pipeline; UI additions; PLOTTING.md; tests.

## Goal
Second export path producing vpype/Inkscape-compatible layered SVG (no text, no fills, mm units), plot preview on canvas, auto-levels normalization in computeLayout, all new Vitest + Playwright tests green alongside the existing suite.

## Input Information
- Addendum spec: /Users/anna/Downloads/TASK-text-dither-plotter (1).md (authoritative; extends TASK-text-dither.md which stays in force).
- Existing implementation as of commit c698be1.
- Hershey futural (Hershey Sans 1-stroke) JHF data: public domain, vendor from the classic Hershey font distribution (paulfitz/hershey-fonts mirror).
- vpype: installing via pipx for verifying the optimize:example script once.

## Approach

### Step-by-step plan
1. Download futural.jhf, inspect glyph count/order (expect ASCII 32-126 in order), vendor as raw JHF strings inside src/plot/hershey.ts with a parser at module load + provenance comment. HERSHEY_UNITS_PER_EM = 32 (classic Hershey em: cap top y=-12, baseline y=+9, y-down like canvas - no axis flip).
2. Core amendment (section 16): add `normalize: boolean` to DitherParams (default true in DEFAULT_PARAMS); add `export function autoLevels(darks)` to src/core/layout.ts; computeLayout becomes two-pass: first pass computes raw dark per grid cell (invert + gamma), autoLevels over all cells, second pass remaps and runs the existing glyph loop. Add `dark` field to Glyph (band assignment after layout needs the tonal value; alpha is derived, dark is the source of truth).
3. src/plot/bands.ts: Band/PlotProfile interfaces, GRAY_INKS + SINGLE_PEN profiles exactly per tables, bandFor().
4. src/plot/strokes.ts: glyphStrokes() - scale fontSize/HERSHEY_UNITS_PER_EM, rotate about glyph center, translate; n passes offset along fixed 30 degrees by (k-(n-1)/2)*offsetMm*pxPerMm; 45-degree bbox hatch (shrunk 8%, spacing penWidthMm*0.9*pxPerMm); tiny-glyph guard fontSize/pxPerMm < 1.6 forces 1 pass no hatch.
5. src/plot/plotSvg.ts: toPlotSVG() - pxPerMm = canvasW/(widthMm-2*marginMm); mm coords rounded 0.01; one inkscape layer group per non-empty band, lightest first, label "{n}-{label}"; xmlns:inkscape declared so output XML-parses; absolute M/L paths only; metadata comment with profile/pen/page/thresholds/per-band counts; debugIndices option (default false) puts data-i on each glyph's first path.
6. UI (section 13): PlotState in src/state.ts (profile name, pageWidthMm 297 [100..841], marginMm 10, preview boolean); "Plotter" sidebar section with select, two numeric inputs, Save plot SVG button, per-band stats line after export; "auto levels" checkbox joins the params block (mirrors new normalize param). Plot preview = alternate draw path in render/canvas.ts consuming glyphStrokes (single geometry source).
7. PLOTTING.md (section 14) + examples/plot-example.svg fixture (generated once via npx tsx from the real modules) + npm script optimize:example running the vpype pass on it. Verify the script once locally with installed vpype (not part of CI - vpype is a local tool).
8. Tests: tests/plot.spec.ts (criteria 1-8), layout.spec.ts additions for auto-levels (a/b/c), e2e additions 9-10. Existing layout.spec BASE gets normalize: false so it keeps pinning raw section-3 behavior (uniform grids collapse to dark=0 under normalization by design - lo==hi guard maps everything to 0).
9. Full verification (section 9 commands), adversarial review vs the addendum, worklog, commit, push; confirm CI + Pages deploy green and the live site updated.

### Key decisions
- **Glyph gains a `dark` field:** band assignment happens after layout but needs tone. Deriving dark from alpha ((alpha-fadeFloor)/(1-fadeFloor)) inverts a lossy presentation value and breaks when fadeFloor approaches 1. The layout already has dark in hand; carrying it is the clean boundary. Original determinism/equality tests are unaffected (toEqual compares both sides' full shape).
  - Alternative: recover dark from alpha - rejected as an inverted derived value with a degenerate case.
- **Existing unit-test BASE switches to normalize: false:** addendum test (b) requires normalize=false to reproduce section-3 behavior exactly; the original 8 criteria pin that behavior, so they run un-normalized. New tests cover normalize=true.
- **Hershey data as raw JHF strings + tiny parser:** keeps provenance verbatim (diffable against upstream), ~8 KB, parsed once at module load. Alternative - pre-decoded coordinate arrays - larger and unverifiable against source.
- **Profiles' b1.min stored as 0:** spec table says "(cutoff, 0.30]" but cutoff is runtime state while profiles are constants; layout already excludes dark <= cutoff, and bandFor keeps a null guard for dark <= 0 as the spec instructs ("already excluded by layout, keep as guard").

## Risks & Edge Cases
- JHF axis direction and em metrics: verified by decoding 'A' (apex at negative y => y-down, matches canvas; no flip).
- Normalization on uniform grids maps all darks to 0 => nothing renders with whiteCutoff 0 (dark <= cutoff). Spec-literal; existing tests pinned via normalize:false.
- Rounding to 0.01 mm must happen after margin translation so bounds tests hold exactly.
- e2e preview toggle restore: rendering is deterministic, so hash must round-trip exactly; any nondeterminism is a bug to fix, not to tolerate in the test.

## Files to Modify
- src/core/types.ts - normalize param, dark on Glyph, DEFAULT_PARAMS
- src/core/layout.ts - autoLevels + two-pass computeLayout
- src/plot/hershey.ts, bands.ts, strokes.ts, plotSvg.ts - new
- src/render/canvas.ts - plot-preview draw path
- src/state.ts - PlotState
- src/ui/controls.ts - Plotter section + auto-levels checkbox + stats line
- src/main.ts - wiring Save plot SVG / preview
- tests/plot.spec.ts - new; tests/layout.spec.ts - auto-levels cases + normalize:false BASE; tests/svg.spec.ts - dark field on fixtures; tests/e2e/app.spec.ts - criteria 9-10
- PLOTTING.md, examples/plot-example.svg, package.json (optimize:example)
