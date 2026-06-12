# Implement text-dither: order-preserving typographic halftone web app

**Date:** 2026-06-12 19:28
**Task:** Implement /Users/anna/Downloads/TASK-text-dither.md end-to-end: Vite+TS app, core algorithm, UI, tests (Vitest + Playwright), CI + GitHub Pages deploy, full local verification.

## Goal
Working static web app per spec: text rendered in exact sequential order over an image, glyph weight/scale/alpha/rotation modulated by local luminance. All unit + e2e tests green, typecheck green, build green, CI and Pages workflows present.

## Input Information
- Spec: /Users/anna/Downloads/TASK-text-dither.md (complete and authoritative; no prototype.html exists in repo or Downloads).
- Repo currently holds an unrelated minimal node:test scaffold (src/index.js, test/index.test.js) - the spec replaces it entirely.
- Node v26.0.0, npm 11.12.1 available. Spec targets Node 20 for CI; local Node 26 is fine for verification.

## Approach

### Step-by-step plan
1. Remove stub scaffold (src/index.js, test/index.test.js), rewrite package.json for Vite+TS+Vitest+Playwright with scripts: dev, build, preview, typecheck, test, test:e2e.
2. npm install dev deps: vite, typescript, vitest, @playwright/test, fast-xml-parser.
3. Download InterVariable.woff2 from rsms/inter GitHub release zip, commit to public/fonts/.
4. Implement per spec sections, in dependency order:
   - src/core/types.ts (DitherParams, Glyph, LayoutResult)
   - src/core/layout.ts (computeLayout + exported lerp/clamp/hash; exact formulas from spec section 3)
   - src/core/sampler.ts (luminanceGrid, cover fit, module-level cached canvas, willReadFrequently)
   - src/core/rose.ts (makeRose procedural spiral, deterministic)
   - src/render/svg.ts (toSVG, XML escaping, conditional transform)
   - src/render/canvas.ts (dpr-scaled canvas, 1600px long-side cap, font load await, rAF coalescer; caller-side grid derivation: cellH = cellPx * effectiveScale, cellW = cellH*0.62)
   - src/state.ts (params + image source + subscribe)
   - src/ui/controls.ts, src/ui/dropzone.ts (counter-based drag highlight, document-level listeners, preventDefault+stopPropagation on dragover/drop, paste handler)
   - src/main.ts, src/styles.css, index.html
5. @font-face placed inline in index.html with relative url 'fonts/InterVariable.woff2' because Vite does not rebase root-absolute public URLs in CSS when base='./' - relative URL from index.html works in dev, build, and Pages subpath.
6. Tests: tests/layout.spec.ts (8 assertions from spec section 8), tests/svg.spec.ts (fast-xml-parser round-trip), tests/e2e/app.spec.ts (5 Playwright tests).
7. Configs: vite.config.ts (base './', vitest include tests/*.spec.ts excluding e2e), tsconfig.json, playwright.config.ts (chromium, webServer vite dev, strictPort).
8. .github/workflows/ci.yml and deploy.yml per spec section 9.
9. Verify: npm ci, npm run typecheck, npm test, npx playwright install chromium, npm run test:e2e, npm run build, preview smoke test.
10. Adversarial review: background agent compares implementation against the original spec file, finds gaps; fix until clean.
11. Worklog, commit.

### Key decisions
- **Implement inline rather than delegating files to agents:** the modules are tightly coupled (types -> layout -> render -> ui -> tests pin exact formulas). Splitting across context-free agents risks formula drift; spec section 10 forbids changing constants. Adversarial review still delegated.
- **Font via index.html inline @font-face:** avoids Vite relative-base limitation for public assets referenced from CSS.
  - Alternatives: import font as module asset (spec mandates public/fonts/ layout - rejected); absolute /fonts URL in styles.css (breaks on Pages subpath - rejected).
- **E2E test PNG generated in-browser:** page.evaluate canvas.toDataURL -> Buffer for setInputFiles. No binary fixtures committed, no network.
- **Playwright webServer = vite dev with strictPort:** simplest; CI runs build separately so e2e on dev server is acceptable and faster.

## Risks & Edge Cases
- Font rendering in headless chromium: document.fonts.load must resolve before first paint; e2e non-blank assertion tolerates any glyph rendering.
- rAF coalescing vs e2e timing: tests poll pixel hash with expect.poll instead of fixed sleeps.
- Inter release asset layout may change; verify the woff2 exists after unzip.
- text.replace(/\s+/g,' ') does not trim; a single-space text consumes cells drawing nothing - spec-literal behavior, kept.

## Files to Modify
- Delete: src/index.js, test/index.test.js, test/ dir
- New: everything in spec section 1 layout
- Update: package.json, README.md, .gitignore
