export interface Band {
  id: string;            // "b1".."bK"
  min: number;           // dark in (min, max]
  max: number;
  passes: 1 | 2 | 3;
  offsetMm: number;      // parallel offset step between passes
  hatch: boolean;        // hatch-fill heaviest band
  color: string;         // layer stroke color (preview + pen mapping)
  label: string;         // human pen label, e.g. "gray-40" / "black-pass2"
}

export interface PlotProfile {
  name: string;
  penWidthMm: number;
  bands: Band[];
}

// b1.min is stored as 0: the spec's "(cutoff, ...]" lower bound is the runtime
// whiteCutoff, which layout already enforces by dropping dark <= cutoff cells.
export const GRAY_INKS: PlotProfile = {
  name: 'gray-inks',
  penWidthMm: 0.3,
  bands: [
    { id: 'b1', min: 0, max: 0.3, passes: 1, offsetMm: 0, hatch: false, color: '#b9b9b9', label: 'gray-20' },
    { id: 'b2', min: 0.3, max: 0.52, passes: 1, offsetMm: 0, hatch: false, color: '#8a8a8a', label: 'gray-40' },
    { id: 'b3', min: 0.52, max: 0.74, passes: 1, offsetMm: 0, hatch: false, color: '#555555', label: 'gray-70' },
    { id: 'b4', min: 0.74, max: 1, passes: 2, offsetMm: 0.18, hatch: false, color: '#111111', label: 'black' },
  ],
};

export const SINGLE_PEN: PlotProfile = {
  name: 'single-pen',
  penWidthMm: 0.3,
  bands: [
    { id: 'b1', min: 0, max: 0.35, passes: 1, offsetMm: 0, hatch: false, color: '#111111', label: 'black-1pass' },
    { id: 'b2', min: 0.35, max: 0.6, passes: 2, offsetMm: 0.15, hatch: false, color: '#111111', label: 'black-2pass' },
    { id: 'b3', min: 0.6, max: 0.82, passes: 3, offsetMm: 0.18, hatch: false, color: '#111111', label: 'black-3pass' },
    { id: 'b4', min: 0.82, max: 1, passes: 3, offsetMm: 0.18, hatch: true, color: '#111111', label: 'black-hatch' },
  ],
};

export const PROFILES: PlotProfile[] = [GRAY_INKS, SINGLE_PEN];

// null below the first band's lower bound - layout already excludes those
// cells via whiteCutoff; kept as a guard per spec.
export function bandFor(dark: number, profile: PlotProfile): Band | null {
  for (const band of profile.bands) {
    if (dark > band.min && dark <= band.max) return band;
  }
  return null;
}
