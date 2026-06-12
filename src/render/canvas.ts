import { computeLayout } from '../core/layout';
import { luminanceGrid } from '../core/sampler';
import type { DitherParams, LayoutResult } from '../core/types';
import { bandFor, type PlotProfile } from '../plot/bands';
import { printableWidthMm } from '../plot/plotSvg';
import { glyphStrokes } from '../plot/strokes';

const BG = '#f4f2ec';
const INK = '#15151a';
const MAX_LONG_SIDE = 1600;

export interface PlotPreview {
  profile: PlotProfile;
  pageWidthMm: number;
  marginMm: number;
}

export type ImageSource = CanvasImageSource & { width: number; height: number };

let fontReady: Promise<unknown> | null = null;
function ensureFont(): Promise<unknown> {
  if (!fontReady) {
    // On failure, clear the cache so a later render retries; canvas text
    // falls back to the default sans family in the meantime.
    fontReady = document.fonts.load('400 16px InterVariable').catch(() => {
      fontReady = null;
    });
  }
  return fontReady;
}

export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private source: ImageSource | null = null;
  private params: DitherParams | null = null;
  private plotPreview: PlotPreview | null = null;
  private rafId = 0;
  lastLayout: LayoutResult | null = null;
  lastWidth = 0;
  lastHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
  }

  setSource(source: ImageSource): void {
    this.source = source;
  }

  // Coalesce all render requests into a single requestAnimationFrame.
  render(params: DitherParams, plotPreview: PlotPreview | null = null): void {
    this.params = params;
    this.plotPreview = plotPreview;
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      void this.draw();
    });
  }

  private async draw(): Promise<void> {
    const source = this.source;
    const params = this.params;
    if (!source || !params) return;
    await ensureFont();

    const displayW = this.canvas.clientWidth || 640;
    const aspect = source.height / source.width;
    const displayH = displayW * aspect;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = displayW * dpr;
    let height = displayH * dpr;
    const long = Math.max(width, height);
    if (long > MAX_LONG_SIDE) {
      const k = MAX_LONG_SIDE / long;
      width *= k;
      height *= k;
    }
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;

    // caller-side grid derivation (spec section 3.1)
    const effScale = width / displayW;
    const cellH = params.cellPx * effScale;
    const cellW = cellH * 0.62;
    const cols = Math.max(1, Math.floor(width / cellW));
    const rows = Math.max(1, Math.floor(height / cellH));

    const lum = luminanceGrid(source, cols, rows);
    const layout = computeLayout(lum, cols, rows, width, height, params);
    this.lastLayout = layout;
    this.lastWidth = width;
    this.lastHeight = height;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    if (this.plotPreview) {
      this.drawPlotPreview(layout, width);
      this.canvas.dispatchEvent(new CustomEvent('rendered'));
      return;
    }

    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const g of layout.glyphs) {
      ctx.font = `${g.weight} ${g.fontSize}px InterVariable`;
      ctx.globalAlpha = g.alpha;
      if (g.rot !== 0) {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);
        ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(g.ch, g.x, g.y);
      }
    }
    ctx.globalAlpha = 1;
    this.canvas.dispatchEvent(new CustomEvent('rendered'));
  }

  // Band-model preview: same glyphStrokes geometry the plot SVG exports -
  // single source of truth, what's on screen is what plots.
  private drawPlotPreview(layout: LayoutResult, width: number): void {
    const { profile, pageWidthMm, marginMm } = this.plotPreview!;
    const pxPerMm = width / printableWidthMm(pageWidthMm, marginMm);
    const ctx = this.ctx;
    ctx.lineWidth = profile.penWidthMm * pxPerMm;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;

    for (const g of layout.glyphs) {
      const band = bandFor(g.dark, profile);
      if (!band) continue;
      ctx.strokeStyle = band.color;
      for (const pl of glyphStrokes(g, band, profile.penWidthMm, pxPerMm)) {
        ctx.beginPath();
        ctx.moveTo(pl.pts[0][0], pl.pts[0][1]);
        for (let i = 1; i < pl.pts.length; i++) ctx.lineTo(pl.pts[i][0], pl.pts[i][1]);
        ctx.stroke();
      }
    }
  }
}
