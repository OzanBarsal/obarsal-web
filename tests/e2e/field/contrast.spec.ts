import { test, expect } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { sampleEffectiveAlpha } from '../veil-sampling';
import { BOUNDS } from '../veil/sweep';

test.beforeEach(({ page }) => allowSoftwareGpu(page));

const SELECTORS = [
  'main h1',
  'main section h2',
  'main hgroup p:first-child',
  'main hgroup p:last-child',
  'main hgroup ~ ul > li',
];

test("under every kind of on-screen text the field reaches, the effective alpha stays within that text's contrast bound", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  await expect
    .poll(() => canvas.evaluate((c) => Number(c.getAttribute('data-frames') ?? 0)), { timeout: 60_000 })
    .toBeGreaterThan(20);

  const { samples, counts } = await page.evaluate(sampleEffectiveAlpha, { bounds: BOUNDS, selectors: SELECTORS, frames: 60 });

  for (const { selector, kept } of counts) {
    expect(kept, `${selector} matched nothing inside the viewport, so its bound was never sampled`).toBeGreaterThan(0);
  }
  expect(samples.length, 'the selectors matched no text').toBeGreaterThan(0);
  for (const s of samples) {
    expect(s.token, `${s.label} renders ${s.colour}, which is none of the bounded tokens`).not.toBeNull();
    expect(
      s.effective,
      `${s.label} in --${s.token}: effective ${s.effective.toFixed(3)}, raw ${s.raw.toFixed(3)}, bound ${s.bound}`,
    ).toBeLessThanOrEqual(s.bound!);
  }
});
