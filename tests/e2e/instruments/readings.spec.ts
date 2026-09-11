import { test, expect } from '@playwright/test';
import { OVERLAY, played } from '../opening/skip';

test('no shown chip reads a fractional pixel value', async ({ page }) => {
  await played(page);
  const texts = await page.locator(`${OVERLAY} span[data-k]`).evaluateAll((nodes) =>
    nodes.filter((n) => !(n as HTMLElement).hidden).map((n) => n.textContent ?? ''));
  expect(texts.length).toBeGreaterThan(4);
  for (const t of texts) expect(t).not.toMatch(/\d\.\d+px/);
});

test('the rail chips read the live rail: a tip in whole pixels and the 100ms fill, whether or not they find room', async ({ page }) => {
  await played(page);
  await expect(page.locator(`${OVERLAY} [data-k="rail-tip"]`)).toHaveText(/^rail: tip \d+$/);
  await expect(page.locator(`${OVERLAY} [data-k="rail-fill"]`)).toHaveText('rail: fill 0.1s');
});

test('the clock never reads a negative elapsed time, first frame included', async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { clockSeen: string[] }).clockSeen = seen;
    new MutationObserver((records) => {
      for (const r of records) {
        const n = (r.target.nodeType === 3 ? r.target.parentElement : r.target) as HTMLElement | null;
        if (n?.dataset.k === 'clock') seen.push(n.textContent ?? '');
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await played(page);
  await expect(page.locator(`${OVERLAY} [data-k="clock"]`)).toHaveText(/^t\+\d{4}ms$/);
  const seen = await page.evaluate(() => (window as unknown as { clockSeen: string[] }).clockSeen);
  expect(seen.length).toBeGreaterThan(1);
  for (const s of seen) expect(s).toMatch(/^t\+\d{4}ms$/);
});
