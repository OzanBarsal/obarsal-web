import { test, expect } from '@playwright/test';

// A harness check: asserts nothing about content.
test('preview server boots and serves a driveable document', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toBeAttached();
});
