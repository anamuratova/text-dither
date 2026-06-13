let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;

function getCtx(cols: number, rows: number): CanvasRenderingContext2D {
  if (!cachedCanvas) {
    cachedCanvas = document.createElement('canvas');
    cachedCtx = cachedCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!cachedCtx) throw new Error('2d context unavailable');
  if (cachedCanvas.width !== cols || cachedCanvas.height !== rows) {
    cachedCanvas.width = cols;
    cachedCanvas.height = rows;
  }
  return cachedCtx;
}

export interface DrawRect { dx: number; dy: number; dw: number; dh: number; }

// Cover-fit the source into the canvas's PHYSICAL rectangle (width x height),
// then express the draw rect in the cols x rows cell buffer. The cells are not
// square (cellW = 0.62*cellH), so a cover-fit done directly in cell units would
// crop the image and stretch it back to the canvas; fitting in physical space
// keeps the sampled image at the same proportions it is displayed at.
export function coverRect(
  cols: number,
  rows: number,
  width: number,
  height: number,
  sw: number,
  sh: number,
): DrawRect {
  const scale = Math.max(width / sw, height / sh);
  const pw = sw * scale; // physical px
  const ph = sh * scale;
  const dw = (pw * cols) / width; // -> cell-buffer units
  const dh = (ph * rows) / height;
  return { dx: (cols - dw) / 2, dy: (rows - dh) / 2, dw, dh };
}

export function luminanceGrid(
  source: CanvasImageSource & { width: number; height: number },
  cols: number,
  rows: number,
  width: number,
  height: number,
): Float32Array {
  const ctx = getCtx(cols, rows);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cols, rows);

  const { dx, dy, dw, dh } = coverRect(cols, rows, width, height, source.width, source.height);
  ctx.drawImage(source, dx, dy, dw, dh);

  const data = ctx.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(cols * rows);
  for (let p = 0; p < lum.length; p++) {
    const o = p * 4;
    lum[p] = (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
  }
  return lum;
}
