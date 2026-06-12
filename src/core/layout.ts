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

  const { repeat, invert, gamma, sizeResponse, weightResponse, fadeFloor, warp, whiteCutoff } = params;
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

      let lum01 = lum[r * cols + c];
      if (invert) lum01 = 1 - lum01;
      const dark = clamp(1 - lum01, 0, 1) ** gamma;
      if (dark <= whiteCutoff) continue;

      const scale = lerp(1 - sizeResponse * 0.85, 1 + sizeResponse * 0.55, dark);
      const weight = Math.round(clamp(400 + (dark - 0.45) * 2 * 450 * weightResponse, 100, 900));
      const alpha = lerp(fadeFloor, 1, dark);
      const rot = (dark - 0.5) * warp * 0.9 + (hash(idx) - 0.5) * warp * 0.35;
      const yJitter = (hash(idx * 3 + 7) - 0.5) * warp * cellH * 0.35;

      glyphs.push({
        ch,
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
