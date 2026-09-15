import { test, expect } from '@playwright/test';

const PILL = 'header > div > span';

for (const width of [768, 800, 832, 900, 1440]) {
  test(`at ${width}px the status pill sits on one line, the nav ends inside the header and every nav link is 48px wide or more`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const pill = page.locator(PILL);
    if (!(await pill.isVisible())) test.skip();
    const lines = await pill.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getClientRects().length;
    });
    expect(lines, 'line boxes inside the pill').toBe(1);
    const inner = await page.locator('header > div').boundingBox();
    const nav = await page.locator('header > div > nav').boundingBox();
    expect(Math.round(nav!.x + nav!.width), 'nav right edge').toBeLessThanOrEqual(Math.round(inner!.x + inner!.width));
    for (const link of await page.locator('header > div > nav > a').all()) {
      const box = await link.boundingBox();
      expect(box!.width, `${await link.innerText()} hit target`).toBeGreaterThanOrEqual(48);
    }
  });
}
