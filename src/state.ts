import type { DitherParams } from './core/types';
import { DEFAULT_PARAMS } from './core/types';

type Listener = (params: DitherParams) => void;

export class State {
  private params: DitherParams = { ...DEFAULT_PARAMS };
  private listeners: Listener[] = [];

  get(): DitherParams {
    return this.params;
  }

  set(patch: Partial<DitherParams>): void {
    this.params = { ...this.params, ...patch };
    for (const l of this.listeners) l(this.params);
  }

  subscribe(l: Listener): void {
    this.listeners.push(l);
  }
}
