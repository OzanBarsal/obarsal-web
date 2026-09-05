import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { site } from '../../../content';

// `ImageResponse` streams its body, so a Satori throw mid-render still yields a
// `200 image/png` with zero bytes in it. Status and content type alone prove
// nothing: every check below reads the bytes, the signature, the IHDR and the IEND.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// The IEND chunk — the twelve bytes every complete PNG ends with.
const PNG_IEND = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];

async function expectRenderedPng(
  request: APIRequestContext,
  url: string,
  expected: { width: number; height: number },
) {
  const res = await request.get(url);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
  const body = await res.body();
  expect([...body.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
  // IHDR is the first chunk: width at byte 16, height at byte 20, big-endian.
  expect(body.readUInt32BE(16)).toBe(expected.width);
  expect(body.readUInt32BE(20)).toBe(expected.height);
  expect([...body.subarray(-12)]).toEqual(PNG_IEND);
}

test('og:image is present and absolute', async ({ page }) => {
  await page.goto('/');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/^https:\/\/obarsal\.dev\/.*opengraph-image/);
});

test('the og image is actually fetchable and is a rendered 1200x630 PNG', async ({ page, request }) => {
  await page.goto('/');
  const og = (await page.locator('meta[property="og:image"]').getAttribute('content'))!;
  await expectRenderedPng(request, new URL(og).pathname + new URL(og).search, {
    width: 1200,
    height: 630,
  });
});

test('the twitter image is fetchable and is a rendered 1200x630 PNG', async ({ page, request }) => {
  await page.goto('/');
  const twitter = (await page.locator('meta[name="twitter:image"]').getAttribute('content'))!;
  expect(twitter).toMatch(/^https:\/\/obarsal\.dev\/.*twitter-image/);
  await expectRenderedPng(request, new URL(twitter).pathname + new URL(twitter).search, {
    width: 1200,
    height: 630,
  });
});

test('the favicon is fetchable and is a rendered 32x32 PNG', async ({ page, request }) => {
  await page.goto('/');
  const icon = page.locator('link[rel="icon"]');
  expect(await icon.getAttribute('type')).toBe('image/png');
  const href = (await icon.getAttribute('href'))!;
  await expectRenderedPng(request, href, { width: 32, height: 32 });
});

test('the card alt text is built from the approved identity copy', async ({ page }) => {
  await page.goto('/');
  const expected = `${site.meta.name} \u2014 ${site.meta.jobTitle}`;
  expect(await page.locator('meta[property="og:image:alt"]').getAttribute('content')).toBe(expected);
  expect(await page.locator('meta[name="twitter:image:alt"]').getAttribute('content')).toBe(expected);
});
