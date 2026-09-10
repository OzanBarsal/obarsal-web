import { test, expect } from '@playwright/test';
import { OPENING_KEY, OVERLAY, injectConnection, skipOpening } from './skip';

const opening = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.opening ?? null);
const stored = (page: import('@playwright/test').Page) =>
  page.evaluate((key) => sessionStorage.getItem(key), OPENING_KEY);

test('a fresh session plays: the root is marked playing or done and the key is written', async ({ page }) => {
  await page.goto('/');
  expect(await opening(page)).toMatch(/^(playing|done)$/);
  expect(await stored(page)).toBe('1');
});

test('the second navigation in a session is skipped: no attribute, overlay not displayed', async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  expect(await opening(page)).toBeNull();
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
});

test('reduced motion skips and never writes the key', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await opening(page)).toBeNull();
  expect(await stored(page)).toBeNull();
});

test('a metered connection skips', async ({ page }) => {
  await injectConnection(page, { saveData: true });
  await page.goto('/');
  expect(await opening(page)).toBeNull();
});

test('while playing, every rail track carries a 1400ms transform transition from its top', async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const rule = await page.evaluate(() => {
    document.documentElement.dataset.opening = 'playing';
    const lines = Array.from(document.querySelectorAll('main [aria-hidden="true"]:first-child > div'));
    const read = lines.map((l) => {
      const s = getComputedStyle(l);
      return `${s.transitionProperty} ${s.transitionDuration} ${s.transformOrigin.split(' ')[1]}`;
    });
    delete document.documentElement.dataset.opening;
    return read;
  });
  expect(rule.length).toBeGreaterThan(0);
  expect(rule.every((r) => r.startsWith('transform 1.4s') && r.endsWith('0px'))).toBe(true);
});

test('in beat 0 the left readout transitions over 1400ms; in beat 2 the chips decay with ease-out', async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const read = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    document.documentElement.dataset.opening = 'playing';
    const readLeft = getComputedStyle(el.children[4]!).transitionDuration;
    el.dataset.beat = '2';
    const chips = Array.from(el.children).slice(6).map((c) => getComputedStyle(c).transitionTimingFunction);
    delete el.dataset.beat;
    delete document.documentElement.dataset.opening;
    return { readLeft, chips };
  }, OVERLAY);
  expect(read.readLeft).toBe('1.4s');
  expect(read.chips).toEqual(['ease-out', 'ease-out', 'ease-out']);
});

test('the hero body keeps its box when the overlay becomes a grid item', async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const [idle, playing] = await page.evaluate(() => {
    const body = document.querySelector('#top > div > div:nth-child(2)') as HTMLElement;
    const box = () => {
      const r = body.getBoundingClientRect();
      return { left: r.left, width: r.width, height: r.height };
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
