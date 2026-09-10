import { test, expect, type Page } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { OVERLAY, skipOpening } from './skip';

type Pin = { __pinOpening: boolean };

const opening = (page: Page) => page.evaluate(() => document.documentElement.dataset.opening ?? null);

test('the beats land in order and the sequence ends in done with the overlay hidden', async ({ page }) => {
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
  await expect.poll(() => opening(page), { timeout: 10_000 }).toBe('done');
  const beats = await page.evaluate(() => (window as unknown as { __beats: string[] }).__beats);
  const distinct = beats.filter((b, i) => beats.indexOf(b) === i);
  expect(distinct.slice(-3)).toEqual(['1', '2', '3']);
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
});

test('a keypress aborts: done at once, transitions off', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^[0-2]$/);
  await page.keyboard.press('Shift');
  await expect.poll(() => opening(page), { timeout: 500 }).toBe('done');
  const cut = await page.locator(OVERLAY).evaluate((el) => getComputedStyle(el.children[0]!).transitionDuration);
  expect(cut).toBe('0s');
});

test('the readouts and chips report the measured page', async ({ page }, testInfo) => {
  await page.addInitScript((sel) => {
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.querySelector(sel)!;
      (window as unknown as { __width: number }).__width = Math.round(el.getBoundingClientRect().width);
    });
  }, OVERLAY);
  await page.goto('/');
  await expect.poll(() => opening(page), { timeout: 10_000 }).toBe('done');
  const read = await page.locator(OVERLAY).evaluate((el) => {
    const row = el.parentElement!;
    const texts = Array.from(el.querySelectorAll('span')).map((s) => s.textContent);
    return {
      texts,
      width: (window as unknown as { __width: number }).__width,
      gutter: Math.round(Number.parseFloat(getComputedStyle(row).gridTemplateColumns)),
      grid: getComputedStyle(row).gridTemplateColumns,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    };
  });
  const pad = (n: number) => String(n).padStart(4, '0');
  expect(read.texts[0]).toBe(pad(read.width));
  expect(read.texts[1]).toBe(pad(read.gutter));
  expect(read.texts[2]).toBe(`font-size: ${testInfo.project.name === 'desktop' ? '82px' : '36px'}`);
  expect(read.texts[3]).toBe(`--accent: ${read.accent}`);
  expect(read.texts[4]).toBe(`grid: ${read.grid}`);
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
