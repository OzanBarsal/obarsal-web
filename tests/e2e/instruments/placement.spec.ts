import { test, expect } from '@playwright/test';
import { CHIP_KEYS } from '../../../lib/instruments/chips';
import { OVERLAY, played } from '../opening/skip';

type Box = { k: string | null; line: boolean; x: number; y: number; w: number; h: number };

const rects = (page: import('@playwright/test').Page) => page.locator(OVERLAY).evaluate((el) =>
  Array.from(el.children).filter((c) => !(c as HTMLElement).hidden).map((c) => {
    const r = c.getBoundingClientRect();
    return { k: c.getAttribute('data-k'), line: c.tagName === 'DIV', x: r.left, y: r.top, w: r.width, h: r.height };
  }));

const drawn = (boxes: readonly { w: number; h: number }[]) => boxes.some((b) => b.w > 0 && b.h > 0);

const COPY = 'h1, hgroup > p, #top ul, main section h2, main section p, #top > div > div:first-child > span, main > section > div:first-child > span';

test("every shown instrument is inside the viewport, and nothing overlaps but the frame's own corners", async ({ page }) => {
  await played(page);
  const boxes: Box[] = await rects(page);
  const vp = page.viewportSize()!;
  expect(boxes.length).toBeGreaterThan(12);
  expect(drawn(boxes)).toBe(true);
  for (const b of boxes) {
    expect(b.x, b.k!).toBeGreaterThanOrEqual(0);
    expect(b.y, b.k!).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w, b.k!).toBeLessThanOrEqual(vp.width);
    expect(b.y + b.h, b.k!).toBeLessThanOrEqual(vp.height);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!, b = boxes[j]!;
    if (a.line && b.line) continue;
    const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
    expect(apart, `${a.k} vs ${b.k}`).toBe(true);
  }
});

test('no shown chip covers the heading, the lede, the actions row, the eyebrow, the strip, a rail number or the first section\'s copy', async ({ page }) => {
  await played(page);
  const read = await page.locator(OVERLAY).evaluate((el, [keys, copySel]) => {
    const rect = (n: Element) => {
      const r = n.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    return {
      copy: [rect(document.querySelector('#top a')!.parentElement!), ...Array.from(document.querySelectorAll(copySel as string), rect)]
        .filter((r) => r.h > 0 && r.y < window.innerHeight),
      chips: (keys as readonly string[]).map((k) => el.querySelector<HTMLElement>(`[data-k="${k}"]`)!)
        .filter((c) => !c.hidden)
        .map((c) => ({ k: c.getAttribute('data-k'), ...rect(c) })),
    };
  }, [[...CHIP_KEYS], COPY] as const);
  expect(read.copy.length).toBeGreaterThan(5);
  expect(read.chips.length).toBeGreaterThan(4);
  expect(drawn(read.chips)).toBe(true);
  for (const c of read.chips) for (const t of read.copy) {
    const apart = c.x + c.w <= t.x || t.x + t.w <= c.x || c.y + c.h <= t.y || t.y + t.h <= c.y;
    expect(apart, c.k!).toBe(true);
  }
});
