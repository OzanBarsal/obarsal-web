import { test, expect, type Page } from '@playwright/test';
import { OVERLAY, played } from '../opening/skip';

type Want = { x: number; y: number; w: number; h: number; right: number; bottom: number };
type Edge = { x: number; y: number; w: number; h: number; hidden: boolean };
type Side = 'left' | 'top' | 'right' | 'bottom';

const edges = (page: Page, key: string) => page.locator(OVERLAY).evaluate((el, k) => {
  const r = Math.round;
  return Object.fromEntries(['left', 'top', 'right', 'bottom'].map((side) => {
    const n = el.querySelector<HTMLElement>(`[data-k="${k}-${side}"]`);
    const b = n?.getBoundingClientRect();
    return [side, n && b ? { x: r(b.left), y: r(b.top), w: r(b.width), h: r(b.height), hidden: n.hidden } : null];
  })) as Record<Side, Edge | null>;
}, key);

const expectBox = (e: Record<Side, Edge | null>, want: Want, shown: boolean, sides: readonly Side[] = ['left', 'top', 'right', 'bottom']) => {
  for (const s of sides) {
    const b = e[s]!;
    expect(b.hidden, s).toBe(!shown);
    if (!shown) continue;
    if (s === 'left' || s === 'right') expect([b.x, b.y, b.w, b.h], s).toEqual([s === 'left' ? want.x : want.right - 1, want.y, 1, want.h]);
    else expect([b.x, b.y, b.w, b.h], s).toEqual([want.x, s === 'top' ? want.y : want.bottom - 1, want.w, 1]);
  }
};

test('a line steps once per dash on a fixed 9px period and never scales', async ({ page }) => {
  await played(page);
  const read = await page.locator(`${OVERLAY} [data-k="h1-top"]`).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      n: Number(s.getPropertyValue('--n')),
      dashes: Math.round(el.getBoundingClientRect().width / 9),
      timing: s.transitionTimingFunction,
      property: s.transitionProperty,
      background: s.backgroundImage,
      transform: s.transform,
    };
  });
  expect(read.dashes).toBeGreaterThan(0);
  expect(read.n).toBe(read.dashes);
  expect(read.timing).toBe(`steps(${read.n})`);
  expect(read.property).toBe('clip-path');
  expect(read.background).toContain('9px');
  expect(read.transform).toBe('none');
});

test("the head box frames the header's inner row for the header's full height, its top edge on the viewport's top pixel", async ({ page }) => {
  await played(page);
  const want = await page.evaluate(() => {
    const r = Math.round;
    const bar = document.querySelector('header')!.getBoundingClientRect();
    const row = document.querySelector('header > div')!.getBoundingClientRect();
    return { x: r(row.left), y: r(bar.top), w: r(row.right) - r(row.left), h: r(bar.bottom) - r(bar.top), right: r(row.right), bottom: r(bar.bottom) };
  });
  expect(want.y).toBe(0);
  expect(want.w).toBeGreaterThan(0);
  expectBox(await edges(page, 'head'), want, true);
});

test('the exit is a stepped retraction, not a fade', async ({ page }) => {
  await played(page);
  const read = await page.locator(OVERLAY).evaluate((el) => {
    document.documentElement.dataset.opening = 'playing';
    (el as HTMLElement).dataset.beat = '0 1 2';
    return {
      displayed: getComputedStyle(el).display !== 'none',
      children: Array.from(el.children).filter((c) => !(c as HTMLElement).hidden).map((c) => {
        const s = getComputedStyle(c);
        return {
          k: c.getAttribute('data-k'), line: c.tagName === 'DIV', property: s.transitionProperty,
          duration: s.transitionDuration, name: s.animationName, timing: s.animationTimingFunction,
        };
      }),
    };
  });
  expect(read.displayed).toBe(true);
  expect(read.children.length).toBeGreaterThan(12);
  for (const c of read.children) {
    if (c.line) expect(c.property, c.k!).toBe('clip-path');
    else {
      expect(['all', 'none'], c.k!).toContain(c.property);
      expect(c.duration, c.k!).toBe('0s');
      expect(c.name, c.k!).toContain('morse-off');
      expect(c.timing, c.k!).toBe('steps(1)');
    }
  }
});

test('the rail rule stands 5px left of the rail line, from under the header seam to the fold rule', async ({ page }) => {
  await played(page);
  const read = await page.locator(OVERLAY).evaluate((el) => {
    const r = (n: number) => Math.round(n);
    const box = (sel: string, root: ParentNode = el) => root.querySelector(sel)!.getBoundingClientRect();
    const rule = box('[data-k="rail"]');
    return {
      rule: { x: r(rule.left), top: r(rule.top), bottom: r(rule.bottom), w: r(rule.width) },
      rail: r(box('#top > div > div:first-child > div', document).left),
      seam: r(box('header', document).bottom),
      fold: r(box('[data-k="fold"]').top),
    };
  });
  expect(read.rule.w).toBe(1);
  expect(read.rule.x).toBe(read.rail - 5);
  expect(read.rule.top).toBe(read.seam);
  expect(read.rule.bottom).toBe(read.fold);
});

test('the lede box frames the lede while it clears the fold, and there is no lede-max rule any more', async ({ page }) => {
  await played(page);
  const want = await page.evaluate(() => {
    const r = Math.round;
    const b = document.querySelector('hgroup > p:last-child')!.getBoundingClientRect();
    return { x: r(b.left), y: r(b.top), w: r(b.right) - r(b.left), h: r(b.bottom) - r(b.top), right: r(b.right), bottom: r(b.bottom), clear: b.bottom <= window.innerHeight - 24 };
  });
  expect(await page.locator(`${OVERLAY} [data-k="lede-max"]`).count()).toBe(0);
  expectBox(await edges(page, 'lede'), want, want.clear);
});

test("the section box frames the first section's content on top, left and right down to the fold rule, which spans the hero body 24px above the bottom", async ({ page }) => {
  await played(page);
  const read = await page.locator(OVERLAY).evaluate((el) => {
    const r = Math.round;
    const body = document.querySelector('main section h2')!.parentElement!;
    const b = body.getBoundingClientRect();
    const s = getComputedStyle(body);
    const p = (v: string) => Number.parseFloat(v);
    const fold = el.querySelector('[data-k="fold"]')!.getBoundingClientRect();
    const hero = document.querySelector('h1')!.closest('#top > div > div')!.getBoundingClientRect();
    const floor = window.innerHeight - 24;
    const x = r(b.left + p(s.paddingLeft));
    const y = r(b.top + p(s.paddingTop));
    const right = r(b.right - p(s.paddingRight));
    return {
      fold: { x: r(fold.left), y: r(fold.top), w: r(fold.width), h: r(fold.height) },
      hero: { x: r(hero.left), y: floor, w: r(hero.right) - r(hero.left), h: 1 },
      shown: document.querySelector('main section')!.getBoundingClientRect().top < floor - 40,
      content: { x, y, w: right - x, h: floor - y, right, bottom: floor },
    };
  });
  expect(read.fold).toEqual(read.hero);
  expect(await page.locator(`${OVERLAY} [data-k="section-bottom"]`).count()).toBe(0);
  expectBox(await edges(page, 'section'), read.content, read.shown, ['top', 'left', 'right']);
});
