import { test, expect } from '@playwright/test';

test('accent-derived values follow the token, not a baked colour', async ({ page }) => {
  await page.goto('/');

  const sample = () =>
    page.evaluate(() => {
      const pill = document.querySelector('header nav span') as HTMLElement | null;
      // The first mailto in document order is the hero CTA, whose fill is var(--accent).
      const link = document.querySelector('main a[href^="mailto:"]') as HTMLElement | null;
      return {
        dotBackground: pill ? getComputedStyle(pill, '::before').backgroundColor : null,
        dotShadow: pill ? getComputedStyle(pill, '::before').boxShadow : null,
        linkBackground: link ? getComputedStyle(link).backgroundColor : null,
      };
    });

  const before = await sample();

  // Flip the token to a colour that appears nowhere in the design.
  await page.evaluate(() => document.documentElement.style.setProperty('--accent', '#FF00FF'));
  const after = await sample();

  expect(after.dotBackground, 'pill dot ignored --accent').not.toBe(before.dotBackground);
  expect(after.dotShadow, 'pill glow is a baked rgba(), not derived').not.toBe(before.dotShadow);
  expect(after.linkBackground, 'CTA link ignored --accent').not.toBe(before.linkBackground);
});
