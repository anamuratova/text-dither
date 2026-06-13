import { XMLValidator } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { computeLayout } from '../src/core/layout';
import type { DitherParams, Glyph } from '../src/core/types';
import { bandFor, GRAY_INKS, SINGLE_PEN } from '../src/plot/bands';
import { glyphPolylines } from '../src/plot/hershey';
import { printableWidthMm, toPlotSVG, type PlotOptions } from '../src/plot/plotSvg';
import { glyphStrokes } from '../src/plot/strokes';

function makeGlyph(over: Partial<Glyph>): Glyph {
  return { ch: 'a', dark: 0.5, x: 200, y: 200, fontSize: 20, weight: 400, alpha: 0.8, rot: 0, ...over };
}

// central placements so glyph extents stay inside the printable area
const CENTRAL: Glyph[] = [
  makeGlyph({ ch: 'a', dark: 0.1, x: 120, y: 120 }),
  makeGlyph({ ch: 'b', dark: 0.4, x: 200, y: 150, rot: 0.2 }),
  makeGlyph({ ch: 'c', dark: 0.65, x: 260, y: 220 }),
  makeGlyph({ ch: 'd', dark: 0.9, x: 180, y: 280 }),
];

const OPTS: PlotOptions = { widthMm: 210, profile: SINGLE_PEN, marginMm: 10 };
const W = 400;
const H = 400;

// printable width 190 mm over 400 px
const PX_PER_MM = W / (OPTS.widthMm - 2 * OPTS.marginMm);

describe('toPlotSVG', () => {
  it('1. no <text>, fill only "none", no opacity/transform, valid XML', () => {
    const svg = toPlotSVG(CENTRAL, W, H, OPTS);
    expect(XMLValidator.validate(svg)).toBe(true);
    expect(svg.includes('<text')).toBe(false);
    expect(svg.includes('opacity')).toBe(false);
    expect(svg.includes('transform')).toBe(false);
    const fills = [...svg.matchAll(/fill="([^"]*)"/g)].map((m) => m[1]);
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((f) => f === 'none')).toBe(true);
  });

  it('2. layer integrity: one layer per populated band, labeled and ordered lightest to darkest', () => {
    // glyphs in b1, b2, b4 only (b3 (0.6, 0.82] left empty)
    const glyphs = [
      makeGlyph({ dark: 0.2, x: 120, y: 120 }),
      makeGlyph({ dark: 0.5, x: 200, y: 200 }),
      makeGlyph({ dark: 0.95, x: 260, y: 260 }),
    ];
    const svg = toPlotSVG(glyphs, W, H, OPTS);
    const layers = [...svg.matchAll(/inkscape:label="([^"]*)" id="([^"]*)"/g)];
    expect(layers.length).toBe(3);
    expect(layers.map((m) => m[2])).toEqual(['b1', 'b2', 'b4']);
    for (const [i, m] of layers.entries()) {
      expect(m[1]).toMatch(/^\d+-/);
      expect(m[1].startsWith(`${i + 1}-`)).toBe(true);
    }
    // lightest first: band order in the document equals profile band order
    const profileOrder = SINGLE_PEN.bands.map((b) => b.id).filter((id) => ['b1', 'b2', 'b4'].includes(id));
    expect(layers.map((m) => m[2])).toEqual(profileOrder);
  });

  it('3. band partition: thresholds exhaustive and non-overlapping over (cutoff, 1]', () => {
    for (const profile of [GRAY_INKS, SINGLE_PEN]) {
      // structural: contiguous chain ending at 1
      for (let i = 1; i < profile.bands.length; i++) {
        expect(profile.bands[i].min).toBe(profile.bands[i - 1].max);
      }
      expect(profile.bands[profile.bands.length - 1].max).toBe(1);
      // ramp: every dark in (0, 1] matches exactly one band
      for (let k = 1; k <= 2000; k++) {
        const dark = k / 2000;
        const matches = profile.bands.filter((b) => dark > b.min && dark <= b.max);
        expect(matches.length).toBe(1);
        expect(bandFor(dark, profile)).toBe(matches[0]);
      }
      expect(bandFor(0, profile)).toBeNull();
    }
    // end-to-end: every glyph from a luminance ramp grid maps to one band
    const cols = 20;
    const rows = 5;
    const lum = new Float32Array(cols * rows);
    for (let p = 0; p < lum.length; p++) lum[p] = p / (lum.length - 1);
    const params: DitherParams = {
      text: 'abcdefghij', repeat: true, invert: false, cellPx: 13, brightness: 0, contrast: 1, gamma: 1.4,
      sizeResponse: 0.7, weightResponse: 1, fadeFloor: 0.14, warp: 0.15,
      whiteCutoff: 0, normalize: false,
    };
    const res = computeLayout(lum, cols, rows, 1240, 500, params);
    expect(res.glyphs.length).toBeGreaterThan(0);
    for (const g of res.glyphs) {
      expect(bandFor(g.dark, SINGLE_PEN)).not.toBeNull();
    }
  });

  it('4. pass count: dark 0.95 single-pen yields 3x the polylines of dark 0.3, hatch separate', () => {
    const g30 = makeGlyph({ dark: 0.3 });
    const g95 = makeGlyph({ dark: 0.95 });
    const s30 = glyphStrokes(g30, bandFor(0.3, SINGLE_PEN)!, SINGLE_PEN.penWidthMm, PX_PER_MM);
    const s95 = glyphStrokes(g95, bandFor(0.95, SINGLE_PEN)!, SINGLE_PEN.penWidthMm, PX_PER_MM);
    const base = glyphPolylines('a').length;
    expect(s30.length).toBe(base);
    const hatchLines = s95.slice(3 * base);
    expect(s95.length - hatchLines.length).toBe(3 * s30.length);
    // hatch asserted separately: present, and every line runs at 45 degrees
    expect(hatchLines.length).toBeGreaterThan(0);
    for (const line of hatchLines) {
      expect(line.pts.length).toBe(2);
      const dx = line.pts[1][0] - line.pts[0][0];
      const dy = line.pts[1][1] - line.pts[0][1];
      expect(dy / dx).toBeCloseTo(1, 6);
    }
  });

  it('5. units: mm dimensions, coordinates within page bounds and margins', () => {
    const svg = toPlotSVG(CENTRAL, W, H, OPTS);
    const width = svg.match(/ width="([0-9.]+)mm"/);
    const height = svg.match(/ height="([0-9.]+)mm"/);
    expect(width).not.toBeNull();
    expect(height).not.toBeNull();
    const pageW = Number(width![1]);
    const pageH = Number(height![1]);
    expect(pageW).toBe(210);
    const coords = [...svg.matchAll(/[ML](-?[0-9.]+) (-?[0-9.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(coords.length).toBeGreaterThan(0);
    for (const [x, y] of coords) {
      expect(x).toBeGreaterThanOrEqual(OPTS.marginMm - 0.01);
      expect(x).toBeLessThanOrEqual(pageW - OPTS.marginMm + 0.01);
      expect(y).toBeGreaterThanOrEqual(OPTS.marginMm - 0.01);
      expect(y).toBeLessThanOrEqual(pageH - OPTS.marginMm + 0.01);
    }
  });

  it('6. tiny-glyph guard: x-height under 1.1 mm forces 1 pass, no hatch', () => {
    // fontSize 3 px / 2.105 px-per-mm = 1.43 mm em (< 1.6) -> x-height < 1.1 mm
    const tiny = makeGlyph({ dark: 0.95, fontSize: 3 });
    const band = bandFor(0.95, SINGLE_PEN)!;
    expect(band.passes).toBe(3);
    expect(band.hatch).toBe(true);
    const strokes = glyphStrokes(tiny, band, SINGLE_PEN.penWidthMm, PX_PER_MM);
    expect(strokes.length).toBe(glyphPolylines('a').length);
  });

  it('7. order preservation: debug indices form the complete layout sequence; absent by default', () => {
    const cols = 8;
    const rows = 4;
    const lum = new Float32Array(cols * rows);
    for (let p = 0; p < lum.length; p++) lum[p] = (p % 7) / 8;
    const params: DitherParams = {
      text: 'order is immutable', repeat: true, invert: false, cellPx: 13, brightness: 0, contrast: 1, gamma: 1.4,
      sizeResponse: 0.7, weightResponse: 1, fadeFloor: 0.14, warp: 0, whiteCutoff: 0, normalize: false,
    };
    const res = computeLayout(lum, cols, rows, 496, 400, params);
    expect(res.glyphs.length).toBeGreaterThan(0);

    const svg = toPlotSVG(res.glyphs, 496, 400, { ...OPTS, widthMm: 400, debugIndices: true });
    const indices = [...svg.matchAll(/data-i="(\d+)"/g)].map((m) => Number(m[1]));
    expect(indices.length).toBe(res.glyphs.length);
    const sorted = [...indices].sort((a, b) => a - b);
    expect(sorted).toEqual(res.glyphs.map((_, i) => i));
    const reassembled = sorted.map((i) => res.glyphs[i].ch).join('');
    expect(reassembled).toBe(res.glyphs.map((g) => g.ch).join(''));

    const plain = toPlotSVG(res.glyphs, 496, 400, { ...OPTS, widthMm: 400 });
    expect(plain.includes('data-i')).toBe(false);
  });

  it('8. determinism: identical inputs produce byte-identical SVG', () => {
    const a = toPlotSVG(CENTRAL, W, H, OPTS);
    const b = toPlotSVG(CENTRAL, W, H, OPTS);
    expect(a).toBe(b);
    const c = toPlotSVG(CENTRAL, W, H, { ...OPTS, profile: GRAY_INKS });
    const d = toPlotSVG(CENTRAL, W, H, { ...OPTS, profile: GRAY_INKS });
    expect(c).toBe(d);
  });

  it('degenerate printable area (margin >= half page width) stays finite and valid', () => {
    expect(printableWidthMm(100, 50)).toBe(1);
    expect(printableWidthMm(100, 60)).toBe(1);
    for (const marginMm of [50, 60]) {
      const svg = toPlotSVG(CENTRAL, W, H, { widthMm: 100, profile: SINGLE_PEN, marginMm });
      expect(XMLValidator.validate(svg)).toBe(true);
      expect(svg.includes('Infinity')).toBe(false);
      expect(svg.includes('NaN')).toBe(false);
      const coords = [...svg.matchAll(/[ML](-?[0-9.]+) (-?[0-9.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(coords.length).toBeGreaterThan(0);
      expect(coords.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    }
  });

  it('metadata comment carries profile, pen, page, thresholds, per-band counts', () => {
    const svg = toPlotSVG(CENTRAL, W, H, OPTS);
    expect(svg).toContain('profile: single-pen');
    expect(svg).toContain('pen: 0.3 mm');
    expect(svg).toContain('page: 210x');
    expect(svg).toContain('b4=(0.82,1]');
    expect(svg).toMatch(/glyphs: b1 \d+ \/ b2 \d+ \/ b3 \d+ \/ b4 \d+/);
  });
});

describe('hershey coverage', () => {
  it('maps ASCII 32-126, falls back to period for unmapped, never throws', () => {
    for (let code = 33; code <= 126; code++) {
      expect(glyphPolylines(String.fromCharCode(code)).length).toBeGreaterThan(0);
    }
    expect(glyphPolylines(' ')).toEqual([]);
    expect(glyphPolylines('é')).toEqual(glyphPolylines('.'));
    expect(glyphPolylines('')).toEqual(glyphPolylines('.'));
  });
});
