export interface DitherParams {
  text: string;
  repeat: boolean;        // default true
  invert: boolean;        // default false
  cellPx: number;         // 7..30, default 13 (display px; renderer multiplies by dpr)
  gamma: number;          // 0.4..3, default 1.4
  sizeResponse: number;   // 0..1, default 0.7
  weightResponse: number; // 0..1, default 1
  fadeFloor: number;      // 0..0.6, default 0.14
  warp: number;           // 0..1, default 0.15
  whiteCutoff: number;    // 0..0.6, default 0
  normalize: boolean;     // default true; auto-levels remap of darks (addendum section 16)
}

export interface Glyph {
  ch: string;
  dark: number;           // 0..1 post-normalization darkness; tonal source for band assignment
  x: number; y: number;   // center position, canvas units
  fontSize: number;
  weight: number;         // 100..900, continuous (variable font), rounded to 1
  alpha: number;          // fadeFloor..1
  rot: number;            // radians
}

export interface LayoutResult {
  glyphs: Glyph[];
  cols: number;
  rows: number;
  consumed: number;       // total characters consumed from text (incl. spaces/cutoff-skipped)
}

export const DEFAULT_PARAMS: DitherParams = {
  text: 'The rose is without why; it blooms because it blooms. It pays no attention to itself, asks not whether it is seen. ',
  repeat: true,
  invert: false,
  cellPx: 13,
  gamma: 1.4,
  sizeResponse: 0.7,
  weightResponse: 1,
  fadeFloor: 0.14,
  warp: 0.15,
  whiteCutoff: 0,
  normalize: true,
};
