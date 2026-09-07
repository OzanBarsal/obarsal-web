import { test, expect } from '@playwright/test';
import { site } from '../../../content';

test.use({ javaScriptEnabled: false });

test('the menu opens and closes by invoker commands with JavaScript disabled', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the drawer exists only at mobile width');
  await page.goto('/');
  await page.getByRole('button', { name: site.header.menu.open }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.getByRole('button', { name: site.header.menu.close }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});
