import { describe, expect, it } from 'vitest';
import { DEFAULT_PLOT, paperDimensions, type PlotSettings } from '../src/state';

const base: PlotSettings = { ...DEFAULT_PLOT };

describe('paperDimensions', () => {
  it('A-series presets are portrait by default', () => {
    expect(paperDimensions({ ...base, paperSize: 'A4', orientation: 'portrait' })).toEqual({ widthMm: 210, heightMm: 297 });
    expect(paperDimensions({ ...base, paperSize: 'A3', orientation: 'portrait' })).toEqual({ widthMm: 297, heightMm: 420 });
    expect(paperDimensions({ ...base, paperSize: 'A2', orientation: 'portrait' })).toEqual({ widthMm: 420, heightMm: 594 });
    expect(paperDimensions({ ...base, paperSize: 'A1', orientation: 'portrait' })).toEqual({ widthMm: 594, heightMm: 841 });
  });

  it('landscape swaps width and height for presets', () => {
    expect(paperDimensions({ ...base, paperSize: 'A3', orientation: 'landscape' })).toEqual({ widthMm: 420, heightMm: 297 });
  });

  it('custom uses its literal dimensions and ignores orientation', () => {
    const s: PlotSettings = { ...base, paperSize: 'custom', customWidthMm: 500, customHeightMm: 300 };
    expect(paperDimensions({ ...s, orientation: 'portrait' })).toEqual({ widthMm: 500, heightMm: 300 });
    expect(paperDimensions({ ...s, orientation: 'landscape' })).toEqual({ widthMm: 500, heightMm: 300 });
  });
});
