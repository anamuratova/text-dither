import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import type { Glyph } from '../src/core/types';
import { toSVG } from '../src/render/svg';

const glyphs: Glyph[] = [
  { ch: 'a', x: 10, y: 20, fontSize: 12, weight: 400, alpha: 0.5, rot: 0.2 },
  { ch: '<', x: 30, y: 20, fontSize: 14, weight: 700, alpha: 1, rot: 0.1 },
  { ch: 'z', x: 50, y: 40, fontSize: 9, weight: 100, alpha: 0.14, rot: 0 },
];

describe('toSVG', () => {
  it('9. parses as XML, one <text> per glyph, escapes <, omits transform when rot=0', () => {
    const svg = toSVG(glyphs, 100, 60);

    expect(XMLValidator.validate(svg)).toBe(true);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(svg);
    const texts = parsed.svg.text;
    expect(Array.isArray(texts)).toBe(true);
    expect(texts.length).toBe(glyphs.length);

    expect(svg).toContain('&lt;');
    expect(texts[1]['#text']).toBe('<');

    expect(texts[2]['@_transform']).toBeUndefined();
    expect(texts[0]['@_transform']).toMatch(/^rotate\(/);
  });

  it('escapes & and >', () => {
    const svg = toSVG(
      [
        { ...glyphs[2], ch: '&' },
        { ...glyphs[2], ch: '>' },
      ],
      10,
      10,
    );
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&gt;');
    expect(XMLValidator.validate(svg)).toBe(true);
  });
});
