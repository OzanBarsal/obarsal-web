import { test, expect } from '@playwright/test';
import { site } from '../../../content';

test('has exactly one h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('heading levels never skip', async ({ page }) => {
  await page.goto('/');
  const levels = await page.$$eval('h1,h2,h3,h4,h5,h6', (els) =>
    els.map((el) => Number(el.tagName[1])),
  );
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  }
});

test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('a[href="#main"]')).toBeFocused();
  // A fragment link moves the scroll, not the focus, unless the target can hold focus.
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('has the required landmarks', async ({ page }) => {
  await page.goto('/');
  // Roles, not tag names: a <footer> inside a <section> exposes no contentinfo landmark.
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.locator('main#main')).toHaveCount(1);
});

test('every in-page anchor points at an element that exists', async ({ page }) => {
  await page.goto('/');
  const { hrefs, broken } = await page.$$eval('a[href^="#"]', (links) => {
    const hrefs = links.map((a) => a.getAttribute('href')!);
    return { hrefs, broken: hrefs.filter((href) => !document.getElementById(href.slice(1))) };
  });
  expect(hrefs.length).toBeGreaterThan(0);
  expect(broken).toEqual([]);
});

test('client wall lists every client name', async ({ page }) => {
  await page.goto('/');
  // Located by the section, not by a tile name: a name can also appear in a card's meta list.
  const wall = page.locator(`section[aria-labelledby="section-${site.clients.section.index}"]`);
  const wallItems = wall.locator('ul > li');
  await expect(wallItems).toHaveCount(site.clients.names.length);
});

test('footer shows the current year', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo')).toContainText(String(new Date().getFullYear()));
});

test('the status pill sits beside the wordmark, outside the section nav', async ({ page }) => {
  await page.goto('/');
  const shown = site.header.availability.show ? 1 : 0;
  await expect(page.locator('header > div > a + span')).toHaveCount(shown);
  await expect(page.locator('header nav span')).toHaveCount(0);
});
