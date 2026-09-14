import { test, expect } from '@playwright/test';

// Reduced motion collapses the .15s colour transitions so a sample is final.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const PROPS = ['color', 'border-top-color', 'border-bottom-color', 'background-color'];

test('every interactive element renders the same state under hover and keyboard focus, outline aside', async ({ page }) => {
  await page.goto('/');
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover media on this project: the twin cannot be observed');
  const targets = page.locator('a:not([href="#main"]), button');
  for (let i = 0; i < await targets.count(); i++) {
    const el = targets.nth(i);
    if (!(await el.isVisible())) continue;
    const label = (await el.innerText()) || (await el.getAttribute('aria-label')) || '';
    await el.hover();
    const hovered = await el.evaluate(
      (e, props) => props.map((p) => getComputedStyle(e).getPropertyValue(p)),
      PROPS,
    );
    await page.mouse.move(0, 0);
    await el.focus();
    expect(await el.evaluate((e) => e.matches(':focus-visible')), `${label}: not :focus-visible`).toBe(true);
    const focused = await el.evaluate(
      (e, props) => props.map((p) => getComputedStyle(e).getPropertyValue(p)),
      PROPS,
    );
    expect(focused, `${label}: focus state differs from hover state`).toEqual(hovered);
  }
});

const PRIMARY = 'main a[href^="mailto:"]';

test('the solid button changes under hover', async ({ page }) => {
  await page.goto('/');
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover media on this project: hover cannot be observed');
  const target = page.locator(PRIMARY).first();
  const rest = await target.evaluate((e) => getComputedStyle(e).backgroundColor);
  await target.hover();
  expect(await target.evaluate((e) => getComputedStyle(e).backgroundColor), 'background-color did not change under hover').not.toBe(rest);
});

test.describe('narrow viewport with a pointer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the menu toggle and its close button change colour under hover', async ({ page }) => {
    await page.goto('/');
    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    test.skip(!canHover, 'no hover media on this project: hover cannot be observed');
    const toggle = page.locator('header button').first();
    const restToggle = await toggle.evaluate((e) => getComputedStyle(e).color);
    await toggle.hover();
    expect(await toggle.evaluate((e) => getComputedStyle(e).color), 'toggle colour did not change under hover').not.toBe(restToggle);
    await toggle.click();
    const close = page.locator('header dialog[open] button').first();
    await page.mouse.move(0, 0);
    const restClose = await close.evaluate((e) => getComputedStyle(e).color);
    await close.hover();
    expect(await close.evaluate((e) => getComputedStyle(e).color), 'close colour did not change under hover').not.toBe(restClose);
  });
});
