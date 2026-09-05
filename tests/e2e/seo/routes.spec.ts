import { test, expect } from '@playwright/test';

test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('Allow: /');
  expect(body).toContain('https://obarsal.dev/sitemap.xml');
});

test('sitemap.xml lists the site root', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('https://obarsal.dev');
});
