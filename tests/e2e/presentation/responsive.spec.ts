import { test, expect } from '@playwright/test';

test('no horizontal overflow at any tested viewport', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('every interactive element meets the 48px hit target, except the wordmark and the links inside <address>', async ({ page }) => {
  await page.goto('/');
  const targets = page.locator('a:not([href="#top"]):not(address a), button');
  for (let i = 0; i < await targets.count(); i++) {
    const el = targets.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    expect(Math.min(box.height, box.width), await el.innerText()).toBeGreaterThanOrEqual(48);
  }
});
