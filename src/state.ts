import type { DitherParams } from './core/types';
import { DEFAULT_PARAMS } from './core/types';

export interface PlotSettings {
  profileName: 'gray-inks' | 'single-pen';
  pageWidthMm: number;   // 100..841
  marginMm: number;
  preview: boolean;
}

export const DEFAULT_PLOT: PlotSettings = {
  profileName: 'gray-inks',
  pageWidthMm: 297,
  marginMm: 10,
  preview: false,
};

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
