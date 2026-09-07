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
