import { test, expect, type Page } from '@playwright/test';
import { site } from '../../../content';
import { EXIT_STAGGER, STAGGER } from '../../../lib/opening/beats';
import { OVERLAY, injectConnection, skipOpening } from './skip';

const opening = (page: Page) => page.evaluate(() => document.documentElement.dataset.opening ?? null);

const placed = (page: Page) => page.locator(OVERLAY).evaluate((el) =>
  Array.from(el.children).filter((c) => (c as HTMLElement).style.getPropertyValue('--i') !== '').length);

const skipped = async (page: Page) => {
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
  expect(await placed(page)).toBe(0);
};

test('a heading restored off the top of the viewport skips: done, hidden, nothing placed', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  await page.evaluate(() => scrollTo(0, 800));
  await page.reload();
  await skipped(page);
});

test('a deep-linked load skips: done, hidden, nothing placed', async ({ page }) => {
  await page.goto(`/#${site.skills.section.id}`);
  await skipped(page);
});

test('every load plays: a reload after done marks the root playing or done again', async ({ page }) => {
  await page.goto('/');
  expect(await opening(page)).toMatch(/^(playing|done)$/);
  await expect.poll(() => opening(page), { timeout: 12_000 }).toBe('done');
  await page.reload();
  expect(await opening(page)).toMatch(/^(playing|done)$/);
});

test('reduced motion skips', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await opening(page)).toBeNull();
});

test('a metered connection skips: no attribute, overlay not displayed', async ({ page }) => {
  await injectConnection(page, { saveData: true });
  await page.goto('/');
  expect(await opening(page)).toBeNull();
  await expect(page.locator(OVERLAY)).toHaveCSS('display', 'none');
});

test("under playing, the rail's lines carry no transition: the opening's draw-in rule stays deleted", async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const durations = await page.evaluate(() => {
    document.documentElement.dataset.opening = 'playing';
    const lines = Array.from(document.querySelectorAll('main [aria-hidden="true"] > div'));
    const read = lines.map((l) => getComputedStyle(l).transitionDuration);
    delete document.documentElement.dataset.opening;
    return read;
  });
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((d) => d === '0s')).toBe(true);
});

test('every shown instrument enters at its own index times the stagger, in ascending index order, and only the lines carry a transition', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^0/);
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
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toHaveAttribute('data-beat', /^0/);
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

test("the page's layout is identical with and without playing", async ({ page }) => {
  await skipOpening(page);
  await page.goto('/');
  const [idle, playing] = await page.evaluate(() => {
    const box = () => {
      const r = document.querySelector('h1')!.getBoundingClientRect();
      return { height: document.documentElement.scrollHeight, left: r.left, top: r.top, width: r.width };
    };
    const before = box();
    document.documentElement.dataset.opening = 'playing';
    const after = box();
    delete document.documentElement.dataset.opening;
    return [before, after];
  });
  expect(playing).toEqual(idle);
});

test('under reduced motion the overlay stays display none even while the root says playing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipOpening(page);
  await page.goto('/');
  const display = await page.evaluate((sel) => {
    document.documentElement.dataset.opening = 'playing';
    const read = getComputedStyle(document.querySelector(sel) as HTMLElement).display;
    delete document.documentElement.dataset.opening;
    return read;
  }, OVERLAY);
  expect(display).toBe('none');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('no attribute, no overlay, tracks static', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('html').getAttribute('data-opening')).toBeNull();
    const overlay = page.locator(OVERLAY);
    await expect(overlay).toHaveCount(1);
    await expect(overlay).toHaveCSS('display', 'none');
  });
});
