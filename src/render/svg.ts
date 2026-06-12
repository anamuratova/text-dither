import type { Glyph } from '../core/types';

const BG = '#f4f2ec';
const INK = '#15151a';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function num(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function toSVG(glyphs: Glyph[], width: number, height: number): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" ` +
      `width="${num(width)}" height="${num(height)}" ` +
      `font-family="InterVariable, Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="${BG}"/>`);
  for (const g of glyphs) {
    const transform =
      g.rot !== 0 ? ` transform="rotate(${num((g.rot * 180) / Math.PI)} ${num(g.x)} ${num(g.y)})"` : '';
    parts.push(
      `<text x="${num(g.x)}" y="${num(g.y)}" font-size="${num(g.fontSize)}" ` +
        `font-weight="${g.weight}" fill="${INK}" fill-opacity="${num(g.alpha)}" ` +
        `text-anchor="middle" dominant-baseline="middle"${transform}>${esc(g.ch)}</text>`,
    );
  }
  parts.push('</svg>');
  return parts.join('\n');
}
