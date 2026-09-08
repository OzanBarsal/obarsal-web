import { test, expect } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { horizonFraction } from '../../../lib/field/camera';

test.beforeEach(({ page }) => allowSoftwareGpu(page));

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the canvas is a fixed, decorative, idle element wearing the CSS sky, and the renderer is never requested', async ({ page }) => {
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
    expect(style.bg).toContain('radial-gradient');
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
  const own = preloads.filter((h) => /RailSegment|InvokerDialog|FieldCanvas/.test(h));
  expect(own, 'a client component is preloaded alone; it belongs in the codeSplitting group in vite.config.ts').toEqual([]);
  const renderer = timeline.find((r) => r.url.includes('renderer'));
  expect(renderer, 'the renderer chunk was requested').toBeDefined();
  expect(renderer!.afterLoad).toBe(true);
});

test('one glass sheet covers the whole viewport, above the field and below main, which is unpositioned', async ({ page }) => {
  await page.goto('/');
  const sheet = page.locator('.glass');
  await expect(sheet).toHaveCount(1);
  const box = await sheet.evaluate((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const main = document.querySelector('main')!;
    const m = getComputedStyle(main);
    return {
      position: s.position, z: s.zIndex, filter: s.backdropFilter, bg: s.backgroundColor,
      edges: { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) },
      mainPosition: m.position, mainZ: m.zIndex, sheetHoldsMain: el.contains(main),
    };
  });
  expect(box.position).toBe('fixed');
  expect(box.z).toBe('-1');
  expect(box.filter).toContain('url');
  expect(box.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(box.edges).toEqual(await page.evaluate(() => ({ left: 0, top: 0, right: innerWidth, bottom: innerHeight })));
  expect(await page.locator('body > canvas').evaluate((c) => getComputedStyle(c).zIndex)).toBe('-2');
  expect(box.sheetHoldsMain, 'the sheet must not be an ancestor of the content it sits under').toBe(false);
  expect(
    { position: box.mainPosition, z: box.mainZ },
    'main is unpositioned with an auto z-index, so it paints after every negative z-index box in the root stacking context',
  ).toEqual({ position: 'static', z: 'auto' });
  const gradients = await page.$$eval('main section > div, main > div > div > div', (els) => els.filter((e) => getComputedStyle(e).backgroundImage.includes('gradient')).length);
  expect(gradients, 'a section body still carries the old veil').toBe(0);
});
