import './styles.css';
import { makeRose } from './core/rose';
import { bandFor, GRAY_INKS, SINGLE_PEN, type PlotProfile } from './plot/bands';
import { toPlotSVG } from './plot/plotSvg';
import { CanvasRenderer, type ImageSource, type PlotPreview } from './render/canvas';
import { toSVG } from './render/svg';
import { State } from './state';
import { buildControls } from './ui/controls';
import { initDropzone } from './ui/dropzone';

async function decodeFile(file: File): Promise<ImageSource> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const controlsRoot = document.querySelector<HTMLElement>('#controls');
if (!canvas || !controlsRoot) throw new Error('missing app shell');

const renderer = new CanvasRenderer(canvas);
const state = new State();

function activeProfile(): PlotProfile {
  return state.getPlot().profileName === 'single-pen' ? SINGLE_PEN : GRAY_INKS;
}

function plotPreview(): PlotPreview | null {
  const plot = state.getPlot();
  if (!plot.preview) return null;
  return { profile: activeProfile(), pageWidthMm: plot.pageWidthMm, marginMm: plot.marginMm };
}

const rerender = () => renderer.render(state.get(), plotPreview());
state.subscribe(rerender);

async function loadFile(file: File): Promise<void> {
  renderer.setSource(await decodeFile(file));
  rerender();
}

buildControls(controlsRoot, state, {
  onFile: (file) => void loadFile(file),
  onDemoRose: () => {
    renderer.setSource(makeRose());
    rerender();
  },
  onSavePNG: () => {
    canvas.toBlob((blob) => {
      if (blob) download(blob, 'text-dither.png');
    }, 'image/png');
  },
  onSaveSVG: () => {
    const layout = renderer.lastLayout;
    if (!layout) return;
    const svg = toSVG(layout.glyphs, renderer.lastWidth, renderer.lastHeight);
    download(new Blob([svg], { type: 'image/svg+xml' }), 'text-dither.svg');
  },
  onSavePlotSVG: () => {
    const layout = renderer.lastLayout;
    if (!layout) return;
    const plot = state.getPlot();
    const profile = activeProfile();
    const svg = toPlotSVG(layout.glyphs, renderer.lastWidth, renderer.lastHeight, {
      widthMm: plot.pageWidthMm,
      profile,
      marginMm: plot.marginMm,
    });
    download(new Blob([svg], { type: 'image/svg+xml' }), 'text-dither-plot.svg');

    const counts = new Map<string, number>();
    for (const g of layout.glyphs) {
      const band = bandFor(g.dark, profile);
      if (band) counts.set(band.id, (counts.get(band.id) ?? 0) + 1);
    }
    const stats = document.querySelector('#plot-stats');
    if (stats) {
      stats.textContent =
        profile.bands.map((b) => `${b.id} ${counts.get(b.id) ?? 0}`).join(' · ') + ' glyphs';
    }
  },
});

initDropzone((file) => void loadFile(file));
window.addEventListener('resize', rerender);

renderer.setSource(makeRose());
rerender();
