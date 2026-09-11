import { test, expect } from '@playwright/test';
import { EXIT_STAGGER, STAGGER } from '../../../lib/opening/beats';
import { OVERLAY, played } from './skip';

test('every shown instrument enters at its own index times the stagger, in ascending index order, and only the lines carry a transition', async ({ page }) => {
  await played(page);
  const read = await page.locator(OVERLAY).evaluate((el) => ({
    displayed: getComputedStyle(el).display !== 'none',
    children: Array.from(el.children).filter((c) => !(c as HTMLElement).hidden).map((c) => {
      const s = getComputedStyle(c);
      const line = c.tagName === 'DIV';
      return {
        i: Number(s.getPropertyValue('--i')),
        line,
        delay: Math.round(Number.parseFloat(line ? s.transitionDelay : s.animationDelay) * 1000),
        property: s.transitionProperty,
        duration: s.transitionDuration,
      };
    }),
  }));
  expect(read.displayed).toBe(true);
  expect(read.children.length).toBeGreaterThan(12);
  for (const [n, r] of read.children.entries()) {
    expect(r.delay, `--i ${r.i}`).toBe(r.i * STAGGER);
    if (n > 0) expect(r.i, `child ${n}`).toBeGreaterThan(read.children[n - 1]!.i);
    if (r.line) expect(r.property, `child ${n}`).toBe('clip-path');
    else {
      expect(['all', 'none'], `child ${n}`).toContain(r.property);
      expect(r.duration, `child ${n}`).toBe('0s');
    }
  }
});

test('every shown instrument leaves at its own index times the exit stagger once beat 2 is reached', async ({ page }) => {
  await played(page);
  const read = await page.locator(OVERLAY).evaluate((el) => {
    document.documentElement.dataset.opening = 'playing';
    (el as HTMLElement).dataset.beat = '0 1 2';
    return Array.from(el.children).filter((c) => !(c as HTMLElement).hidden).map((c) => {
      const s = getComputedStyle(c);
      return { i: Number(s.getPropertyValue('--i')), delay: Math.round(Number.parseFloat(c.tagName === 'DIV' ? s.transitionDelay : s.animationDelay) * 1000) };
    });
  });
  expect(read.length).toBeGreaterThan(12);
  expect(read.some((r) => r.i > 0)).toBe(true);
  for (const r of read) expect(r.delay, `--i ${r.i}`).toBe(r.i * EXIT_STAGGER);
});
