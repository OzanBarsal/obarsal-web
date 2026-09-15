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
  const targets = page.locator('a:not([href="#top"]):not(address a), button, label');
  for (let i = 0; i < await targets.count(); i++) {
    const el = targets.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    const name = await el.evaluate(
      (e) => (e as HTMLElement).innerText || e.querySelector('[aria-label]')?.getAttribute('aria-label') || e.tagName,
    );
    expect(Math.min(box.height, box.width), name).toBeGreaterThanOrEqual(48);
  }
});

const CARD = 'main section:first-of-type > div:last-child';
const WORDMARK = 'header a[href="#top"]';

const CONTAINER = [
  { width: 1920, left: 416, cardWidth: 1080 },
  { width: 1440, left: 176, cardWidth: 1080 },
  { width: 1280, left: 96, cardWidth: 1080 },
  { width: 1100, left: 96, cardWidth: 992 },
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

test('at 390px the row starts at the screen edge, keeps a 12px inset on the right, and the card takes the rest', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const card = await page.locator(CARD).boundingBox();
  const wordmark = await page.locator(WORDMARK).boundingBox();
  expect(Math.round(card!.x), 'rail strip of 44px from the screen edge').toBe(44);
  expect(Math.round(card!.width), '390 - 44 - 12').toBe(334);
  const chip = await page.locator('main span', { hasText: /^00$/ }).first().boundingBox();
  expect(Math.round(wordmark!.x), 'the wordmark starts 13px in, on the left edge of the "00" chip').toBe(13);
  expect(Math.abs(wordmark!.x - chip!.x), 'the chip is centred in the 44px rail strip; 13px is its rounded left edge').toBeLessThan(0.5);
});
