import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { site } from '../../../content';

test('no axe violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('no axe violations with the mobile menu open', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the drawer exists only at mobile width');
  await page.goto('/');
  await page.getByRole('button', { name: site.header.menu.open }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('every tab stop is visible, there are more than five, and their vertical centres never move up (the off-screen skip link excepted)', async ({ page }) => {
  await page.goto('/');
  const seen: string[] = [];
  let previousCentre = -Infinity;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.innerText || '').slice(0, 30),
        visible: r.width > 0 && r.height > 0,
        centre: r.top + window.scrollY + r.height / 2,
        isSkipLink: el.matches('a[href="#main"]'),
      };
    });
    if (!info) break;
    expect(info.visible, `focused a zero-size element: ${info.tag} ${info.text}`).toBe(true);
    seen.push(`${info.tag}:${info.text}`);
    if (info.isSkipLink) continue;
    expect(info.centre, `tab order moved up at ${info.tag} ${info.text}`).toBeGreaterThanOrEqual(previousCentre);
    previousCentre = info.centre;
  }
  expect(seen.length).toBeGreaterThan(5);
});
