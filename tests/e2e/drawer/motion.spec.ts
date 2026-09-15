import { test, expect, type Page } from '@playwright/test';
import { site } from '../../../content';

test.skip(({ isMobile }) => !isMobile, 'the drawer exists only at mobile width');

async function open(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: site.header.menu.open }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
}

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

test('under reduced motion the dialog, its backdrop, the panel and the closed toggle take no time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const delay = await page.evaluate(() => getComputedStyle(document.querySelector('dialog')!.previousElementSibling!).transitionDelay);
  await open(page);
  const durations = await page.evaluate(() => {
    const dialog = document.querySelector('dialog')!;
    const toggle = dialog.previousElementSibling!;
    const close = dialog.querySelector('button')!;
    return [dialog, dialog.querySelector('nav')!]
      .map((el) => getComputedStyle(el).transitionDuration)
      .concat(getComputedStyle(dialog, '::backdrop').transitionDuration)
      .concat(
        [toggle, close].flatMap((el) => [
          getComputedStyle(el, '::before').transitionDuration,
          getComputedStyle(el, '::after').transitionDuration,
        ]),
      );
  });
  for (const t of durations.concat(delay).flatMap((d) => d.split(', '))) expect(['0s', '1e-06s']).toContain(t);
});

test('the toggle and close pseudo-elements transition over 180ms', async ({ page }) => {
  await open(page);
  const durations = await page.evaluate(() => {
    const btn = document.querySelector('dialog[open] button')!;
    return [getComputedStyle(btn, '::before').transitionDuration, getComputedStyle(btn, '::after').transitionDuration];
  });
  for (const t of durations.flatMap((d) => d.split(', '))) expect(t).toBe('0.18s');
});

test('while open the close control draws an X: 22px pseudo-elements rotated 45deg either way', async ({ page }) => {
  await open(page);
  await expect.poll(() => page.evaluate(() => document.querySelector('dialog')!.getAnimations({ subtree: true }).length)).toBe(0);
  const openStyle = await page.evaluate(() => {
    const btn = document.querySelector('dialog[open] button')!;
    const matrix = (pseudo: string) => {
      const m = new DOMMatrix(getComputedStyle(btn, pseudo).transform);
      return { a: m.a, b: m.b };
    };
    return {
      beforeWidth: getComputedStyle(btn, '::before').width,
      afterWidth: getComputedStyle(btn, '::after').width,
      beforeShadow: getComputedStyle(btn, '::before').boxShadow,
      before: matrix('::before'),
      after: matrix('::after'),
    };
  });
  expect(openStyle.beforeWidth).toBe('22px');
  expect(openStyle.afterWidth).toBe('22px');
  expect(openStyle.beforeShadow).toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/);
  expect(openStyle.before.a).toBeCloseTo(Math.SQRT1_2, 3);
  expect(openStyle.before.b).toBeCloseTo(Math.SQRT1_2, 3);
  expect(openStyle.after.a).toBeCloseTo(Math.SQRT1_2, 3);
  expect(openStyle.after.b).toBeCloseTo(-Math.SQRT1_2, 3);
});

test('a tap below the panel closes the dialog and returns focus to the toggle', async ({ page }) => {
  await open(page);
  const { width, height } = page.viewportSize()!;
  await page.mouse.click(width / 2, height - 1);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect((await active(page)).label).toBe(site.header.menu.open);
});

test('a tap on the strip text inside the panel leaves the dialog open', async ({ page }) => {
  await open(page);
  await page.locator('dialog nav ul li').first().click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
});
