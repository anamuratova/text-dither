import type { Glyph } from '../core/types';
import type { Band } from './bands';
import { glyphPolylines, HERSHEY_UNITS_PER_EM, type Polyline } from './hershey';

// fixed 30-degree offset direction for multi-pass strokes
const OFF_X = Math.cos(Math.PI / 6);
const OFF_Y = Math.sin(Math.PI / 6);

export function glyphStrokes(g: Glyph, band: Band, penWidthMm: number, pxPerMm: number): Polyline[] {
  const s = g.fontSize / HERSHEY_UNITS_PER_EM;
  const cos = Math.cos(g.rot);
  const sin = Math.sin(g.rot);

  const base: Polyline[] = glyphPolylines(g.ch).map((pl) => ({
    pts: pl.pts.map(([hx, hy]): [number, number] => {
      const x = hx * s;
      const y = hy * s;
      return [g.x + x * cos - y * sin, g.y + x * sin + y * cos];
    }),
  }));
  if (base.length === 0) return [];

  // minimum feature guard: overstroking tiny glyphs destroys legibility
  const tiny = g.fontSize / pxPerMm < 1.6;
  const passes = tiny ? 1 : band.passes;
  const hatch = tiny ? false : band.hatch;

  const out: Polyline[] = [];
  for (let k = 0; k < passes; k++) {
    // offset "perpendicular-ish" along a fixed 30-degree direction: cheap,
    // deterministic, visually equivalent to true parallel offsetting at
    // sub-0.2 mm magnitudes (spec 12.3 - do NOT implement polygon offsetting)
    const d = (k - (passes - 1) / 2) * band.offsetMm * pxPerMm;
    const dx = d * OFF_X;
    const dy = d * OFF_Y;
    for (const pl of base) {
      out.push({ pts: pl.pts.map(([x, y]): [number, number] => [x + dx, y + dy]) });
    }
  }

  if (hatch) {
    // bbox-clip only, no path clipping: at 2-5 mm glyph sizes a 45-degree
    // bbox hatch reads as solid fill (spec 12.3 simplification)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pl of base) {
      for (const [x, y] of pl.pts) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    const shrinkX = (maxX - minX) * 0.08;
    const shrinkY = (maxY - minY) * 0.08;
    minX += shrinkX; maxX -= shrinkX;
    minY += shrinkY; maxY -= shrinkY;
    if (maxX > minX && maxY > minY) {
      const spacing = penWidthMm * 0.9 * pxPerMm;
      // 45-degree lines are y = x + c; c ranges over the box's anti-diagonal
      const cMin = minY - maxX;
      const cMax = maxY - minX;
      for (let c = cMin + spacing; c < cMax; c += spacing) {
        // intersect y = x + c with the rectangle
        const x0 = Math.max(minX, minY - c);
        const x1 = Math.min(maxX, maxY - c);
        if (x1 > x0) {
          out.push({ pts: [[x0, x0 + c], [x1, x1 + c]] });
        }
      }
    }
  }

  return out;
}
