import { test, expect, type Page } from '@playwright/test';
import { CHIP_KEYS, GROUPS } from '../../../lib/instruments/chips';
import { OVERLAY, played } from '../opening/skip';

type Box = { x: number; y: number; w: number; h: number };

const GROUPED = new Set<string>(Object.values(GROUPS).flatMap((g) => [...g]));

const ANCHORED = CHIP_KEYS.filter((k) => !GROUPED.has(k));

const rowsOf = (chips: readonly Box[]) => [...new Set(chips.map((c) => c.y))].sort((a, b) => a - b)
  .map((y) => chips.filter((c) => c.y === y).sort((a, b) => a.x - b.x));

const stacks = (page: Page) => page.locator(OVERLAY).evaluate((el, groups) => {
  const box = (n: Element): Box => {
    const r = n.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };
  return Object.entries(groups).map(([g, keys]) => {
    const spine = el.querySelector<HTMLElement>(`[data-k="spine-${g}"]`)!;
    const s = getComputedStyle(spine);
    return {
      g,
      shown: !spine.hidden,
      spine: box(spine),
      background: s.backgroundImage,
      chips: (keys as readonly string[]).map((k) => el.querySelector<HTMLElement>(`[data-k="${k}"]`)!).filter((c) => !c.hidden).map(box),
    };
  });
}, GROUPS);

test('every shown spine is a 1px vertical dashed rule; its chips sit in rows inside its height, each row 8px off the spine and 4px between chips', async ({ page }) => {
  await played(page);
  for (const s of (await stacks(page)).filter((x) => x.shown)) {
    expect(s.spine.w, s.g).toBe(1);
    expect(s.spine.h, s.g).toBeGreaterThan(s.spine.w);
    expect(s.background, s.g).toContain('9px');
    expect(s.background, s.g).not.toContain('to right');
    expect(s.chips.length, s.g).toBeGreaterThan(0);
    const left = s.chips[0]!.x < s.spine.x;
    const rows = rowsOf(s.chips);
    for (const [n, row] of rows.entries()) {
      const near = left ? row.at(-1)! : row[0]!;
      expect(left ? Math.round(near.x + near.w + 8) : Math.round(near.x - 9), `${s.g} row ${n}`).toBe(Math.round(s.spine.x));
      for (const c of row) {
        expect(c.y, s.g).toBeGreaterThanOrEqual(s.spine.y);
        expect(c.y + c.h, s.g).toBeLessThanOrEqual(s.spine.y + s.spine.h);
        expect(left ? c.x + c.w < s.spine.x : c.x > s.spine.x, s.g).toBe(true);
      }
      for (let k = 1; k < row.length; k++) expect(Math.round(row[k]!.x - row[k - 1]!.x - row[k - 1]!.w), s.g).toBe(4);
      if (n > 0) expect(Math.round(row[0]!.y - Math.max(...rows[n - 1]!.map((c) => c.y + c.h))), s.g).toBe(4);
    }
  }
});

test('desktop: the rail block stands left of the rail line, spine on its right; layout, tokens and env stand 12px right of the heading, spines on their left, one under another, and one of them wraps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the phone has no margin');
  await played(page);
  const { rail, h1Right } = await page.evaluate(() => ({
    rail: document.querySelector('#top > div > div:first-child > div')!.getBoundingClientRect().left,
    h1Right: Math.round(document.querySelector('h1')!.getBoundingClientRect().right),
  }));
  const by = Object.fromEntries((await stacks(page)).map((s) => [s.g, s]));
  const railBlock = by.rail!;
  expect(railBlock.shown).toBe(true);
  expect(railBlock.spine.x + railBlock.spine.w).toBeLessThan(rail);
  for (const c of railBlock.chips) expect(c.x + c.w).toBeLessThan(railBlock.spine.x);
  const right = ['layout', 'tokens', 'env'].map((g) => by[g]!);
  expect(right.map((s) => s.shown)).toEqual([true, true, true]);
  for (const s of right) {
    expect(Math.round(s.spine.x), s.g).toBe(h1Right + 12);
    for (const c of s.chips) expect(c.x, s.g).toBeGreaterThan(s.spine.x);
  }
  for (let k = 1; k < right.length; k++) expect(right[k]!.spine.y, right[k]!.g).toBeGreaterThanOrEqual(right[k - 1]!.spine.y + right[k - 1]!.spine.h);
  expect(right.some((s) => rowsOf(s.chips).some((row) => row.length > 1))).toBe(true);
});

test('mobile: no stack fits, every spine is hidden, and the anchored chips still show', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the desktop has a margin');
  await played(page);
  const read = await stacks(page).then((all) => all.filter((s) => s.g !== 'section'));
  expect(read.length).toBe(4);
  for (const s of read) expect(s.shown, s.g).toBe(false);
  const anchored = await page.locator(OVERLAY).evaluate((el, keys) => (keys as readonly string[])
    .filter((k) => {
      const n = el.querySelector<HTMLElement>(`[data-k="${k}"]`);
      return !!n && !n.hidden;
    }).length, ANCHORED);
  expect(anchored).toBeGreaterThan(0);
});

test("a chip's ground is opaque, so nothing under it shows through", async ({ page }) => {
  await played(page);
  const colour = await page.locator(`${OVERLAY} [data-k="accent"]`).evaluate((n) => getComputedStyle(n).backgroundColor);
  expect(colour).not.toBe('rgba(0, 0, 0, 0)');
  expect(colour).not.toMatch(/^rgba\(/);
  expect(colour).not.toContain('/');
});
