export function makeRose(size = 640): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.42;
  const R = 0.46 * size;

  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r > R) continue;
      const t = r / R;
      const theta = Math.atan2(dy, dx);
      const swirl = 0.5 + 0.5 * Math.sin(5 * theta + t * 14 - 1.2 * Math.sin(6 * t));
      const petalEdge = 0.5 + 0.5 * Math.cos(8 * theta - 9 * t);
      let ink = (0.30 + 0.45 * swirl ** 1.3 + 0.18 * petalEdge) * (0.55 + 0.45 * t) * (1 - t ** 7);
      // soft edge over the outer 6% of R
      if (t > 0.94) ink *= (1 - t) / 0.06;
      const v = Math.round(255 * (1 - Math.min(1, Math.max(0, ink))));
      const o = (y * size + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = v;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // stem: quadratic stroke from below the bloom to the bottom edge
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.82)';
  ctx.lineWidth = size * 0.014;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.01, cy + R * 0.62);
  ctx.quadraticCurveTo(cx - size * 0.10, cy + R * 1.05, cx - size * 0.03, size * 0.99);
  ctx.stroke();

  return canvas;
}
