import { test, expect } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { countLitPixels } from '../canvas-sampling';
import { played } from '../opening/skip';

test.beforeEach(({ page }) => allowSoftwareGpu(page));

test('while the opening holds the field the canvas is sky only; the field and the motes fade in once it is done', async ({ page }) => {
  await played(page);
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  const held = await page.evaluate(() => document.documentElement.dataset.opening);
  expect(held, 'the renderer mounted after the opening ended; the hold was never observed').toBe('playing');
  expect(await page.evaluate(countLitPixels, { fromFraction: 0, threshold: 8 })).toBe(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.opening), { timeout: 15_000 }).toBe('done');
  await expect
    .poll(() => page.evaluate(countLitPixels, { fromFraction: 0, threshold: 8 }), { timeout: 10_000 })
    .toBeGreaterThan(200);
});
