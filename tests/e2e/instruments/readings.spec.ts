import { test, expect } from '@playwright/test';
import { OVERLAY, played } from '../opening/skip';

test('no shown chip reads a fractional pixel value', async ({ page }) => {
  await played(page);
  const texts = await page.locator(`${OVERLAY} span[data-k]`).evaluateAll((nodes) =>
    nodes.filter((n) => !(n as HTMLElement).hidden).map((n) => n.textContent ?? ''));
  expect(texts.length).toBeGreaterThan(4);
  for (const t of texts) expect(t).not.toMatch(/\d\.\d+px/);
});
