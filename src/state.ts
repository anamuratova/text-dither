import type { DitherParams } from './core/types';
import { DEFAULT_PARAMS } from './core/types';

export type PaperSize = 'A4' | 'A3' | 'A2' | 'A1' | 'custom';
export type Orientation = 'portrait' | 'landscape';
export type ZoomMode = 'fit' | 'actual';

export interface PlotSettings {
  profileName: 'gray-inks' | 'single-pen';
  paperSize: PaperSize;
  orientation: Orientation;
  customWidthMm: number;
  customHeightMm: number;
  marginMm: number;
  preview: boolean;
  zoom: ZoomMode;
}

export const DEFAULT_PLOT: PlotSettings = {
  profileName: 'gray-inks',
  paperSize: 'A4',
  orientation: 'portrait',
  customWidthMm: 297,
  customHeightMm: 210,
  marginMm: 10,
  preview: false,
  zoom: 'fit',
};

// ISO A-series portrait dimensions in mm.
const A_SERIES: Record<Exclude<PaperSize, 'custom'>, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
};

export function paperDimensions(s: PlotSettings): { widthMm: number; heightMm: number } {
  if (s.paperSize === 'custom') {
    return { widthMm: s.customWidthMm, heightMm: s.customHeightMm };
  }
  const [w, h] = A_SERIES[s.paperSize];
  return s.orientation === 'landscape' ? { widthMm: h, heightMm: w } : { widthMm: w, heightMm: h };
}

type Listener = () => void;

export class State {
  private params: DitherParams = { ...DEFAULT_PARAMS };
  private plot: PlotSettings = { ...DEFAULT_PLOT };
  private listeners: Listener[] = [];

  get(): DitherParams {
    return this.params;
  }

  set(patch: Partial<DitherParams>): void {
    this.params = { ...this.params, ...patch };
    this.notify();
  }

  getPlot(): PlotSettings {
    return this.plot;
  }

  setPlot(patch: Partial<PlotSettings>): void {
    this.plot = { ...this.plot, ...patch };
    this.notify();
  }

  subscribe(l: Listener): void {
    this.listeners.push(l);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}
