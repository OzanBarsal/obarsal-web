import { test, expect, type Page } from '@playwright/test';
import { site } from '../../../content';
import { OVERLAY, injectConnection, skipOpening } from './skip';

const opening = (page: Page) => page.evaluate(() => document.documentElement.dataset.opening ?? null);

const placed = (page: Page) => page.locator(OVERLAY).evaluate((el) =>
  Array.from(el.children).filter((c) => (c as HTMLElement).style.getPropertyValue('--i') !== '').length);

const skipped = async (page: Page) => {
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
  expect(await placed(page)).toBe(0);
};

test('a heading restored off the top of the viewport skips: done, hidden, nothing placed', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  await page.evaluate(() => scrollTo({ top: 800, behavior: 'instant' }));
  await page.reload();
  await skipped(page);
});

test('a deep-linked load skips: done, hidden, nothing placed', async ({ page }) => {
  await page.goto(`/#${site.skills.section.id}`);
  await skipped(page);
});

test('every load plays: a reload after done marks the root playing or done again', async ({ page }) => {
  await page.goto('/');
  expect(await opening(page)).toMatch(/^(playing|done)$/);
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  await page.reload();
  expect(await opening(page)).toMatch(/^(playing|done)$/);
});

test('reduced motion skips', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await opening(page)).toBeNull();
});

test('a metered connection skips: no attribute, overlay not displayed', async ({ page }) => {
  await injectConnection(page, { saveData: true });
  await page.goto('/');
  expect(await opening(page)).toBeNull();
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
});

test("under playing, the rail's lines carry no transition: the opening's draw-in rule stays deleted", async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const durations = await page.evaluate(() => {
    document.documentElement.dataset.opening = 'playing';
    const lines = Array.from(document.querySelectorAll('main [aria-hidden="true"] > div'));
    const read = lines.map((l) => getComputedStyle(l).transitionDuration);
    delete document.documentElement.dataset.opening;
    return read;
  });
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((d) => d === '0s')).toBe(true);
});

test("the page's layout is identical with and without playing", async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const [idle, playing] = await page.evaluate(() => {
    const box = () => {
      const r = document.querySelector('h1')!.getBoundingClientRect();
      return { height: document.documentElement.scrollHeight, left: r.left, top: r.top, width: r.width };
    };
    const before = box();
    document.documentElement.dataset.opening = 'playing';
    const after = box();
    delete document.documentElement.dataset.opening;
    return [before, after];
  });
  expect(playing).toEqual(idle);
});

test('under reduced motion the overlay stays display none even while the root says playing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipOpening(page);
  await page.goto('/');
  const display = await page.evaluate((sel) => {
    document.documentElement.dataset.opening = 'playing';
    const read = getComputedStyle(document.querySelector(sel) as HTMLElement).display;
    delete document.documentElement.dataset.opening;
    return read;
  }, OVERLAY);
  expect(display).toBe('none');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('no attribute, no overlay, tracks static', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('html').getAttribute('data-opening')).toBeNull();
    const overlay = page.locator(OVERLAY);
    await expect(overlay).toHaveCount(1);
    await expect(overlay).toHaveCSS('display', 'none');
  });
});
