import { expect, type Page } from '@playwright/test';

export const OVERLAY = 'body > div[aria-hidden="true"]';

export async function injectConnection(page: Page, connection: { saveData?: boolean; effectiveType?: string }): Promise<void> {
  await page.addInitScript((c) => {
    Object.defineProperty(navigator, 'connection', { value: c, configurable: true });
  }, connection);
}

export const skipOpening = (page: Page): Promise<void> => injectConnection(page, { saveData: true });

export async function played(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^0/);
  await expect(page.locator(OVERLAY)).not.toHaveCSS('display', 'none');
}
