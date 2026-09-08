import { test, expect } from '@playwright/test';
import { allowSoftwareGpu, forceSoftwareGpu } from '../software-gpu';

const frames = (page: import('@playwright/test').Page) =>
  page.locator('body > canvas').evaluate((c) => Number(c.getAttribute('data-frames') ?? 0));

test.describe('with the software-renderer check hidden', () => {
  test.beforeEach(({ page }) => allowSoftwareGpu(page));

  test('the field runs and draws something that is not the sky', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await expect.poll(() => frames(page), { timeout: 10_000 }).toBeGreaterThan(5);
    const lit = await canvas.evaluate((c) => new Promise<number>((resolve) => {
      requestAnimationFrame(() => {
        const gl = c as HTMLCanvasElement;
        const copy = document.createElement('canvas');
        copy.width = gl.width; copy.height = gl.height;
        const ctx = copy.getContext('2d')!;
        ctx.drawImage(gl, 0, 0);
        const px = ctx.getImageData(0, Math.floor(gl.height * 0.5), gl.width, Math.floor(gl.height * 0.5)).data;
        let count = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i]! > 8) count++;
        resolve(count);
      });
    }));
    expect(lit, 'no field pixels in the lower half').toBeGreaterThan(200);
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
