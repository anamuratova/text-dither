# Plotting guide

The "Save plot SVG" button exports a stroke-only, layered SVG in physical mm units: one layer per tonal band, single-stroke Hershey glyphs, no text elements, no fills, no transforms. It loads directly into Inkscape, vpype, and AxiDraw layer-control tooling.

## Post-processing with vpype

Always run the export through [vpype](https://github.com/abey79/vpype) before plotting - it merges touching segments, orders pen travel, and simplifies dense polylines:

```bash
vpype read plot.svg \
  linemerge --tolerance 0.05mm \
  linesort \
  linesimplify --tolerance 0.02mm \
  write --page-size a3 --center plot-optimized.svg
```

A ready-made example is wired up as an npm script (uses the committed fixture `examples/plot-example.svg`):

```bash
npm run optimize:example
```

Notes:

- `occult` is unnecessary - the export contains no fills, only strokes.
- `reloop` helps on hatch-heavy plots (the `single-pen` profile's b4 band): it randomizes loop seam points so pen-down artifacts spread out instead of accumulating on one edge.
- Layer structure survives vpype (`read` is layer-aware via `inkscape:label`); AxiDraw layer control reads the leading number in each label.

## Pen mapping

Plot order = layer order in the file: lightest ink first, darkest last, so later passes overprint cleanly.

### Profile `gray-inks` (4 pens, one pass each except black)

Suggested pens: 0.3 mm fineliner gray set (Sakura Pigma Micron or Copic Multiliner, cool grays).

| layer | label | color | passes | physical pen |
|---|---|---|---|---|
| 1 | `1-gray-20` | `#b9b9b9` | 1 | 20% gray 0.3 mm |
| 2 | `2-gray-40` | `#8a8a8a` | 1 | 40% gray 0.3 mm |
| 3 | `3-gray-70` | `#555555` | 1 | 70% gray 0.3 mm |
| 4 | `4-black` | `#111111` | 2 (0.18 mm offset) | black 0.3 mm |

### Profile `single-pen` (one black pen, tone from passes + hatch)

Suggested pen: black 0.3 mm fineliner.

| layer | label | passes | hatch | what it encodes |
|---|---|---|---|---|
| 1 | `1-black-1pass` | 1 | no | light tone |
| 2 | `2-black-2pass` | 2 (0.15 mm offset) | no | mid tone |
| 3 | `3-black-3pass` | 3 (0.18 mm offset) | no | dark tone |
| 4 | `4-black-hatch` | 3 (0.18 mm offset) | 45 deg | darkest band, reads as solid |

With a single pen there is no ink change between layers - plot them in file order anyway; the multi-pass layers benefit from the earlier passes settling first.

## Page setup

- Page width is set in the app (default 297 mm = A4/A3 long side); height follows the image aspect.
- Default margin is 10 mm on all sides; the image maps to the printable area inside it.
- Tiny glyphs (em under ~1.6 mm) are automatically forced to a single pass with no hatch - overstroking at that size destroys legibility.
