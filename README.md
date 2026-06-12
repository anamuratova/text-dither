# text-dither

Order-preserving typographic halftone. User text is rendered in exact sequential order over an image; each glyph's font-weight, scale, opacity, and rotation follow the local image luminance, so the image emerges while the text stays readable. Character order is immutable - this is not ASCII art.

## Usage

- Drop, paste, or load any image; or click "Demo rose".
- Edit the text and sliders; the canvas re-renders live.
- Export as PNG or SVG.

## Development

```bash
npm ci
npm run dev        # dev server
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
npm run test:e2e   # Playwright (chromium)
npm run build      # production build to dist/
```

Static app, no backend, no runtime network calls. The Inter variable font is bundled in `public/fonts/`. Deployed to GitHub Pages on push to `main`.
