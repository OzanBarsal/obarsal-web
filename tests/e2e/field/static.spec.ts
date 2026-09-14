import { test, expect } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { horizonFraction } from '../../../lib/field/camera';

test.beforeEach(({ page }) => allowSoftwareGpu(page));

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the canvas is a fixed, decorative, idle element wearing the CSS sky, one linear gradient and no halo, and the renderer is never requested', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
    await expect(canvas).toHaveAttribute('data-state', 'idle');
    const style = await canvas.evaluate((c) => {
      const s = getComputedStyle(c);
      return { position: s.position, z: s.zIndex, bg: s.backgroundImage, w: c.getBoundingClientRect().width };
    });
    expect(style.position).toBe('fixed');
    expect(style.z).toBe('-2');
    expect(style.bg).not.toContain('radial-gradient');
    expect(style.bg).toContain('linear-gradient');
    expect(style.w).toBe(await page.evaluate(() => innerWidth));
    expect(requests.some((u) => u.includes('renderer'))).toBe(false);
  });
});

test('the CSS sky puts its horizon where the field draws one', async ({ page }) => {
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 700 }, { width: 768, height: 900 }, { width: 767, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--horizon').trim());
    expect(
      Number.parseFloat(token) / 100,
      `--horizon reads ${token} at ${size.width}px, against the field's fraction`,
    ).toBeCloseTo(horizonFraction(size.width, size.height), 4);
  }
});

test('the renderer chunk is not preloaded and requested only after load, and no client component is preloaded as a chunk of its own', async ({ page }) => {
  const timeline: { url: string; afterLoad: boolean }[] = [];
  let loaded = false;
  page.on('load', () => { loaded = true; });
  page.on('request', (r) => timeline.push({ url: r.url(), afterLoad: loaded }));
  await page.goto('/');
  await expect(page.locator('body > canvas')).toHaveAttribute('data-state', /running|still/, { timeout: 10_000 });
  const preloads = await page.$$eval('link[rel="modulepreload"]', (ls) => ls.map((l) => l.getAttribute('href') ?? ''));
  expect(preloads.some((h) => h.includes('renderer'))).toBe(false);
  const own = preloads.filter((h) => /RailSegment|InvokerDialog|FieldCanvas|InstrumentOverlay/.test(h));
  expect(own, 'a client component is preloaded alone; it belongs in the codeSplitting group in vite.config.ts').toEqual([]);
  const renderer = timeline.find((r) => r.url.includes('renderer'));
  expect(renderer, 'the renderer chunk was requested').toBeDefined();
  expect(renderer!.afterLoad).toBe(true);
});
