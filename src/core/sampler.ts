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

export function luminanceGrid(
  source: CanvasImageSource & { width: number; height: number },
  cols: number,
  rows: number,
): Float32Array {
  const ctx = getCtx(cols, rows);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cols, rows);

  // cover fit: scale to fill, center-crop the overflow axis
  const scale = Math.max(cols / source.width, rows / source.height);
  const dw = source.width * scale;
  const dh = source.height * scale;
  ctx.drawImage(source, (cols - dw) / 2, (rows - dh) / 2, dw, dh);

  const data = ctx.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(cols * rows);
  for (let p = 0; p < lum.length; p++) {
    const o = p * 4;
    lum[p] = (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
  }
  return lum;
}
