import { describe, expect, it } from 'vitest';
import { autoLevels, clamp, computeLayout, hash, lerp } from '../src/core/layout';
import type { DitherParams } from '../src/core/types';

const BASE: DitherParams = {
  text: 'abc def',
  repeat: false,
  invert: false,
  cellPx: 13,
  gamma: 1.4,
  sizeResponse: 0.7,
  weightResponse: 1,
  fadeFloor: 0.14,
  warp: 0.15,
  whiteCutoff: 0,
  normalize: false, // criteria 1-8 pin raw section-3 behavior; auto-levels tested separately
};

function grid(cols: number, rows: number, fill: number): Float32Array {
  return new Float32Array(cols * rows).fill(fill);
}

describe('helpers', () => {
  it('clamp, lerp, hash behave', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(hash(42)).toBe(hash(42));
    expect(hash(1)).toBeGreaterThanOrEqual(0);
    expect(hash(1)).toBeLessThan(1);
  });
});

describe('computeLayout', () => {
  it('1. order preservation: sequential characters in row-major order', () => {
    const cols = 4;
    const rows = 2;
    const params = { ...BASE, text: 'abc def', repeat: false, whiteCutoff: 0, warp: 0 };
    const res = computeLayout(grid(cols, rows, 0.5), cols, rows, 400, 200, params);
    expect(res.glyphs.map((g) => g.ch).join('')).toBe('abcdef');
    for (let i = 1; i < res.glyphs.length; i++) {
      const prev = res.glyphs[i - 1];
      const cur = res.glyphs[i];
      expect(cur.y).toBeGreaterThanOrEqual(prev.y);
      if (cur.y === prev.y) expect(cur.x).toBeGreaterThan(prev.x);
    }
  });

  it('2. exact consumption: repeat=false, text shorter than grid', () => {
    const cols = 10;
    const rows = 10;
    const params = { ...BASE, text: 'abc def', repeat: false };
    const res = computeLayout(grid(cols, rows, 0.5), cols, rows, 620, 1000, params);
    expect(res.consumed).toBe('abc def'.length);
    expect(res.glyphs.length).toBe('abc def'.replace(/ /g, '').length);
  });

  it('3. repeat: consumed equals cell count', () => {
    const cols = 5;
    const rows = 4;
    const params = { ...BASE, repeat: true };
    const res = computeLayout(grid(cols, rows, 0.5), cols, rows, 310, 400, params);
    expect(res.consumed).toBe(cols * rows);
  });

  it('4. cutoff consumes: white cells skipped but still counted', () => {
    const cols = 4;
    const rows = 2;
    const lum = grid(cols, rows, 0.2);
    for (let c = 0; c < cols; c++) lum[c] = 1; // first row white
    const params = { ...BASE, text: 'abcd', repeat: true, whiteCutoff: 0.05 };
    const res = computeLayout(lum, cols, rows, 248, 200, params);
    expect(res.glyphs.length).toBe(4); // only the non-white second row
    expect(res.consumed).toBe(cols * rows);
  });

  it('5. monotonicity: darker cell gets strictly greater weight, fontSize, alpha', () => {
    const params = { ...BASE, text: 'aa', repeat: true, warp: 0 };
    const lum = Float32Array.from([0.2, 0.8]);
    const res = computeLayout(lum, 2, 1, 124, 100, params);
    expect(res.glyphs.length).toBe(2);
    const [darker, lighter] = res.glyphs;
    expect(darker.weight).toBeGreaterThan(lighter.weight);
    expect(darker.fontSize).toBeGreaterThan(lighter.fontSize);
    expect(darker.alpha).toBeGreaterThan(lighter.alpha);
  });

  it('6. bounds hold for 1000 random luminance values', () => {
    const cols = 50;
    const rows = 20;
    const lum = new Float32Array(cols * rows);
    let seed = 1;
    for (let i = 0; i < lum.length; i++) {
      seed = (seed * 48271) % 2147483647; // deterministic LCG
      lum[i] = seed / 2147483647;
    }
    const params = { ...BASE, text: 'abcdefghij', repeat: true };
    const res = computeLayout(lum, cols, rows, 3100, 2000, params);
    expect(res.glyphs.length).toBeGreaterThan(0);
    for (const g of res.glyphs) {
      expect(g.weight).toBeGreaterThanOrEqual(100);
      expect(g.weight).toBeLessThanOrEqual(900);
      expect(g.alpha).toBeGreaterThanOrEqual(params.fadeFloor);
      expect(g.alpha).toBeLessThanOrEqual(1);
      expect(g.fontSize).toBeGreaterThan(0);
    }
  });

  it('7. invert swaps the monotonicity comparison', () => {
    const params = { ...BASE, text: 'aa', repeat: true, warp: 0, invert: true };
    const lum = Float32Array.from([0.2, 0.8]);
    const res = computeLayout(lum, 2, 1, 124, 100, params);
    expect(res.glyphs.length).toBe(2);
    const [first, second] = res.glyphs; // lum 0.8 now reads as dark
    expect(second.weight).toBeGreaterThan(first.weight);
    expect(second.fontSize).toBeGreaterThan(first.fontSize);
    expect(second.alpha).toBeGreaterThan(first.alpha);
  });

  it('8. determinism: identical inputs produce deeply-equal results', () => {
    const cols = 8;
    const rows = 6;
    const lum = grid(cols, rows, 0.37);
    const params = { ...BASE, text: 'the quick brown fox', repeat: true };
    const a = computeLayout(lum, cols, rows, 496, 600, params);
    const b = computeLayout(lum, cols, rows, 496, 600, params);
    expect(a).toEqual(b);
  });

  it('empty text returns empty result', () => {
    const res = computeLayout(grid(2, 2, 0.5), 2, 2, 100, 100, { ...BASE, text: '' });
    expect(res.glyphs).toEqual([]);
    expect(res.consumed).toBe(0);
  });
});

describe('auto-levels (addendum section 16)', () => {
  it('autoLevels returns 2nd/98th percentiles with a degenerate-range guard', () => {
    const darks = new Float32Array(100);
    for (let i = 0; i < 100; i++) darks[i] = i / 99;
    const [lo, hi] = autoLevels(darks);
    expect(lo).toBeCloseTo(0.0101, 3);
    expect(hi).toBeCloseTo(0.9797, 3);
    const [clo, chi] = autoLevels(new Float32Array(50).fill(0.4));
    expect(chi).toBeGreaterThan(clo);
    expect(chi - clo).toBeCloseTo(1e-6, 9);
  });

  it('(a) raw darks spanning only [0, 0.6] populate the top band when normalize=true', () => {
    const cols = 20;
    const rows = 5;
    const lum = new Float32Array(cols * rows);
    // gamma=1 makes dark = 1 - lum; lum in [0.4, 1] => raw dark in [0, 0.6]
    for (let p = 0; p < lum.length; p++) lum[p] = 0.4 + 0.6 * (p / (lum.length - 1));
    const params = { ...BASE, text: 'abcdefghij', repeat: true, gamma: 1, normalize: true };
    const res = computeLayout(lum, cols, rows, 1240, 500, params);
    const maxDark = Math.max(...res.glyphs.map((g) => g.dark));
    expect(maxDark).toBeGreaterThan(0.82); // reaches the heaviest band of both profiles
  });

  it('(b) normalize=false reproduces raw section-3 darkness exactly', () => {
    const lum = Float32Array.from([0.3, 0.85]);
    const params = { ...BASE, text: 'ab', repeat: true, normalize: false };
    const res = computeLayout(lum, 2, 1, 124, 100, params);
    expect(res.glyphs[0].dark).toBeCloseTo(0.7 ** 1.4, 6);
    expect(res.glyphs[1].dark).toBeCloseTo(0.15 ** 1.4, 6);
  });

  it('(c) constant-luminance grid does not divide by zero', () => {
    const params = { ...BASE, text: 'abcd', repeat: true, normalize: true };
    const res = computeLayout(grid(4, 4, 0.5), 4, 4, 248, 400, params);
    // degenerate range remaps every dark to exactly 0 (not NaN), so with
    // whiteCutoff=0 every cell is consumed but none is drawn
    expect(res.consumed).toBe(16);
    expect(res.glyphs.length).toBe(0);
  });
});
