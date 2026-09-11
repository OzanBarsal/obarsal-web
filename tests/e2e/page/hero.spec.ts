import { test, expect } from '@playwright/test';
import { site } from '../../../content';

const headline = site.hero.headline
  .map((segment) => (typeof segment === 'string' ? segment : segment.text))
  .join('');

test('h1 carries the full headline with no word marked', async ({ page }) => {
  await page.goto('/');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText(headline);
  await expect(h1.locator('span')).toHaveCount(0);
});

// Exact sizes, not a range: each test runs only under the project whose viewport it names.
test('headline renders at the design size on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'asserts the desktop type scale');
  await page.goto('/');
  const size = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontSize);
  expect(size).toBe('82px');
});

test('headline renders at the design size on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'asserts the mobile type scale');
  await page.goto('/');
  const size = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontSize);
  expect(size).toBe('36px');
});
