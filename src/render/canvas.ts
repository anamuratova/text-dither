import { computeLayout } from '../core/layout';
import { luminanceGrid } from '../core/sampler';
import type { DitherParams, LayoutResult } from '../core/types';
import { bandFor, type PlotProfile } from '../plot/bands';
import { printableMm } from '../plot/plotSvg';
import { glyphStrokes } from '../plot/strokes';

const BG = '#f4f2ec';
const INK = '#15151a';
const MAX_LONG_SIDE = 1600;

// The page the image is rendered onto (paper minus margins is the drawable
// area); the canvas takes the paper aspect and the image cover-fills it.
export interface PageGeometry {
  widthMm: number;
  heightMm: number;
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
  private page: PageGeometry = { widthMm: 210, heightMm: 297, marginMm: 10 };
  private previewProfile: PlotProfile | null = null;
  private zoom: 'fit' | 'actual' = 'fit';
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
  render(
    params: DitherParams,
    page: PageGeometry,
    previewProfile: PlotProfile | null = null,
    zoom: 'fit' | 'actual' = 'fit',
  ): void {
    this.params = params;
    this.page = page;
    this.previewProfile = previewProfile;
    this.zoom = zoom;
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

    // The drawable page is the paper minus its margins; the canvas takes that
    // aspect so the image cover-fills the paper (sampler crops the overflow).
    const printW = printableMm(this.page.widthMm, this.page.marginMm);
    const printH = printableMm(this.page.heightMm, this.page.marginMm);
    const paperAspect = printH / printW;

    // Fit the page inside the container in BOTH axes so portrait sheets do not
    // overflow; drive the canvas display size explicitly (no width:100% loop).
    const host = this.canvas.parentElement;
    let availW = 640;
    let availH = 640;
    if (host) {
      const cs = getComputedStyle(host);
      availW = Math.max(1, host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      availH = Math.max(1, host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
    }
    const displayW = Math.min(availW, availH / paperAspect);
    const displayH = displayW * paperAspect;
    // The LAYOUT basis stays the host-fit width (so the plot is identical in
    // both zoom modes); only the displayed size changes. At 100% the printable
    // page area is shown at actual mm (browser's 96px/inch reference).
    if (this.zoom === 'actual') {
      this.canvas.style.width = `${printW}mm`;
      this.canvas.style.height = `${printH}mm`;
    } else {
      this.canvas.style.width = `${displayW}px`;
      this.canvas.style.height = `${displayH}px`;
    }

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

    const lum = luminanceGrid(source, cols, rows, width, height);
    const layout = computeLayout(lum, cols, rows, width, height, params);
    this.lastLayout = layout;
    this.lastWidth = width;
    this.lastHeight = height;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    if (this.previewProfile) {
      this.drawPlotPreview(layout, width / printW, this.previewProfile);
      this.canvas.dispatchEvent(new CustomEvent('rendered'));
      return;
    }

    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.drawGlyphs(ctx, layout.glyphs);
    this.canvas.dispatchEvent(new CustomEvent('rendered'));
  }

  // Setting ctx.font reparses the font on every assignment, so glyphs are
  // grouped by a quantized font string and the font is set once per group
  // (all marks are the same ink color, and same-color source-over compositing
  // is order-independent, so regrouping does not change the result). Rotation
  // uses setTransform instead of save/translate/rotate/restore to skip the
  // state-stack push/pop, which dominated the loop at high glyph counts.
  private drawGlyphs(ctx: CanvasRenderingContext2D, glyphs: LayoutResult['glyphs']): void {
    const groups = new Map<string, LayoutResult['glyphs']>();
    for (const g of glyphs) {
      const size = Math.round(g.fontSize * 2) / 2;
      const weight = Math.round(g.weight / 10) * 10;
      const font = `${weight} ${size}px InterVariable`;
      let arr = groups.get(font);
      if (!arr) groups.set(font, (arr = []));
      arr.push(g);
    }
    let identity = true;
    for (const [font, gs] of groups) {
      ctx.font = font;
      for (const g of gs) {
        ctx.globalAlpha = g.alpha;
        if (g.rot !== 0) {
          const cos = Math.cos(g.rot);
          const sin = Math.sin(g.rot);
          ctx.setTransform(cos, sin, -sin, cos, g.x, g.y);
          ctx.fillText(g.ch, 0, 0);
          identity = false;
        } else {
          if (!identity) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            identity = true;
          }
          ctx.fillText(g.ch, g.x, g.y);
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  // Band-model preview: same glyphStrokes geometry the plot SVG exports -
  // single source of truth, what's on screen is what plots.
  private drawPlotPreview(layout: LayoutResult, pxPerMm: number, profile: PlotProfile): void {
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
