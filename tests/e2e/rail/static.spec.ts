import { test, expect } from '@playwright/test';
import { INDICES, SELECTORS, readSegments, readLabelsLit } from './segments';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every section carries an empty, unlit rail segment with its index', async ({ page }) => {
    await page.goto('/');
    const segments = await readSegments(page);
    expect(segments.map((s) => s.index)).toEqual(INDICES);
    expect(segments.every((s) => s.p === 0 && !s.lit && !s.tipShown)).toBe(true);
    expect(await readLabelsLit(page)).toEqual(INDICES.map(() => false));
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the rail is a full static line: every segment filled and lit, no tip, no transition', async ({ page }) => {
    await page.goto('/');
    const segments = await readSegments(page);
    expect(segments.map((s) => s.index)).toEqual(INDICES);
    expect(segments.every((s) => s.p === 1 && s.lit && !s.tipShown)).toBe(true);
    expect(await readLabelsLit(page)).toEqual(INDICES.map(() => true));
    const classes = await page.evaluate((s) => ({
      main: document.querySelector('main')!.classList.length,
      segments: Array.from(document.querySelectorAll(s.segment)).map((root) => root.classList.length),
    }), SELECTORS);
    expect(classes.main, 'the loop added live to main: it ran under reduced motion').toBe(0);
    expect(
      classes.segments,
      "a segment's static classes changed: every root carries segment alone",
    ).toEqual(INDICES.map(() => 1));
  });
});

test('the line is 1px wide on the gutter edge, with the 9px tick centred on it, and every fill starts at its line top', async ({ page }) => {
  await page.goto('/');
  const geometry = await page.evaluate((s) =>
    Array.from(document.querySelectorAll(s.segment)).map((root) => {
      const fill = root.querySelector(s.fill)!.getBoundingClientRect();
      const tick = root.querySelector(s.tick)!.getBoundingClientRect();
      const cell = root.getBoundingClientRect();
      return {
        line: root.querySelector(s.line)!.getBoundingClientRect().width,
        fillWidth: fill.width,
        flush: Math.abs(fill.right - cell.right),
        tickWidth: tick.width,
        centred: Math.abs(tick.left + tick.width / 2 - (fill.left + fill.width / 2)),
        overflowX: getComputedStyle(root.querySelector(s.line)!).overflowX,
      };
    }), SELECTORS);
  expect(geometry).toHaveLength(INDICES.length);
  expect(
    geometry.every((g) => g.line === 1 && g.fillWidth === 1 && g.flush < 0.5 && g.tickWidth === 9 && g.centred < 0.5 && g.overflowX === 'visible'),
  ).toBe(true);
  const segments = await readSegments(page);
  expect(segments.every((s) => Math.abs(s.fillTop - s.lineTop) < 0.5)).toBe(true);
});

test('the line starts at the top of the document under the header; the first tick is the header height lower than every other tick sits in its row', async ({ page }) => {
  await page.goto('/');
  const read = await page.evaluate((s) => {
    const t = (n: string) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
    const roots = Array.from(document.querySelectorAll<HTMLElement>(s.segment));
    return {
      headerH: t('--header-h'),
      padTop: t('--body-pad-top'),
      offsets: roots.map((root) => {
        const line = root.querySelector(s.line)!.getBoundingClientRect();
        const tick = root.querySelector(s.tick)!.getBoundingClientRect();
        return { lineTop: line.top + scrollY, tick: tick.top - line.top };
      }),
    };
  }, SELECTORS);
  expect(read.offsets[0]!.lineTop).toBe(0);
  expect(read.offsets[0]!.tick).toBe(read.headerH + read.padTop + 6);
  for (const o of read.offsets.slice(1)) expect(o.tick).toBe(read.padTop + 6);
});
