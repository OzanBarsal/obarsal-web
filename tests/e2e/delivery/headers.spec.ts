import { test, expect } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'delivery headers do not depend on the viewport');

const IMMUTABLE = 'public, max-age=31536000, immutable';

test('every stylesheet the page links is served immutable for a year', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const hrefs = [...new Set(html.match(/\/_next\/static\/css\/[^"]+\.css/g) ?? [])];
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
    expect(res.headers()['cache-control'], href).toBe(IMMUTABLE);
  }
});

test('both font files are served immutable for a year', async ({ request }) => {
  for (const file of ['SpaceGrotesk-Variable.woff2', 'JetBrainsMono-Variable.woff2']) {
    const res = await request.get(`/fonts/${file}`);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['cache-control'], file).toBe(IMMUTABLE);
  }
});
