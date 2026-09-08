import { test, expect } from '@playwright/test';
import { allowSoftwareGpu, forceSoftwareGpu } from '../software-gpu';
import { countLitPixels, sampleLitGrid } from '../canvas-sampling';
import { horizonFraction } from '../../../lib/field/camera';

const frames = (page: import('@playwright/test').Page) =>
  page.locator('body > canvas').evaluate((c) => Number(c.getAttribute('data-frames') ?? 0));

test.describe('with the software-renderer check hidden', () => {
  test.beforeEach(({ page }) => allowSoftwareGpu(page));

  test('the field runs and draws something that is not the sky', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await expect.poll(() => frames(page), { timeout: 10_000 }).toBeGreaterThan(5);
    const lit = await page.evaluate(countLitPixels, { fromFraction: 0.5, threshold: 8 });
    expect(lit, 'no field pixels in the lower half').toBeGreaterThan(200);
  });

  test('the field fills the frame rather than drawing a few lines', async ({ page, isMobile }) => {
    test.setTimeout(90_000);
    test.skip(!!isMobile, 'at 390 px the rows above the bottom edge show ground closer than one mesh cell, so the grid stops separating a filled field from a few lines');
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await page.waitForTimeout(10_000);
    const size = page.viewportSize()!;
    const grid = await page.evaluate(sampleLitGrid, {
      fraction: horizonFraction(size.width, size.height), columns: 12, rows: 8, threshold: 8,
    });
    expect(await canvas.getAttribute('data-reroots'), 'the field roots once and never from nothing again').toBe('0');
    expect(Number(await canvas.getAttribute('data-live')), 'segments drawn').toBeGreaterThan(0);
    expect(
      grid.filled / grid.cells,
      `${grid.filled} of ${grid.cells} grid cells below the horizon hold a lit pixel`,
    ).toBeGreaterThan(0.5);
  });

  test('turning reduced motion off resumes the drawn field instead of blanking it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'still', { timeout: 10_000 });
    const settled = Number(await canvas.getAttribute('data-live'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await page.waitForTimeout(1000);
    const lit = await page.evaluate(countLitPixels, { fromFraction: 0.5, threshold: 8 });
    expect(lit, 'the resumed field draws nothing: every birth is in the future').toBeGreaterThan(200);
    expect(Number(await canvas.getAttribute('data-live')), `segments drawn, against ${settled} in the still frame`).toBeGreaterThan(settled / 2);
    expect(await canvas.getAttribute('data-reroots'), 'the field roots once and never from nothing again').toBe('0');
  });

  test('turning reduced motion off while the tab is hidden does not freeze the field on resume', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'still', { timeout: 10_000 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(3000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    let min = Infinity;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(60);
      min = Math.min(min, await page.evaluate(countLitPixels, { fromFraction: 0.5, threshold: 8 }));
    }
    expect(min, 'the field freezes with near-0 lit pixels while the clock walks backward to catch up').toBeGreaterThan(1000);
  });

  test.describe('reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });
    test('draws exactly one frame and never starts the loop', async ({ page }) => {
      await page.goto('/');
      const canvas = page.locator('body > canvas');
      await expect(canvas).toHaveAttribute('data-state', 'still', { timeout: 10_000 });
      await page.waitForTimeout(1500);
      expect(await frames(page)).toBe(1);
    });

    test('a resize redraws the still frame', async ({ page, isMobile }) => {
      await page.goto('/');
      const canvas = page.locator('body > canvas');
      await expect(canvas).toHaveAttribute('data-state', 'still', { timeout: 10_000 });
      expect(await frames(page)).toBe(1);
      await page.setViewportSize(isMobile ? { width: 390, height: 700 } : { width: 1440, height: 700 });
      await expect.poll(() => frames(page), { timeout: 10_000 }).toBe(2);
    });
  });

  test('hiding the document stops the loop and showing it resumes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body > canvas')).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await expect.poll(() => frames(page), { timeout: 10_000 }).toBeGreaterThan(5);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const before = await frames(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(before);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => frames(page), { timeout: 10_000 }).toBeGreaterThan(before);
  });

  test('a lost context turns the field off for good, even after the tab returns', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await expect.poll(() => frames(page), { timeout: 10_000 }).toBeGreaterThan(5);
    await canvas.evaluate((c) => {
      const gl = (c as HTMLCanvasElement).getContext('webgl2')!;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(canvas).toHaveAttribute('data-state', 'off');
    const before = await frames(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1000);
    await expect(canvas).toHaveAttribute('data-state', 'off');
    expect(await frames(page)).toBe(before);
  });
});

test('on a software renderer the field stays off and the sky remains', async ({ page }) => {
  await forceSoftwareGpu(page);
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'off', { timeout: 10_000 });
  const sky = await canvas.evaluate((c) => getComputedStyle(c).backgroundImage);
  expect(sky, 'the CSS sky is all that is left when the field never starts').toContain('linear-gradient');
});
