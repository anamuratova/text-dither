# Plotter SVG export: Hershey strokes, tonal bands, mm units (addendum 11-16)

**Date:** 2026-06-12 21:10
**Scope:** src/plot/ (new: hershey.ts, bands.ts, strokes.ts, plotSvg.ts), src/core/types.ts, src/core/layout.ts, src/state.ts, src/render/canvas.ts, src/ui/controls.ts, src/main.ts, src/styles.css, tests/plot.spec.ts (new), tests/layout.spec.ts, tests/svg.spec.ts, tests/e2e/app.spec.ts, PLOTTING.md (new), examples/plot-example.svg (new), package.json, .gitignore

## Summary
Implemented the pen-plotter addendum end-to-end: stroke-only layered SVG export (vpype/Inkscape-compatible, physical mm), Hershey futural single-stroke glyphs, two built-in tonal-band profiles, on-canvas plot preview sharing the export geometry, auto-levels normalization in the core pipeline, 15 new unit tests + 2 e2e tests, PLOTTING.md with a verified vpype pass. Adversarial review found one blocker (degenerate printable area), fixed with a regression test; convergence pass clean.

## Context & Problem
Addendum /Users/anna/Downloads/TASK-text-dither-plotter (1).md: the screen renderer encodes tone in weight/opacity/fill, none of which exist on a plotter. Tone is re-encoded as glyph size (unchanged), pass count, single-stroke construction with optional hatch, and per-band layers/pens. Order preservation stays untouched - bands are assigned after layout.

## Decisions Made

### Glyph carries a `dark` field
- **Chose:** Added dark: number to the Glyph interface; computeLayout records the post-normalization darkness.
- **Why:** Band assignment happens after layout but needs tone. alpha is a derived presentation value (lerp(fadeFloor, 1, dark)); inverting it is lossy and degenerates as fadeFloor -> 1. The layout has dark in hand; carrying it is the clean boundary.
- **Alternatives considered:**
  - Recover dark from alpha in plot code - rejected, inverted derived value with a degenerate case.
  - Parallel darks array returned beside glyphs - rejected, two structures to keep index-aligned.

### Hershey data as raw JHF strings + module-load parser
- **Chose:** 95 futural.jhf lines (ASCII 32-126) embedded as a JSON-escaped string array in hershey.ts, parsed once at import; provenance comment cites the kamalmostafa/hershey-fonts mirror and the public-domain origin.
- **Why:** Verbatim data is diffable against upstream; JHF contains backslashes/backticks so a template literal was unsafe, JSON escaping is exact. HERSHEY_UNITS_PER_EM = 32 (classic metrics: cap top y=-12, baseline y=+9, y-down like canvas - verified by decoding 'A', apex at y=-12, so no axis flip).
- **Alternatives considered:**
  - Pre-decoded coordinate arrays - rejected, larger and unverifiable against source.
  - JSON asset fetched at runtime - rejected, spec forbids runtime fetch.

### Existing unit-test BASE pins normalize: false
- **Chose:** layout.spec BASE gained normalize: false; DEFAULT_PARAMS (app) defaults true per spec.
- **Why:** Addendum test (b) requires normalize=false to reproduce section-3 behavior exactly, and the original criteria 1-8 pin exactly that behavior. Under normalization a uniform grid degenerates (lo==hi guard maps all darks to 0), which would void the uniform-grid fixtures.

### Degenerate printable-area guard (review blocker)
- **Chose:** printableWidthMm(widthMm, marginMm) = max(1, widthMm - 2*marginMm), exported from plotSvg.ts and used by both toPlotSVG and the canvas preview.
- **Why:** UI permits width 100 with margin up to 100; margin >= width/2 made pxPerMm Infinity/negative (invalid SVG, NaN preview). Guard at the shared boundary keeps both consumers total; regression test proves fail-before/pass-after.
- **Alternatives considered:**
  - Dynamic margin max in the UI - rejected as the only fix; library functions must be safe for any caller regardless of UI constraints.

### Profiles store b1.min = 0
- **Chose:** Constant profiles with b1.min 0; bandFor returns null at dark <= 0.
- **Why:** The spec's "(cutoff, 0.30]" lower bound is the runtime whiteCutoff, which layout already enforces by dropping dark <= cutoff cells; spec explicitly says keep bandFor's null as a guard.

### Plot preview consumes glyphStrokes directly
- **Chose:** CanvasRenderer.render takes an optional PlotPreview; drawPlotPreview strokes the exact polylines glyphStrokes returns, band colors, lineWidth = penWidthMm * pxPerMm.
- **Why:** Spec demands single source of truth - what is on screen is what plots. No geometry math exists outside strokes.ts.

### Example fixture generated from the real modules
- **Chose:** examples/plot-example.svg produced by a one-off tsx script calling computeLayout + toPlotSVG on a synthetic radial vignette (162 glyphs, single-pen profile); committed. The optimized output of npm run optimize:example is gitignored (script artifact).
- **Why:** Fixture provably matches the real export format; no hand-authored SVG drift.

## Architectural Notes
- src/plot/ is entirely DOM-free and deterministic (pure data + math), so all 8 acceptance criteria run as fast Vitest node tests.
- Pipeline: computeLayout (now two-pass: raw darks for every cell -> optional autoLevels remap -> glyph loop) -> glyphs with dark -> bandFor -> glyphStrokes (canvas px) -> toPlotSVG (px -> mm at the boundary, margin translation, 0.01 mm rounding).
- Layer numbering counts only populated bands ("{n}-{label}" with n over emitted layers), lightest first; xmlns:inkscape is declared on the root so output XML-parses standalone.
- vpype verification needed Python 3.12 (pipx install --python python3.12 vpype -> 1.15.0): Shapely has no wheels for the default Python 3.14, and the py3.14-resolvable vpype 1.9 is broken (pkg_resources). brew geos + python@3.12 installed along the way.

## Information Sources
- Addendum spec: /Users/anna/Downloads/TASK-text-dither-plotter (1).md; base spec TASK-text-dither.md.
- Hershey data: https://github.com/kamalmostafa/hershey-fonts (futural.jhf), public domain.
- Plan: .plans/2026-06-12-203837-plotter-svg-export.md
- Prior worklogs: 2026-06-12-202331 (main app), 2026-06-12-204029 (@types/node CI fix).

## Open Questions / Future Considerations
- Hatch is bbox-clipped by design (spec-mandated simplification); at glyph sizes far above 5 mm the rectangle becomes visible - acceptable per spec, revisit only if large-format output matters.
- optimize:example requires a locally installed vpype; it is intentionally not in CI (network/python dependency).
- The single-space-text edge (text " " normalizes to one space, consumes cells, draws nothing) remains spec-literal from the base task.

## Key Files for Context
- /Users/anna/Downloads/TASK-text-dither-plotter (1).md - the addendum spec.
- src/plot/plotSvg.ts - export assembly, px->mm boundary, layer/metadata format.
- src/plot/strokes.ts - all stroke geometry (passes, offsets, hatch, tiny guard).
- src/core/layout.ts - two-pass normalize pipeline + autoLevels.
- tests/plot.spec.ts - the 8 acceptance criteria + degenerate-area regression.
- PLOTTING.md - operator-facing pen mapping and vpype workflow.
- .worklogs/2026-06-12-202331-implement-text-dither-app.md - base app backstory.

## Next Steps / Continuation Plan
1. Push to main; CI and Pages deploy run automatically - confirm both green and the live site shows the Plotter sidebar section.
2. Physical test plot: run a real export through npm-script vpype pass and plot on an AxiDraw to validate pen mapping tables in PLOTTING.md.
3. Possible polish: per-profile pen width control in the UI (currently fixed at 0.3 mm per profile constants).
