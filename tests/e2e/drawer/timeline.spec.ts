import { test, expect, type Page } from '@playwright/test';
import { site } from '../../../content';

test.skip(({ isMobile }) => !isMobile, 'the drawer exists only at mobile width');

async function open(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: site.header.menu.open }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
}

type Frame = { display: string; ty: number; backdrop: number; toggle: boolean };

const sample = (page: Page, action: 'showModal' | 'close') =>
  page.evaluate(
    (action) =>
      new Promise<Frame[]>((resolve) => {
        const dialog = document.querySelector('dialog')!;
        const panel = dialog.querySelector('nav')!;
        const toggle = dialog.previousElementSibling!;
        const read = (): Frame => ({
          display: getComputedStyle(dialog).display,
          ty: new DOMMatrix(getComputedStyle(panel).transform).m42,
          backdrop: Number(getComputedStyle(dialog, '::backdrop').opacity),
          toggle: getComputedStyle(toggle).visibility === 'visible' && getComputedStyle(toggle).opacity === '1',
        });
        dialog[action]();
        const seen = [read()];
        const settled = (f: Frame) => (action === 'close' ? f.display === 'none' : f.ty === 0 && f.backdrop === 1);
        const tick = () => {
          const f = read();
          seen.push(f);
          if (settled(f) || seen.length > 60) resolve(seen);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    action,
  );

test('opening slides the panel down from above the bar while the backdrop fades in', async ({ page }) => {
  await page.goto('/');
  const seen = await sample(page, 'showModal');
  expect(seen[0]!.ty).toBeLessThan(0);
  expect(seen[0]!.backdrop).toBe(0);
  expect(seen.at(-1)).toEqual({ display: 'block', ty: 0, backdrop: 1, toggle: false });
});

test('closing keeps the dialog on screen while the panel slides back up and the backdrop fades out, then removes it', async ({ page }) => {
  await open(page);
  await expect.poll(() => page.evaluate(() => document.querySelector('dialog')!.getAnimations({ subtree: true }).length)).toBe(0);
  const seen = await sample(page, 'close');
  expect(seen[0]).toEqual({ display: 'block', ty: 0, backdrop: 1, toggle: false });
  expect(seen.some((f) => f.display === 'block' && f.ty < 0 && f.backdrop < 1)).toBe(true);
  expect(seen.filter((f) => f.display === 'block').every((f) => !f.toggle)).toBe(true);
  expect(seen.at(-1)!.display).toBe('none');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});
