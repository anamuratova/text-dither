import type { DitherParams, Glyph, LayoutResult } from './types';

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Deterministic per-index hash in [0, 1). No Math.random in core.
export function hash(i: number): number {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

// lo = 2nd percentile, hi = max(98th percentile, lo + 1e-6) (addendum section 16)
export function autoLevels(darks: Float32Array): [lo: number, hi: number] {
  if (darks.length === 0) return [0, 1];
  const sorted = Float32Array.from(darks).sort();
  const lo = sorted[Math.floor(0.02 * (sorted.length - 1))];
  const hi = Math.max(sorted[Math.floor(0.98 * (sorted.length - 1))], lo + 1e-6);
  return [lo, hi];
}

export function computeLayout(
  lum: Float32Array,
  cols: number,
  rows: number,
  width: number,
  height: number,
  params: DitherParams,
): LayoutResult {
  const cellW = width / cols;
  const cellH = height / rows;

  const text = params.text.replace(/\s+/g, ' ');
  if (text.length === 0) {
    return { glyphs: [], cols, rows, consumed: 0 };
  }

  const { repeat, invert, brightness, contrast, gamma, sizeResponse, weightResponse, fadeFloor, warp, whiteCutoff } =
    params;

  // first pass: raw darkness for every cell, then optional auto-levels remap.
  // brightness/contrast adjust the image luminance (around mid-gray) before
  // invert and the gamma tone curve.
  const darks = new Float32Array(cols * rows);
  for (let p = 0; p < darks.length; p++) {
    const v = clamp((lum[p] - 0.5) * contrast + 0.5 + brightness, 0, 1);
    const lum01 = invert ? 1 - v : v;
    darks[p] = clamp(1 - lum01, 0, 1) ** gamma;
  }
  if (params.normalize) {
    const [lo, hi] = autoLevels(darks);
    for (let p = 0; p < darks.length; p++) {
      darks[p] = clamp((darks[p] - lo) / (hi - lo), 0, 1);
    }
  }

  const glyphs: Glyph[] = [];
  let i = 0;

  outer:
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!repeat && i >= text.length) break outer;
      const ch = text[i % text.length];
      const idx = i;
      i++;

      if (ch === ' ') continue;

      const dark = darks[r * cols + c];
      if (dark <= whiteCutoff) continue;

      const scale = lerp(1 - sizeResponse * 0.85, 1 + sizeResponse * 0.55, dark);
      const weight = Math.round(clamp(400 + (dark - 0.45) * 2 * 450 * weightResponse, 100, 900));
      const alpha = lerp(fadeFloor, 1, dark);
      const rot = (dark - 0.5) * warp * 0.9 + (hash(idx) - 0.5) * warp * 0.35;
      const yJitter = (hash(idx * 3 + 7) - 0.5) * warp * cellH * 0.35;

      glyphs.push({
        ch,
        dark,
        x: (c + 0.5) * cellW,
        y: (r + 0.62) * cellH + yJitter,
        fontSize: cellH * 0.95 * scale,
        weight,
        alpha,
        rot,
      });
    }
  }

  return { glyphs, cols, rows, consumed: i };
}
