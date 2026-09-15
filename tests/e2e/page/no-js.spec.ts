import { test, expect } from '@playwright/test';
import { site } from '../../../content';
import type { Rich } from '../../../content/types';

function plainText(rich: Rich): string {
  return rich.map((segment) => (typeof segment === 'string' ? segment : segment.text)).join('');
}

test.use({ javaScriptEnabled: false });

test('every content string is present with JavaScript disabled', async ({ page }) => {
  await page.goto('/');
  // page.textContent('body') would also match the RSC payload Next embeds in a
  // <script>, which a reader without JavaScript never sees.
  const rawText = await page.evaluate(() => {
    const clone = document.body.cloneNode(true) as Element;
    clone.querySelectorAll('script, style, template, noscript').forEach((n) => n.remove());
    const alts = [...clone.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt'));
    return `${clone.textContent ?? ''} ${alts.join(' ')}`;
  });
  const body = rawText.replace(/\s+/g, ' ');
  const norm = (s: string) => s.replace(/\s+/g, ' ');

  // Fields that never reach the body as text — aria-labels, hrefs, ids and the
  // <head>-only meta block — are deliberately absent.
  const strings: string[] = [
    site.header.skipToContent,
    site.header.wordmark.name,
    site.header.wordmark.suffix,
    ...site.header.links.map((l) => l.label),
    ...(site.header.availability.show ? [site.header.availability.label] : []),
    site.header.cta.label,

    site.hero.index,
    site.hero.eyebrow,
    plainText(site.hero.headline),
    site.hero.lede,
    ...site.hero.actions.map((a) => a.label),
    ...site.hero.strip,

    site.process.section.index,
    site.process.section.label,
    site.process.statement,
    ...site.process.paragraphs.map(plainText),

    site.work.section.index,
    site.work.section.label,
    ...site.work.cards.flatMap((c) => [
      ...c.meta,
      c.title,
      c.outcome,
      ...c.facts,
      ...c.tags,
      ...(c.metrics ?? []).flatMap((m) => [m.value, m.label]),
    ]),

    site.clients.section.index,
    site.clients.section.label,
    site.clients.lede,
    ...site.clients.logos.map((l) => l.name),

    site.about.section.index,
    site.about.section.label,
    ...site.about.paragraphs.map(plainText),

    site.skills.section.index,
    site.skills.section.label,
    ...site.skills.groups.flatMap((g) => [g.heading, ...g.items]),

    site.contact.section.index,
    site.contact.section.label,
    site.contact.email,
    ...site.contact.socials.map((s) => s.label),
    site.contact.footerNote,
    site.contact.copyrightName,
  ];

  for (const s of strings) {
    expect(body, `missing without JS: ${s.slice(0, 60)}`).toContain(norm(s));
  }
});

test('the heading renders without JavaScript', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(plainText(site.hero.headline));
});
