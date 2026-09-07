import type { Page } from '@playwright/test';
import { site } from '../../../content';

export const SELECTORS = {
  segment: 'main [aria-hidden="true"]',
  line: ':scope > div',
  fill: ':scope > div > :nth-child(1)',
  tick: ':scope > div > :nth-child(2)',
  tip: ':scope > div > :nth-child(3)',
};

export type Segment = {
  index: string;
  p: number;
  lit: boolean;
  tipShown: boolean;
  fillTop: number;
  fillBottom: number;
  dotCentre: number;
  tickTop: number;
  lineTop: number;
};

export const INDICES = [
  site.hero.index,
  site.process.section.index,
  site.work.section.index,
  site.clients.section.index,
  site.about.section.index,
  site.skills.section.index,
  site.contact.section.index,
];

export function readSegments(page: Page): Promise<Segment[]> {
  return page.evaluate(
    (s) =>
      Array.from(document.querySelectorAll(s.segment)).map((root) => {
        const num = root.querySelector('span') as HTMLElement;
        const fill = root.querySelector(s.fill) as HTMLElement;
        const tip = root.querySelector(s.tip) as HTMLElement;
        const matrix = getComputedStyle(fill).transform;
        const box = fill.getBoundingClientRect();
        const dot = tip.getBoundingClientRect();
        return {
          index: num.textContent ?? '',
          p: matrix === 'none' ? 1 : Number(matrix.split(',')[3]),
          lit: getComputedStyle(num).color === getComputedStyle(fill).backgroundColor,
          tipShown: getComputedStyle(tip).display !== 'none' && Number(getComputedStyle(tip).opacity) > 0.5,
          fillTop: box.top,
          fillBottom: box.bottom,
          dotCentre: dot.top + dot.height / 2,
          tickTop: root.querySelector(s.tick)!.getBoundingClientRect().top,
          lineTop: root.querySelector(s.line)!.getBoundingClientRect().top,
        };
      }),
    SELECTORS,
  );
}
