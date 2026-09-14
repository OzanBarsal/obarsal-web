import { test, expect, type Page } from '@playwright/test';
import { horizonFraction } from '../../../lib/field/camera';
import { BOUNDS, sweepVeilAlpha } from './sweep';

// The rail is aria-hidden decoration, exempt by the author's decision; the header carries no veil
// because its band sits above the drawn horizon, which the last test here holds it to.
const EXEMPT = '[aria-hidden="true"], header';

const settled = async (page: Page) => {
  await page.goto('/');
  await expect(page.locator('main > div > div').first()).toHaveAttribute('data-lit', '');
};

test('every text run the field can reach sits under enough veil for its own contrast bound', async ({ page }) => {
  await settled(page);
  const runs = await page.evaluate(sweepVeilAlpha, { bounds: BOUNDS, exempt: EXEMPT });
  // A run backed by an opaque surface is out of the field's reach; its contrast is the unit
  // guard's PAIRS, not the veil's.
  const reached = runs.filter((r) => !r.opaque);

  expect(reached.length, 'the sweep found no text the field can reach').toBeGreaterThan(20);
  for (const run of reached) {
    expect(run.token, `${run.label} renders ${run.colour}, which is none of the bounded tokens`).not.toBeNull();
    expect(
      run.alpha,
      `${run.label} in --${run.token}: veil transmits ${(1 - run.alpha).toFixed(3)} of the field, bound ${run.bound}`,
    ).toBeGreaterThanOrEqual(1 - run.bound!);
  }
});

test('every bounded token is actually rendered somewhere, so no bound passes by being unreachable', async ({ page }) => {
  await settled(page);
  const runs = await page.evaluate(sweepVeilAlpha, { bounds: BOUNDS, exempt: EXEMPT });
  const seen = new Set(runs.filter((r) => !r.opaque).map((r) => r.token));
  for (const token of Object.keys(BOUNDS)) {
    expect(seen.has(token), `--${token} is bounded but nothing on the page renders it`).toBe(true);
  }
});

test('the header band sits above the drawn horizon, so no field reaches the text it holds', async ({ page }) => {
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 768, height: 900 }, { width: 767, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    const bar = (await page.locator('header').boundingBox())!;
    expect(
      bar.y + bar.height,
      `the header reaches ${bar.y + bar.height}px at ${size.width}x${size.height}, against a horizon at ${horizonFraction(size.width, size.height) * size.height}px`,
    ).toBeLessThanOrEqual(horizonFraction(size.width, size.height) * size.height);
  }
});
