import { describe, expect, it } from 'vitest';
import { coverRect } from '../src/core/sampler';

describe('coverRect', () => {
  it('non-square cells with matching physical aspect fill the buffer (no crop)', () => {
    // square image, square canvas, but narrow cells -> 32 cols x 20 rows.
    // The OLD cell-space cover-fit cropped: scale=max(32/100,20/100)=0.32 ->
    // drawn 32x32 into a 32x20 buffer, keeping the middle 62% vertically.
    // The fix must fill the buffer exactly because the canvas matches the image.
    const r = coverRect(32, 20, 200, 200, 100, 100);
    expect(r.dw).toBeCloseTo(32, 6);
    expect(r.dh).toBeCloseTo(20, 6);
    expect(r.dx).toBeCloseTo(0, 6);
    expect(r.dy).toBeCloseTo(0, 6);
  });

  it('square cells, matching aspect fill exactly', () => {
    const r = coverRect(20, 20, 200, 200, 100, 100);
    expect(r.dw).toBeCloseTo(20, 6);
    expect(r.dh).toBeCloseTo(20, 6);
  });

  it('covers the overflow axis when physical aspect differs from the source', () => {
    // wide canvas (2:1), square source -> fill width, crop height (cover)
    const r = coverRect(40, 20, 400, 200, 100, 100);
    expect(r.dw).toBeCloseTo(40, 6); // fills width
    expect(r.dh).toBeCloseTo(40, 6); // overflows height -> cropped
    expect(r.dx).toBeCloseTo(0, 6);
    expect(r.dy).toBeCloseTo(-10, 6); // centered crop
  });

  it('tall source into square canvas crops height', () => {
    const r = coverRect(20, 20, 200, 200, 100, 200);
    expect(r.dw).toBeCloseTo(20, 6); // fills width
    expect(r.dh).toBeCloseTo(40, 6); // overflows height -> cropped
    expect(r.dx).toBeCloseTo(0, 6);
    expect(r.dy).toBeCloseTo(-10, 6); // centered crop
  });
});
