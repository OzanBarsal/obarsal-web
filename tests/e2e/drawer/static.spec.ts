import { test, expect } from '@playwright/test';
import { site } from '../../../content';

const sections = [site.process, site.work, site.clients, site.about, site.skills, site.contact].map(
  (s) => s.section,
);

test.describe('at mobile width', () => {
  test.skip(({ isMobile }) => !isMobile, 'the drawer exists only at mobile width');

  test('the toggle is a 48px button named from the content, and the dialog starts closed', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: site.header.menu.open });
    await expect(toggle).toBeVisible();
    const box = (await toggle.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(48);
    await expect(page.locator('dialog')).toHaveCount(1);
    expect(await page.locator('dialog').evaluate((d) => (d as HTMLDialogElement).open)).toBe(false);
  });

  test('the close control sits exactly where the toggle is', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: site.header.menu.open }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    const [toggle, close] = await page.evaluate(() => {
      const dialog = document.querySelector('dialog')!;
      return [dialog.previousElementSibling!, dialog.querySelector('button')!].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
    });
    expect(close).toEqual(toggle);
  });

  test('the toggle ends on the column border, and its glyph and the close X share one centre', async ({ page }) => {
    await page.goto('/');
    const cdp = await page.context().newCDPSession(page);
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const centre = async (selector: string) => {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const { node } = await cdp.send('DOM.describeNode', { nodeId });
      const xs: number[] = [], ys: number[] = [];
      for (const pseudo of node.pseudoElements!) {
        const { model } = await cdp.send('DOM.getBoxModel', { backendNodeId: pseudo.backendNodeId });
        xs.push(...[0, 2, 4, 6].map((i) => model.border[i]!));
        ys.push(...[1, 3, 5, 7].map((i) => model.border[i]!));
      }
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    };
    const [toggleRight, bodyRight] = await page.evaluate(() => [
      document.querySelector('dialog')!.previousElementSibling!.getBoundingClientRect().right,
      document.querySelector('main > div > div > div:last-child')!.getBoundingClientRect().right,
    ]);
    expect(toggleRight).toBe(bodyRight);
    const glyph = await centre('header [commandfor]');
    await page.getByRole('button', { name: site.header.menu.open }).click();
    await expect(page.locator('dialog[open]')).toBeAttached();
    const x = await centre('dialog[open] button');
    expect(Math.abs(glyph.x - x.x), `hamburger centre ${glyph.x}, X centre ${x.x}`).toBeLessThan(0.5);
    expect(Math.abs(glyph.y - x.y), `hamburger centre ${glyph.y}, X centre ${x.y}`).toBeLessThan(0.5);
  });

  test('no tab stop enters the closed dialog', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog'));
      expect(inside, `tab stop ${i} landed inside the closed dialog`).toBe(false);
    }
  });

  test('each row carries the index of the section it points at, and the strip follows Contact', async ({ page }) => {
    await page.goto('/');
    const rows = await page
      .locator('dialog nav a[href^="#"]')
      .evaluateAll((links) => links.map((a) => ({
        href: a.getAttribute('href'),
        index: a.getAttribute('data-index'),
        text: a.textContent,
      })));
    expect(rows).toEqual(site.header.links.map((l) => ({
      href: l.href,
      index: sections.find((s) => s.id === l.href.slice(1))!.index,
      text: l.label,
    })));
    const cta = page.locator('dialog nav a[href^="mailto:"]');
    await expect(cta).toHaveCount(1);
    expect(await cta.getAttribute('href')).toBe(site.header.cta.href);
    expect(await cta.textContent()).toBe(site.header.cta.label);
    const strip = await page.locator('dialog nav ul li').allTextContents();
    expect(strip).toEqual([...site.hero.strip]);
  });
});

test('the toggle and the dialog are absent above mobile width', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/');
  await expect(page.getByRole('button', { name: site.header.menu.open })).toBeHidden();
  await expect(page.locator('dialog')).toBeHidden();
});
