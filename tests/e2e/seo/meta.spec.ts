import { test, expect } from '@playwright/test';
import { site } from '../../../content';

test('title and description match the approved copy exactly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(site.meta.title);
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  expect(desc).toBe(site.meta.description);
});

test('canonical and Open Graph URLs are absolute', async ({ page }) => {
  await page.goto('/');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toMatch(/^https:\/\/obarsal\.dev/);
  const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
  expect(ogUrl).toMatch(/^https:\/\/obarsal\.dev/);
});

test('Open Graph and Twitter card tags are present with the approved copy', async ({ page }) => {
  await page.goto('/');
  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
  expect(ogTitle).toBe(site.meta.title);
  const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
  expect(ogDescription).toBe(site.meta.description);
  const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
  expect(ogType).toBe('profile');
  const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
  expect(twitterCard).toBe('summary_large_image');
  const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
  expect(twitterTitle).toBe(site.meta.title);
});

test('JSON-LD Person is present and parses', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw!);
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe(site.meta.name);
  expect(data.jobTitle).toBe(site.meta.jobTitle);
  expect(data.sameAs).toHaveLength(site.meta.sameAs.length);
  expect(data.address).toBeUndefined();
  expect(data.homeLocation).toBeUndefined();
});

test('JSON-LD knowsAbout is drawn from the first Skills group', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw!);
  const expected = site.skills.groups[0]!.items;
  expect(data.knowsAbout).toEqual(expected);
});

// A smoke check, not a guard: today's copy has no `<`. The guard is in lib/jsonLd.test.ts.
test('served JSON-LD has no angle bracket and parses as Person', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  expect(raw).not.toContain('<');
  expect(JSON.parse(raw!)['@type']).toBe('Person');
});
