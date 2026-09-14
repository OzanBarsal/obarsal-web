import { test, expect } from '@playwright/test';

// Hero row, then every section row; the rail segment is each row's first child and the body its last.
const ROWS = 'main > div > div, main > section';

test('at mobile width every row starts at the screen edge and each chip is centred between the edge and the rail', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the rows lose their left margin only at mobile width');
  await page.goto('/');
  const rows = await page.evaluate((sel) => Array.from(document.querySelectorAll<HTMLElement>(sel)).map((row) => {
    const segment = row.firstElementChild!;
    const chip = segment.querySelector('span')!.getBoundingClientRect();
    return {
      left: row.getBoundingClientRect().left,
      chipCentre: (chip.left + chip.right) / 2,
      rail: segment.querySelector('div')!.getBoundingClientRect().left,
    };
  }), ROWS);
  expect(rows.length).toBeGreaterThan(1);
  for (const row of rows) {
    expect(row.left).toBe(0);
    expect(Math.abs(row.chipCentre - row.rail / 2)).toBeLessThan(1);
  }
});

test('at 1000px every body stops 12px short of the right edge of the viewport', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a tablet width on the desktop project');
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/');
  const read = await page.evaluate((sel) => ({
    edge: document.documentElement.clientWidth,
    rights: Array.from(document.querySelectorAll<HTMLElement>(sel)).map((row) => row.lastElementChild!.getBoundingClientRect().right),
  }), ROWS);
  expect(read.rights.length).toBeGreaterThan(1);
  for (const right of read.rights) expect(read.edge - right).toBe(12);
});

test('at desktop width every body is --content-max wide', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the desktop envelope');
  await page.goto('/');
  const read = await page.evaluate((sel) => ({
    max: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--content-max')),
    widths: Array.from(document.querySelectorAll<HTMLElement>(sel)).map((row) => row.lastElementChild!.getBoundingClientRect().width),
  }), ROWS);
  expect(read.widths.length).toBeGreaterThan(1);
  for (const width of read.widths) expect(width).toBe(read.max);
});

test('the foot pads 26px below its rule, the same as above it', async ({ page }) => {
  await page.goto('/');
  const pad = await page.locator('footer').evaluate((el) => {
    const s = getComputedStyle(el);
    return { top: s.paddingTop, bottom: s.paddingBottom };
  });
  expect(pad).toEqual({ top: '26px', bottom: '26px' });
});
