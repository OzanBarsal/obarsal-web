import { test, expect } from '@playwright/test';
import { site } from '../../../content';

test('card one metrics strip has the configured number of cells', async ({ page }) => {
  await page.goto('/');
  const metrics = site.work.cards[0]?.metrics;
  if (!metrics?.length) throw new Error('card one must carry a metrics strip');
  await expect(page.locator('article').first().locator('dd')).toHaveCount(metrics.length);
});

test('card two has no metrics grid', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('article');
  await expect(cards).toHaveCount(site.work.cards.length);
  await expect(cards.nth(1).locator('dd')).toHaveCount(0);
});
