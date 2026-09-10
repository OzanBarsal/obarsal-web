import type { Page } from '@playwright/test';
import { OPENING_KEY } from '../../../lib/opening/gate';

export { OPENING_KEY };

export const OVERLAY = '#top > div > div[aria-hidden="true"]:last-child';

export async function skipOpening(page: Page): Promise<void> {
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), OPENING_KEY);
}

export async function injectConnection(page: Page, connection: { saveData?: boolean; effectiveType?: string }): Promise<void> {
  await page.addInitScript((c) => {
    Object.defineProperty(navigator, 'connection', { value: c, configurable: true });
  }, connection);
}
