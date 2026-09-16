import { test, expect, type Locator } from '@playwright/test';
import { site } from '../../../content';

const SECTION = `section[aria-labelledby="section-${site.clients.section.index}"]`;

// forcedColors is not a runner option in @playwright/test 1.62.1; only contextOptions carries it.
const forced = (colorScheme: 'light' | 'dark') => ({ contextOptions: { forcedColors: 'active' as const }, colorScheme });

async function pseudoBars(el: Locator) {
  return el.evaluate((node) => {
    const cs = (p?: string) => getComputedStyle(node, p);
    return {
      color: cs().color,
      before: cs('::before').backgroundColor,
      after: cs('::after').backgroundColor,
      beforeShadow: cs('::before').boxShadow,
    };
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`under a ${scheme} forced palette`, () => {
    test.use(forced(scheme));

    test('the drawer toggle draws its three bars in the forced text colour', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'the drawer exists only at mobile width');
      await page.goto('/');
      const bars = await pseudoBars(page.getByRole('button', { name: site.header.menu.open }));
      expect(bars.before, 'top bar').toBe(bars.color);
      expect(bars.after, 'bottom bar').toBe(bars.color);
      expect(bars.beforeShadow, 'middle bar').toContain(bars.color);
    });

    test('the open drawer draws its close X in the forced text colour', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'the drawer exists only at mobile width');
      await page.goto('/');
      await page.getByRole('button', { name: site.header.menu.open }).click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      const bars = await pseudoBars(page.getByRole('button', { name: site.header.menu.close }));
      expect(bars.before, 'one stroke').toBe(bars.color);
      expect(bars.after, 'other stroke').toBe(bars.color);
    });

    test('the pause switch draws its two bars in the forced text colour', async ({ page }) => {
      await page.goto('/');
      const label = page.locator(`${SECTION} label`);
      await label.scrollIntoViewIfNeeded();
      const bars = await pseudoBars(label);
      expect(bars.before, 'left bar').toBe(bars.color);
      expect(bars.after, 'right bar').toBe(bars.color);
    });

    test(`the logos are drawn ${scheme === 'light' ? 'black' : 'white'}, against the forced canvas`, async ({ page }) => {
      await page.goto('/');
      const img = page.locator(`${SECTION} ul img`).first();
      await expect(img).toHaveCSS('filter', scheme === 'light' ? 'brightness(0)' : 'brightness(0) invert(1)');
    });
  });
}
