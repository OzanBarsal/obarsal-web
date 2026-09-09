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

const CARD = 'main section:first-of-type > div:last-child';
const WORDMARK = 'header a[href="#top"]';

const CONTAINER = [
  { width: 1920, left: 416, cardWidth: 1080 },
  { width: 1440, left: 176, cardWidth: 1080 },
  { width: 1280, left: 96, cardWidth: 1080 },
  { width: 1100, left: 96, cardWidth: 1004 },
] as const;

for (const { width, left, cardWidth } of CONTAINER) {
  test(`at ${width}px the card is ${cardWidth}px wide, ${left}px from the left, under a bar that still spans the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const card = await page.locator(CARD).boundingBox();
    const header = await page.locator('header').boundingBox();
    const wordmark = await page.locator(WORDMARK).boundingBox();
    expect(card).not.toBeNull();
    expect(Math.round(card!.width), 'card width').toBe(cardWidth);
    expect(Math.round(card!.x), 'card left edge').toBe(left);
    expect(Math.round(header!.width), 'the opaque bar is full-bleed, so it spans the viewport').toBe(width);
    expect(Math.round(wordmark!.x), "the bar's content is capped, so the wordmark lands on the card's left edge").toBe(left);
    expect(Math.round(card!.x + card!.width), 'the slack falls on the right of the card').toBeLessThanOrEqual(width);
  });
}

test('at 390px the container insets the whole row by 12px and the card takes the rest', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const card = await page.locator(CARD).boundingBox();
  const wordmark = await page.locator(WORDMARK).boundingBox();
  expect(Math.round(card!.x), 'rail strip of 44px after a 12px inset').toBe(56);
  expect(Math.round(card!.width), '390 - 12 - 44 - 12').toBe(322);
  expect(Math.round(wordmark!.x), 'the wordmark keeps the same left edge on mobile').toBe(56);
});
