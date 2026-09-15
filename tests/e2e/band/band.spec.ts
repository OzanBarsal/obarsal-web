import { test, expect, type Locator } from '@playwright/test';
import { site } from '../../../content';

const SECTION = `section[aria-labelledby="section-${site.clients.section.index}"]`;
// The clipping box, not the track: Playwright waits for a stable bounding box, and the track moves.
const BAND = `${SECTION} div:has(> ul)`;
const logos = site.clients.logos;

// A lazy image inside the clip's overflow fetches only once it intersects the clip; eager flips every pending fetch on.
const loadAll = (band: Locator) =>
  band.locator('img').evaluateAll((els) => els.forEach((el) => { (el as HTMLImageElement).loading = 'eager'; }));

test('the band lists every logo twice, the second copy out of the accessibility tree', async ({ page }) => {
  await page.goto('/');
  const items = page.locator(`${SECTION} li`);
  await expect(items).toHaveCount(logos.length * 2);
  const read = await items.evaluateAll((els) =>
    els.map((el) => {
      const img = el.querySelector('img');
      return {
        hidden: el.getAttribute('aria-hidden'),
        alt: img?.getAttribute('alt'),
        src: img?.getAttribute('src'),
        width: img?.getAttribute('width'),
        height: img?.getAttribute('height'),
        loading: img?.getAttribute('loading'),
      };
    }),
  );
  expect(read).toEqual(
    [...logos, ...logos].map((logo, i) => ({
      hidden: i < logos.length ? null : 'true',
      alt: logo.name,
      src: logo.src,
      width: String(logo.width),
      height: String(logo.height),
      loading: 'lazy',
    })),
  );
});

test('every logo path resolves: flipped to eager, all 26 images decode', async ({ page }) => {
  await page.goto('/');
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  await loadAll(band);
  await expect
    .poll(
      () =>
        band
          .locator('img')
          .evaluateAll((els) => els.filter((el) => { const img = el as HTMLImageElement; return img.complete && img.naturalWidth > 0; }).length),
      { timeout: 15_000 },
    )
    .toBe(logos.length * 2);
});

test('every logo reserves a box within a pixel of its decoded ratio', async ({ page }) => {
  await page.goto('/');
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  await loadAll(band);
  await expect
    .poll(
      () =>
        band.locator('img').evaluateAll((els) =>
          els
            .map((el) => {
              const img = el as HTMLImageElement;
              const reserved = Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
              const decoded = img.naturalWidth / img.naturalHeight;
              const drift = Math.abs(reserved - decoded) * img.getBoundingClientRect().height;
              return { alt: img.alt, drift, shown: Math.round(drift * 100) / 100 };
            })
            .filter((seen) => !(seen.drift < 1))
            .map((seen) => ({ alt: seen.alt, drift: seen.shown })),
        ),
      { timeout: 15_000 },
    )
    .toEqual([]);
});

test('the track runs, and its two halves are the same width, so the loop has no seam', async ({ page }) => {
  await page.goto('/');
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  const track = band.locator('ul');
  await expect(track).toHaveCSS('animation-iteration-count', 'infinite');
  await expect(track).toHaveCSS('animation-timing-function', 'linear');

  const before = await track.evaluate((el) => getComputedStyle(el).transform);
  await expect.poll(() => track.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);

  const { scrollWidth, first, second } = await track.evaluate((el, n) => {
    const widths = [...el.children].map((li) => li.getBoundingClientRect().width);
    const sum = (w: number[]) => w.reduce((a, b) => a + b, 0);
    return { scrollWidth: el.scrollWidth, first: sum(widths.slice(0, n)), second: sum(widths.slice(n)) };
  }, logos.length);
  expect(second).toBeCloseTo(first, 2);
  expect(Math.abs(scrollWidth - first * 2)).toBeLessThanOrEqual(1);
});

test.describe('under reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the band is the static wall, four columns at desktop and two at mobile', async ({ page, isMobile }) => {
    await page.goto('/');
    const band = page.locator(BAND);
    await band.scrollIntoViewIfNeeded();
    const track = band.locator('ul');
    await expect(track).toHaveCSS('animation-name', 'none');
      await expect(track).toHaveCSS('overflow', 'hidden');
    const cells = await track.evaluate((el) =>
      [...el.children].map((li) => {
        const rect = li.getBoundingClientRect();
        return {
          hidden: li.hasAttribute('aria-hidden'),
          display: getComputedStyle(li).display,
          x: Math.round(rect.x),
          height: Math.round(rect.height),
        };
      }),
    );
    const hidden = cells.filter((c) => c.hidden);
    expect(hidden).toHaveLength(logos.length);
    expect(hidden.map((c) => c.display)).toEqual(hidden.map(() => 'none'));
    const shown = cells.filter((c) => !c.hidden);
    expect(shown).toHaveLength(logos.length);
    expect(shown.map((c) => c.height)).toEqual(shown.map(() => 96));
    expect(new Set(shown.map((c) => c.x)).size).toBe(isMobile ? 2 : 4);
  });
});

test('hovering the band pauses the loop and leaving it starts it again', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'a hover state needs a pointer');
  await page.goto('/');
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  const track = band.locator('ul');
  await band.hover();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS('animation-play-state', 'running');
});
