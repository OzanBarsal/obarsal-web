import { test, expect } from '@playwright/test';
import { site } from '../../../content';

// Hero body, then every section body, in document order.
const BODIES = 'main > div > div > div:last-child, main > section > div:last-child';
const SECTIONS = [site.process, site.work, site.clients, site.about, site.skills, site.contact];

test('the column is continuous: the first body starts at the top of the document, each body starts where the last one ends, and the last one ends the document', async ({ page }) => {
  await page.goto('/');
  const read = await page.evaluate((sel) => {
    const boxes = Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, bottom: r.bottom + scrollY };
    });
    return { boxes, height: document.documentElement.scrollHeight };
  }, BODIES);
  expect(read.boxes.length).toBe(SECTIONS.length + 1);
  expect(read.boxes[0]!.top).toBe(0);
  for (let i = 1; i < read.boxes.length; i += 1) {
    expect(Math.abs(read.boxes[i]!.top - read.boxes[i - 1]!.bottom), `seam ${i}`).toBeLessThan(0.5);
  }
  expect(Math.abs(read.boxes.at(-1)!.bottom - read.height), 'space after the footer').toBeLessThan(0.5);
});

test('every body wears the same veil and the same 1px --line-rail right border, at every width', async ({ page }) => {
  await page.goto('/');
  const read = await page.evaluate((sel) => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--line-rail)';
    document.body.append(probe);
    const rail = getComputedStyle(probe).color;
    probe.remove();
    return {
      rail,
      bodies: Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) => {
        const s = getComputedStyle(el);
        return { image: s.backgroundImage, width: s.borderRightWidth, colour: s.borderRightColor, style: s.borderRightStyle };
      }),
    };
  }, BODIES);
  expect(read.bodies.length).toBe(SECTIONS.length + 1);
  for (const body of read.bodies) {
    expect(body.image).toContain('to right');
    expect(body.image, 'a translucent stop: a veil, not a surface').toMatch(/\/ 0\.\d+\)/);
    expect(body.width).toBe('1px');
    expect(body.style).toBe('solid');
    expect(body.colour).toBe(read.rail);
  }
});

test('the header sits over the column: header and hero body both start at the top pixel, and the hero copy clears the header by the body padding', async ({ page }) => {
  await page.goto('/');
  const read = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const el = document.querySelector('header')!;
    const header = el.getBoundingClientRect();
    const body = document.querySelector('main > div > div > div:last-child')!.getBoundingClientRect();
    const eyebrow = document.querySelector('main hgroup > p')!.getBoundingClientRect();
    return {
      headerTop: header.top, headerBottom: header.bottom, bodyTop: body.top, eyebrowTop: eyebrow.top,
      headerH: Number.parseFloat(root.getPropertyValue('--header-h')),
      padTop: Number.parseFloat(root.getPropertyValue('--body-pad-top')),
      z: getComputedStyle(el).zIndex,
      mainZ: getComputedStyle(document.querySelector('main')!).zIndex,
    };
  });
  expect(read.headerTop).toBe(0);
  expect(read.bodyTop).toBe(0);
  expect(read.headerBottom).toBe(read.headerH);
  expect(read.eyebrowTop).toBe(read.headerH + read.padTop);
  expect(Number(read.z)).toBeGreaterThan(read.mainZ === 'auto' ? 0 : Number(read.mainZ));
});

test('in-page navigation scrolls smoothly and lands a section just under the header', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.opening ?? null), { timeout: 12_000 })
    .toBe('done');
  const style = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return { behavior: s.scrollBehavior, padding: s.scrollPaddingTop };
  });
  expect(style.behavior).toBe('smooth');
  expect(style.padding).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim()));
  const playingBehavior = await page.evaluate(() => {
    document.documentElement.dataset.opening = 'playing';
    const behavior = getComputedStyle(document.documentElement).scrollBehavior;
    document.documentElement.dataset.opening = 'done';
    return behavior;
  });
  expect(playingBehavior).toBe('auto');
  const landed = await page.evaluate((id) => new Promise<number>((resolve) => {
    const target = document.getElementById(id)!;
    addEventListener('scrollend', () => resolve(target.getBoundingClientRect().top), { once: true });
    location.hash = `#${target.id}`;
  }), site.work.section.id!);
  const headerH = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')));
  expect(Math.abs(landed - headerH)).toBeLessThan(1);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('jumps instead of scrolling smoothly', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });
});
