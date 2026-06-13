import type { Glyph } from '../core/types';
import { bandFor, type Band, type PlotProfile } from './bands';
import type { Polyline } from './hershey';
import { glyphStrokes } from './strokes';

export interface PlotOptions {
  widthMm: number;
  heightMm: number;
  profile: PlotProfile;
  marginMm: number;          // default 10
  debugIndices?: boolean;    // data-i on each glyph's first path (tests only)
}

function mm(v: number): string {
  // 0.01 mm resolution; avoid "-0.00"
  const r = Math.round(v * 100) / 100;
  return String(r === 0 ? 0 : r);
}

// Printable extent (either axis) is floored at 1 mm so a margin >= half the
// page dimension can never flip or blow up the px->mm mapping.
export function printableMm(dimMm: number, marginMm: number): number {
  return Math.max(1, dimMm - 2 * marginMm);
}

export function toPlotSVG(glyphs: Glyph[], canvasW: number, _canvasH: number, opts: PlotOptions): string {
  const marginMm = opts.marginMm ?? 10;
  const { profile, widthMm, heightMm, debugIndices } = opts;
  const pxPerMm = canvasW / printableMm(widthMm, marginMm);

  // bucket glyphs by band, preserving layout order within each layer
  const perBand = new Map<Band, Array<{ strokes: Polyline[]; idx: number }>>();
  for (const [idx, g] of glyphs.entries()) {
    const band = bandFor(g.dark, profile);
    if (!band) continue;
    const strokes = glyphStrokes(g, band, profile.penWidthMm, pxPerMm);
    if (strokes.length === 0) continue;
    let list = perBand.get(band);
    if (!list) {
      list = [];
      perBand.set(band, list);
    }
    list.push({ strokes, idx });
  }

  const counts = profile.bands
    .map((b) => `${b.id} ${perBand.get(b)?.length ?? 0}`)
    .join(' / ');
  const thresholds = profile.bands.map((b) => `${b.id}=(${b.min},${b.max}]`).join(' ');

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
      `width="${mm(widthMm)}mm" height="${mm(heightMm)}mm" viewBox="0 0 ${mm(widthMm)} ${mm(heightMm)}">`,
  );
  parts.push(
    `<!-- text-dither plot | profile: ${profile.name} | pen: ${profile.penWidthMm} mm | ` +
      `page: ${mm(widthMm)}x${mm(heightMm)} mm, margin ${mm(marginMm)} mm | ` +
      `bands: ${thresholds} | glyphs: ${counts} -->`,
  );

  // layer order: lightest first - later (darker) inks overprint cleanly
  let layerN = 0;
  for (const band of profile.bands) {
    const entries = perBand.get(band);
    if (!entries) continue;
    layerN++;
    parts.push(
      `<g inkscape:groupmode="layer" inkscape:label="${layerN}-${band.label}" id="${band.id}" ` +
        `stroke="${band.color}" stroke-width="${mm(profile.penWidthMm)}" fill="none" ` +
        `stroke-linecap="round" stroke-linejoin="round">`,
    );
    for (const { strokes, idx } of entries) {
      for (const [i, pl] of strokes.entries()) {
        const d = pl.pts
          .map(([x, y], p) => `${p === 0 ? 'M' : 'L'}${mm(x / pxPerMm + marginMm)} ${mm(y / pxPerMm + marginMm)}`)
          .join(' ');
        const dataI = debugIndices && i === 0 ? ` data-i="${idx}"` : '';
        parts.push(`<path d="${d}"${dataI}/>`);
      }
    }
    parts.push('</g>');
  }
  parts.push('</svg>');
  return parts.join('\n');
}
