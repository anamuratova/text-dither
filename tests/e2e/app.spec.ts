import { expect, test, type Page } from '@playwright/test';

function pixelHash(page: Page): Promise<string> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('#stage')!;
    return c.toDataURL('image/png');
  });
}

function distinctColors(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('#stage')!;
    if (c.width === 0 || c.height === 0) return 0;
    const ctx = c.getContext('2d')!;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set<number>();
    const step = Math.max(1, Math.floor(d.length / 4 / 5000)) * 4;
    for (let o = 0; o < d.length; o += step) {
      seen.add((d[o] << 16) | (d[o + 1] << 8) | d[o + 2]);
    }
    return seen.size;
  });
}

async function waitForPaint(page: Page): Promise<void> {
  await expect.poll(() => distinctColors(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
}

// Generate a PNG inside the browser (no fixtures, no network).
function makePngBuffer(page: Page, draw: string): Promise<Buffer> {
  return page
    .evaluate((body: string) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d')!;
      new Function('ctx', 'c', body)(ctx, c);
      return c.toDataURL('image/png');
    }, draw)
    .then((dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64'));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('10. demo rose auto-renders a non-blank canvas', async ({ page }) => {
  await waitForPaint(page);
  expect(await distinctColors(page)).toBeGreaterThanOrEqual(2);
});

test('11. loading a file via the hidden input re-renders the canvas', async ({ page }) => {
  await waitForPaint(page);
  const before = await pixelHash(page);
  const buffer = await makePngBuffer(
    page,
    `const g = ctx.createLinearGradient(0, 0, 64, 64);
     g.addColorStop(0, '#000');
     g.addColorStop(1, '#fff');
     ctx.fillStyle = g;
     ctx.fillRect(0, 0, 64, 64);`,
  );
  await page.locator('#file-input').setInputFiles({ name: 'gradient.png', mimeType: 'image/png', buffer });
  await expect.poll(() => pixelHash(page), { timeout: 10_000 }).not.toBe(before);
});

test('12. drag-and-drop an image file onto the document re-renders', async ({ page }) => {
  await waitForPaint(page);

  const dragoverPrevented = await page.evaluate(() => {
    const e = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    document.body.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(dragoverPrevented).toBe(true);

  const before = await pixelHash(page);
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 32, 64, 32);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
    const file = new File([blob], 'drop.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    document.body.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
    );
  });
  await expect.poll(() => pixelHash(page), { timeout: 10_000 }).not.toBe(before);
});

test('13. Save SVG downloads a file starting with <svg', async ({ page }) => {
  await waitForPaint(page);
  const downloadPromise = page.waitForEvent('download');
  await page.click('#btn-svg');
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const content = Buffer.concat(chunks).toString('utf8');
  expect(content.trimStart().startsWith('<svg')).toBe(true);
});

test('14. typing new text updates the canvas within 500 ms', async ({ page }) => {
  await waitForPaint(page);
  const before = await pixelHash(page);
  await page.fill('#text-input', 'WWWWWWWWWW MMMMMMMMMM 0000000000');
  await expect.poll(() => pixelHash(page), { timeout: 500, intervals: [50, 100, 150] }).not.toBe(before);
});
