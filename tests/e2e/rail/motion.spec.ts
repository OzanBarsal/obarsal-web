import { test, expect } from '@playwright/test';
import { site } from '../../../content';
import { INDICES, SELECTORS, readSegments, readLabelsLit } from './segments';

test('at scroll zero the first segment is filled from its line top to its 00 tick', async ({ page }) => {
  await page.goto('/');
  const hero = (await readSegments(page))[0]!;
  expect(hero.index).toBe(site.hero.index);
  await expect
    .poll(async () => {
      const settling = (await readSegments(page))[0]!;
      return Math.abs(settling.fillBottom - settling.tickTop) < 1 && settling.lit;
    })
    .toBe(true);
  const settled = (await readSegments(page))[0]!;
  expect(Math.abs(settled.fillBottom - settled.tickTop)).toBeLessThan(1);
  expect(Math.abs(settled.fillTop - settled.lineTop)).toBeLessThan(0.5);
  expect(Math.abs(settled.dotCentre - settled.fillBottom)).toBeLessThan(0.5);
  expect(settled.lit).toBe(true);
});

test('after the first frame the rail eases one shared tip on main with a transition', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('main')!);
        return style.transitionProperty === '--rail-tip' && parseFloat(style.transitionDuration) > 0;
      }),
    )
    .toBe(true);
});

test('at the bottom of the page every segment is full and every index is lit', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect
    .poll(async () => (await readSegments(page)).every((s) => s.p > 0.999 && s.lit && !s.tipShown))
    .toBe(true);
});

test('with the work section at the top, segments above are full and lit, below are empty and unlit, and only the work segment shows the tip', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => document.getElementById(id)!.scrollIntoView({ behavior: 'instant' }), site.work.section.id!);
  await expect
    .poll(async () => {
      const segments = await readSegments(page);
      const at = segments.findIndex((s) => s.index === site.work.section.index);
      const above = segments.slice(0, at).every((s) => s.p > 0.999 && s.lit && !s.tipShown);
      const here = segments[at];
      const within = here !== undefined && here.p > 0 && here.p < 1 && here.lit && here.tipShown;
      const below = segments.slice(at + 1).every((s) => s.p < 0.001 && !s.lit && !s.tipShown);
      return above && within && below;
    })
    .toBe(true);
  const lit = await readLabelsLit(page);
  const at = INDICES.indexOf(site.work.section.index!);
  expect(lit).toEqual(INDICES.map((_, i) => i <= at));
});

test('while the fills catch up after a jump down the page only one segment is ever mid-fill, so the line never breaks at a seam', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readSegments(page)).filter((s) => s.p > 0 && s.p < 1).length).toBe(1);
  const counts = await page.evaluate((s) => new Promise<number[]>((resolve) => {
    const fills = Array.from(document.querySelectorAll(s.segment)).map((root) => root.querySelector(s.fill)!);
    const seen: number[] = [];
    const until = performance.now() + 300;
    const read = () => {
      seen.push(fills.map((f) => Number(getComputedStyle(f).transform.split(',')[3])).filter((p) => p > 0 && p < 1).length);
      if (performance.now() < until) requestAnimationFrame(read);
      else resolve(seen);
    };
    window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: 'instant' });
    requestAnimationFrame(read);
  }), SELECTORS);
  expect(counts.length).toBeGreaterThan(2);
  expect(counts.some((n) => n === 1)).toBe(true);
  expect(counts.every((n) => n <= 1)).toBe(true);
});
