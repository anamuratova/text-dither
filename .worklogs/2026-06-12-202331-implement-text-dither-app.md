# Implement text-dither: order-preserving typographic halftone app

**Date:** 2026-06-12 20:23
**Scope:** Entire repo - replaced the node:test stub scaffold with the full Vite+TS app per spec: index.html, package.json, vite.config.ts, tsconfig.json, playwright.config.ts, public/fonts/, src/ (core, render, ui, state, main, styles), tests/ (unit + e2e), .github/workflows/, README.md, .gitignore.

## Summary
Implemented /Users/anna/Downloads/TASK-text-dither.md end-to-end: core layout algorithm, luminance sampler, procedural rose demo, canvas + SVG renderers, controls/dropzone UI, 12 Vitest unit tests, 5 Playwright e2e tests, CI and GitHub Pages deploy workflows. All verification commands green locally; adversarial spec review returned no findings.

## Context & Problem
Spec describes a static web app that renders user text in exact sequential order over an image, modulating glyph weight/scale/alpha/rotation by local luminance. No prototype.html existed, so the spec was the sole source. The repo previously held an unrelated minimal JS scaffold (see .worklogs/2026-06-12-192503-scaffold-js-repo.md), which this work replaces entirely.

## Decisions Made

### Implemented inline rather than delegating modules to subagents
- **Chose:** Single-pass inline implementation, with a delegated adversarial review at the end.
- **Why:** Modules are tightly coupled and the spec pins exact formulas (section 10 forbids constant drift); context-free agents risk formula divergence.
- **Alternatives considered:**
  - Per-module agent fan-out - rejected, high drift risk for pinned constants.

### @font-face inline in index.html with relative URL
- **Chose:** Font declared in an inline <style> in index.html as url('fonts/InterVariable.woff2').
- **Why:** Vite does not rebase root-absolute public-asset URLs inside bundled CSS when base is './'; an absolute /fonts path would 404 on a GitHub Pages subpath. A relative URL from index.html works in dev, build, and Pages.
- **Alternatives considered:**
  - url('/fonts/...') in src/styles.css - rejected, breaks under Pages subpath.
  - Importing the font as a module asset - rejected, spec mandates public/fonts/ layout.

### Playwright webServer runs vite build + vite preview, not vite dev
- **Chose:** webServer command 'vite build && vite preview --port 4173 --strictPort'.
- **Why:** First e2e run against a cold dev server failed 4/5 tests with a permanently blank canvas; a static preview server removes on-the-fly transform variability and tests the production bundle. Also fixed the underlying robustness bug (next decision).
- **Alternatives considered:**
  - vite dev with warmup - rejected, does not remove the variability and tests non-production code.

### ensureFont() recovers from a failed font load
- **Chose:** document.fonts.load(...).catch() clears the cached promise so a later render retries; ctx.font falls back to default sans meanwhile.
- **Why:** The original version cached a rejected promise forever and draw() awaited it without a failure path - one failed font fetch killed all rendering for the page lifetime. This is the architectural fix for the blank-canvas e2e failure.
- **Alternatives considered:**
  - Swallowing the await with try/catch in draw() only - rejected, would never retry the font.

### E2E test images generated in-browser
- **Chose:** Tests build PNGs via canvas.toDataURL inside page.evaluate (gradient for file-input test, half-black for drop test).
- **Why:** No binary fixtures in the repo, no network, deterministic, distinct from the rose so pixel-hash comparisons are meaningful.

### Defaults holder DEFAULT_PARAMS lives in core/types.ts
- **Chose:** Exported constant beside the interface; UI ranges (min/max/step) live in controls.ts SLIDERS table.
- **Why:** Spec gives defaults as comments on DitherParams; one source of truth next to the type.

## Architectural Notes
- src/core/ is pure (no DOM except sampler/rose which need canvas; layout.ts itself is DOM-free) and deterministic - hash() is a sine-fract hash, no Math.random anywhere in src/core or src/render.
- Grid derivation is split per spec: the renderer (caller) computes cellH = cellPx * effectiveScale (internal px / display px, which embeds both the dpr cap of 2 and the 1600 px long-side cap), cellW = cellH * 0.62, cols/rows by floor; computeLayout recomputes cellW/cellH as width/cols and height/rows so glyphs fill edge-to-edge.
- Rendering is coalesced through one requestAnimationFrame id in CanvasRenderer.render(); state changes always store the latest params before scheduling, so the frame draws the newest state.
- CanvasRenderer exposes lastLayout/lastWidth/lastHeight so Save SVG reuses the exact rendered layout instead of recomputing.
- The canvas dispatches a 'rendered' CustomEvent after each draw (currently unused by tests, available for future hooks).
- Dropzone uses a document-level depth counter for dragenter/dragleave so the overlay does not flicker over children; paste shares the same file-extraction path.

## Information Sources
- Spec: /Users/anna/Downloads/TASK-text-dither.md (authoritative; no prototype.html existed).
- Font: InterVariable.woff2 from rsms/inter GitHub release v4.1 zip (web/InterVariable.woff2), committed to public/fonts/.
- Plan: .plans/2026-06-12-192835-implement-text-dither-app.md
- Prior worklog: .worklogs/2026-06-12-192503-scaffold-js-repo.md (replaced scaffold).

## Open Questions / Future Considerations
- No GitHub remote is configured; deploy.yml will only take effect once the repo is pushed to GitHub and Pages is set to "GitHub Actions" as the source.
- Local Node is v26 while CI pins Node 20; all tooling (vite 8, vitest 4, playwright 1.60, typescript 6) supports both.
- The 'rendered' CustomEvent on the canvas is unused; remove or use if it stays dead weight.

## Key Files for Context
- /Users/anna/Downloads/TASK-text-dither.md - the authoritative spec; read first.
- src/core/layout.ts - the core algorithm; all formulas pinned by spec section 3 and tests.
- src/render/canvas.ts - sizing/grid derivation, font loading, rAF coalescing.
- src/main.ts - wiring of state, renderer, controls, dropzone, exports.
- tests/layout.spec.ts - the 8 acceptance criteria pinning algorithm behavior.
- tests/e2e/app.spec.ts - browser-level acceptance criteria 10-14.
- .plans/2026-06-12-192835-implement-text-dither-app.md - implementation plan and decision log.

## Next Steps / Continuation Plan
1. Create a GitHub repo and push main (gh repo create), then enable Pages with source "GitHub Actions" - deploy.yml takes over from there.
2. Verify the first CI run is green on GitHub (Node 20, ubuntu, headless chromium).
3. Optional polish: mobile layout (sidebar collapses), drag-resize for the canvas column.
