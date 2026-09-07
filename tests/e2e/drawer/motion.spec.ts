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
