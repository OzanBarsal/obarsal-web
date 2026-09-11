import { test, expect, type Page } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { OVERLAY, skipOpening } from './skip';

type Pin = { __pinOpening: boolean };

const opening = (page: Page) => page.evaluate(() => document.documentElement.dataset.opening ?? null);

const text = (page: Page, key: string) => page.locator(`${OVERLAY} [data-k="${key}"]`).textContent();

test('the beats accumulate in order and the sequence ends in done with the overlay hidden', async ({ page }) => {
  await page.addInitScript((sel) => {
    const seen: string[] = [];
    (window as unknown as { __beats: string[] }).__beats = seen;
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.querySelector(sel)!;
      new MutationObserver(() => seen.push(el.getAttribute('data-beat') ?? '')).observe(el, {
        attributes: true, attributeFilter: ['data-beat'],
      });
    });
  }, OVERLAY);
  await page.goto('/');
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  const beats = await page.evaluate(() => (window as unknown as { __beats: string[] }).__beats);
  const distinct = beats.filter((b, i) => beats.indexOf(b) === i);
  expect(distinct.slice(-4)).toEqual(['0', '0 1', '0 1 2', '0 1 2 3']);
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
});

test('a keypress aborts: done within 500ms and the overlay stops being displayed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^0( 1( 2)?)?$/);
  await page.keyboard.press('Shift');
  await expect.poll(() => opening(page), { timeout: 500 }).toBe('done');
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
});

test('the lines sit on the heading box: verticals on its left and right, rules on its top and bottom, each rule as wide as the heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^0/);
  const read = await page.locator(OVERLAY).evaluate((el) => {
    const r = (n: number) => Math.round(n);
    const box = (sel: string) => el.querySelector(sel)!.getBoundingClientRect();
    const h1 = document.querySelector('h1')!.getBoundingClientRect();
    return {
      h1: [r(h1.left), r(h1.right), r(h1.top), r(h1.bottom)],
      width: r(h1.width),
      lines: [
        r(box('[data-k="h1-left"]').left), r(box('[data-k="h1-right"]').right),
        r(box('[data-k="h1-top"]').top), r(box('[data-k="h1-bottom"]').bottom),
      ],
      spans: [r(box('[data-k="h1-top"]').width), r(box('[data-k="h1-bottom"]').width)],
    };
  });
  expect(read.lines).toEqual(read.h1);
  expect(read.spans).toEqual([read.width, read.width]);
});

test('placement waits for the faces: with the fonts held back, the frame still sits on the heading', async ({ page }) => {
  await page.route('**/fonts/*.woff2', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^0/, { timeout: 20_000 });
  const read = await page.locator(OVERLAY).evaluate(async (el) => {
    await document.fonts.ready;
    const r = (n: number) => Math.round(n);
    const box = (sel: string) => el.querySelector(sel)!.getBoundingClientRect();
    const h1 = document.querySelector('h1')!.getBoundingClientRect();
    return {
      h1: [r(h1.left), r(h1.right), r(h1.top), r(h1.bottom)],
      lines: [
        r(box('[data-k="h1-left"]').left), r(box('[data-k="h1-right"]').right),
        r(box('[data-k="h1-top"]').top), r(box('[data-k="h1-bottom"]').bottom),
      ],
    };
  });
  expect(read.lines).toEqual(read.h1);
});

test('the readouts report the measured viewport, header, heading size and heading box', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  const measured = await page.evaluate(() => {
    const h1 = document.querySelector('h1')!.getBoundingClientRect();
    const pad = (n: number) => String(Math.round(n)).padStart(4, '0');
    return { vw: window.innerWidth, vh: window.innerHeight, w: pad(h1.width), h: pad(h1.height) };
  });
  expect(await text(page, 'viewport')).toBe(`viewport: ${measured.vw}×${measured.vh}`);
  expect(await text(page, 'header')).toMatch(/^header: 66px/);
  expect(await text(page, 'h1')).toMatch(testInfo.project.name === 'desktop' ? /^h1: 82px/ : /^h1: 36px/);
  expect(await text(page, 'width')).toBe(measured.w);
  expect(await text(page, 'height')).toBe(measured.h);
  const paraCount = await page.evaluate(
    () => document.querySelector('main section')!.querySelectorAll('p').length - 1,
  );
  const para = await text(page, 'para');
  const match = para?.match(/×(\d+)$/);
  expect(match, para ?? 'no para chip').not.toBeNull();
  expect(Number(match![1])).toBe(paraCount);
  expect(paraCount).toBeGreaterThan(0);
});

test.describe('with the software-renderer check hidden', () => {
  test.beforeEach(({ page }) => allowSoftwareGpu(page));

  test('no vein is live while the root says playing, and veins grow once it says done', async ({ page }) => {
    await skipOpening(page);
    await page.addInitScript(() => {
      const pin = window as unknown as Pin;
      pin.__pinOpening = true;
      document.addEventListener('DOMContentLoaded', () => {
        const html = document.documentElement;
        html.dataset.opening = 'playing';
        new MutationObserver(() => {
          if (pin.__pinOpening && html.dataset.opening !== 'playing') html.dataset.opening = 'playing';
        }).observe(html, { attributes: true, attributeFilter: ['data-opening'] });
      });
    });
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
    await page.waitForTimeout(2000);
    expect(Number(await canvas.getAttribute('data-frames'))).toBeGreaterThan(0);
    expect(await canvas.getAttribute('data-live')).toBe('0');
    await page.evaluate(() => {
      (window as unknown as Pin).__pinOpening = false;
      document.documentElement.dataset.opening = 'done';
    });
    await expect.poll(() => canvas.getAttribute('data-live').then(Number), { timeout: 10_000 }).toBeGreaterThan(0);
  });
});
