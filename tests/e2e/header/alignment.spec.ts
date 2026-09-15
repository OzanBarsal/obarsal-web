import { test, expect } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'the desktop envelope');

for (const width of [768, 900, 1000, 1150, 1200, 1272, 1440]) {
  test(`at ${width}px the nav ends on the right edge of the body`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const nav = (await page.locator('header > div > nav').boundingBox())!;
    const body = (await page.locator('main > section').first().locator('> :last-child').boundingBox())!;
    expect(Math.round(nav.x + nav.width), 'nav right edge').toBe(Math.round(body.x + body.width));
  });
}
