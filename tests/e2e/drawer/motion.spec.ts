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

const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return { href: el?.getAttribute('href'), label: el?.getAttribute('aria-label') };
  });

test('tapping the toggle opens a modal dialog with focus on the first row', async ({ page }) => {
  await open(page);
  expect(await page.locator('dialog').evaluate((d) => d.matches(':modal'))).toBe(true);
  expect((await active(page)).href).toBe(site.header.links[0]!.href);
});

test('Escape closes it and returns focus to the toggle', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect((await active(page)).label).toBe(site.header.menu.open);
});

test('the close control is 48px, named from the content, and closes the dialog', async ({ page }) => {
  await open(page);
  const close = page.getByRole('button', { name: site.header.menu.close });
  const box = (await close.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(48);
  await close.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('activating a row closes the dialog and moves to its section', async ({ page }) => {
  await open(page);
  const { href } = site.header.links[1]!;
  await page.locator(`dialog a[href="${href}"]`).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => location.hash)).toBe(href);
});

test('every row is at least 48px tall while open', async ({ page }) => {
  await open(page);
  const heights = await page.locator('dialog nav a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height));
  expect(heights.length).toBe(site.header.links.length + 1);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(48);
});

test('the page cannot scroll while the dialog is open, and can again once it closes', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  await page.mouse.wheel(0, 600);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
});

test('each row is named by its label alone: the index is generated content outside the name', async ({ page }) => {
  await open(page);
  for (const l of site.header.links) {
    await expect(page.getByRole('link', { name: l.label, exact: true })).toHaveCount(1);
  }
});

test('the toggle is hidden while the dialog is open and visible again once it closes', async ({ page }) => {
  await open(page);
  const toggle = page.getByRole('button', { name: site.header.menu.open });
  await expect(toggle).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(toggle).toBeVisible();
});

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

test('under reduced motion the dialog, its backdrop, the panel and the closed toggle take no time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const delay = await page.evaluate(() => getComputedStyle(document.querySelector('dialog')!.previousElementSibling!).transitionDelay);
  await open(page);
  const durations = await page.evaluate(() => {
    const dialog = document.querySelector('dialog')!;
    return [dialog, dialog.querySelector('nav')!].map((el) => getComputedStyle(el).transitionDuration).concat(getComputedStyle(dialog, '::backdrop').transitionDuration);
  });
  for (const t of durations.concat(delay)) expect(['0s', '1e-06s']).toContain(t);
});
