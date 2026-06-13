import type { DitherParams } from '../core/types';
import type { State } from '../state';

export interface ControlActions {
  onFile: (file: File) => void;
  onDemoRose: () => void;
  onSavePNG: () => void;
  onSaveSVG: () => void;
  onSavePlotSVG: () => void;
}

interface SliderDef {
  key: keyof DitherParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'cellPx', label: 'cell size', min: 7, max: 30, step: 1 },
  { key: 'brightness', label: 'brightness', min: -1, max: 1, step: 0.01 },
  { key: 'contrast', label: 'contrast', min: 0, max: 2, step: 0.01 },
  { key: 'gamma', label: 'gamma', min: 0.4, max: 3, step: 0.01 },
  { key: 'sizeResponse', label: 'size response', min: 0, max: 1, step: 0.01 },
  { key: 'weightResponse', label: 'weight response', min: 0, max: 1, step: 0.01 },
  { key: 'fadeFloor', label: 'fade floor', min: 0, max: 0.6, step: 0.01 },
  { key: 'warp', label: 'warp', min: 0, max: 1, step: 0.01 },
  { key: 'whiteCutoff', label: 'white cutoff', min: 0, max: 0.6, step: 0.01 },
];

export function buildControls(root: HTMLElement, state: State, actions: ControlActions): void {
  const params = state.get();

  const title = document.createElement('h1');
  title.textContent = 'text-dither';
  root.appendChild(title);

  const textarea = document.createElement('textarea');
  textarea.id = 'text-input';
  textarea.rows = 5;
  textarea.value = params.text;
  textarea.addEventListener('input', () => state.set({ text: textarea.value }));
  root.appendChild(field('text', textarea));

  for (const checkbox of [
    { key: 'repeat' as const, label: 'repeat text' },
    { key: 'invert' as const, label: 'invert image' },
    { key: 'normalize' as const, label: 'auto levels' },
  ]) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `chk-${checkbox.key}`;
    input.checked = params[checkbox.key];
    input.addEventListener('change', () => state.set({ [checkbox.key]: input.checked }));
    const label = document.createElement('label');
    label.className = 'check-row';
    label.append(input, document.createTextNode(checkbox.label));
    root.appendChild(label);
  }

  for (const def of SLIDERS) {
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `slider-${def.key}`;
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(params[def.key]);
    const readout = document.createElement('span');
    readout.className = 'readout';
    readout.textContent = String(params[def.key]);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      readout.textContent = String(v);
      state.set({ [def.key]: v });
    });
    const row = field(def.label, input);
    row.querySelector('.label')?.appendChild(readout);
    root.appendChild(row);
  }

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.id = 'file-input';
  fileInput.hidden = true;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) actions.onFile(file);
    fileInput.value = '';
  });
  root.appendChild(fileInput);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.append(
    button('Load image', 'btn-load', () => fileInput.click()),
    button('Demo rose', 'btn-rose', actions.onDemoRose),
    button('Save PNG', 'btn-png', actions.onSavePNG),
    button('Save SVG', 'btn-svg', actions.onSaveSVG),
  );
  root.appendChild(buttons);

  buildPlotterSection(root, state, actions);
}

function buildPlotterSection(root: HTMLElement, state: State, actions: ControlActions): void {
  const plot = state.getPlot();

  const heading = document.createElement('h2');
  heading.textContent = 'Plotter';
  root.appendChild(heading);

  const select = document.createElement('select');
  select.id = 'plot-profile';
  for (const name of ['gray-inks', 'single-pen'] as const) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.value = plot.profileName;
  select.addEventListener('change', () =>
    state.setPlot({ profileName: select.value as 'gray-inks' | 'single-pen' }),
  );
  root.appendChild(field('profile', select));

  for (const def of [
    { key: 'pageWidthMm' as const, label: 'page width mm', min: 100, max: 841, id: 'plot-width' },
    { key: 'marginMm' as const, label: 'margin mm', min: 0, max: 100, id: 'plot-margin' },
  ]) {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = def.id;
    input.min = String(def.min);
    input.max = String(def.max);
    input.value = String(plot[def.key]);
    input.addEventListener('change', () => {
      const v = Math.min(def.max, Math.max(def.min, Number(input.value) || def.min));
      input.value = String(v);
      state.setPlot({ [def.key]: v });
    });
    root.appendChild(field(def.label, input));
  }

  const previewInput = document.createElement('input');
  previewInput.type = 'checkbox';
  previewInput.id = 'chk-plot-preview';
  previewInput.checked = plot.preview;
  previewInput.addEventListener('change', () => state.setPlot({ preview: previewInput.checked }));
  const previewLabel = document.createElement('label');
  previewLabel.className = 'check-row';
  previewLabel.append(previewInput, document.createTextNode('plot preview'));
  root.appendChild(previewLabel);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.append(button('Save plot SVG', 'btn-plot-svg', actions.onSavePlotSVG));
  root.appendChild(buttons);

  const stats = document.createElement('div');
  stats.id = 'plot-stats';
  stats.className = 'stats';
  root.appendChild(stats);
}

function field(labelText: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}

function button(text: string, id: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = id;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
