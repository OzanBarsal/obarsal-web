import type { Rect } from './place';
import type { Targets } from './frame';

export const CHIP_KEYS = [
  'viewport', 'dpr', 'header', 'h1', 'h1b', 'lede', 'hit', 'strip', 'grid', 'column',
  'accent', 'ground', 'text', 'muted', 'horizon', 'fonts', 'fcp', 'dom', 'scroll', 'h2', 'scheme', 'motion',
  'rail-tip', 'rail-gutter', 'rail-tick', 'rail-segments', 'rail-fill',
  'label', 'lead', 'para', 'pad', 'gap',
] as const;

export type ChipKey = (typeof CHIP_KEYS)[number];

export type Chip = { key: ChipKey; text: string; anchor: Rect | null };

export const GROUPS = {
  rail: ['rail-tip', 'rail-gutter', 'rail-tick', 'rail-segments', 'rail-fill'],
  layout: ['header', 'grid', 'column'],
  tokens: ['accent', 'ground', 'text', 'muted', 'horizon'],
  env: ['viewport', 'dpr', 'fonts', 'fcp', 'dom', 'scroll', 'scheme', 'motion'],
  section: ['label', 'lead', 'para', 'pad', 'gap'],
} as const satisfies Record<string, readonly ChipKey[]>;

export type GroupKey = keyof typeof GROUPS;

export const GROUP_KEYS = Object.keys(GROUPS) as GroupKey[];

const px = (n: number) => `${Math.round(n)}px`;
const dim = (r: { width: number; height: number }) => `${Math.round(r.width)}×${Math.round(r.height)}`;
const ms = (n: number) => `${Math.round(n)}ms`;
const css = (v: string) => (v.endsWith('px') ? px(Number.parseFloat(v)) : v);
const type = (el: Element) => { const c = getComputedStyle(el); return `${css(c.fontSize)}/${css(c.lineHeight)}`; };
const box = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

export function chips(doc: Document, win: Window, t: Targets): Chip[] {
  const root = getComputedStyle(doc.documentElement);
  const token = (name: string) => root.getPropertyValue(name).trim();
  const h1 = doc.querySelector('h1');
  const main = doc.querySelector('main');
  if (!h1 || !main) return [];
  const hs = getComputedStyle(h1);
  const lede = doc.querySelector('hgroup > p:last-child');
  const action = doc.querySelector('#top a');
  const strip = doc.querySelector('#top ul');
  const row = doc.querySelector('#top > div');
  const body = row?.children[1];
  const h2 = doc.querySelector('main section h2');
  const rail = doc.querySelector('#top > div > div:first-child > div');
  const tick = rail?.children[1];
  const segments = doc.querySelectorAll('#top > div > div:first-child, main > section > div:first-child').length;
  const live = getComputedStyle(main);
  const paras = doc.querySelector('main section')?.querySelectorAll('p') ?? [];
  const lead = paras[0];
  const second = paras[1];
  const secBody = h2?.parentElement;
  const paint = win.performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
  const nav = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const tip = Number.parseFloat(getComputedStyle(main).getPropertyValue('--rail-tip'));
  let fonts = 0;
  doc.fonts.forEach((f) => { if (f.status === 'loaded') fonts += 1; });
  const out: (Chip | null)[] = [
    { key: 'viewport', text: `viewport: ${t.vw}×${t.vh}`, anchor: null },
    { key: 'dpr', text: `dpr: ${win.devicePixelRatio.toFixed(2)}`, anchor: null },
    { key: 'header', text: `header: ${px(t.header.h)} · ${doc.querySelectorAll('header nav a').length} links`, anchor: t.header },
    { key: 'h1', text: `h1: ${css(hs.fontSize)} · ${hs.fontWeight} · ${dim(h1.getBoundingClientRect())}`, anchor: t.h1 },
    { key: 'h1b', text: `h1: line ${css(hs.lineHeight)} · tracking ${css(hs.letterSpacing)}`, anchor: t.h1 },
    lede && t.lede ? { key: 'lede', text: `lede: ${type(lede)} · max ${css(getComputedStyle(lede).maxWidth)}`, anchor: t.lede } : null,
    action && t.actions ? { key: 'hit', text: `hit: ${dim(action.getBoundingClientRect())}`, anchor: t.actions } : null,
    strip ? { key: 'strip', text: `strip: ${css(getComputedStyle(strip).fontSize)} · ${css(getComputedStyle(strip).letterSpacing)}`, anchor: box(strip) } : null,
    row ? { key: 'grid', text: `grid: ${getComputedStyle(row).gridTemplateColumns}`, anchor: null } : null,
    row && body ? { key: 'column', text: `col: ${css(getComputedStyle(body).maxWidth)} / ${css(getComputedStyle(row).maxWidth)}`, anchor: null } : null,
    { key: 'accent', text: `--accent: ${token('--accent')}`, anchor: null },
    { key: 'ground', text: `--ground: ${token('--ground')}`, anchor: null },
    { key: 'text', text: `--text: ${token('--text')}`, anchor: null },
    { key: 'muted', text: `--muted: ${token('--muted')}`, anchor: null },
    { key: 'horizon', text: `--horizon: ${token('--horizon')}`, anchor: null },
    { key: 'fonts', text: `fonts: ${fonts} loaded`, anchor: null },
    paint ? { key: 'fcp', text: `fcp: ${ms(paint.startTime)}`, anchor: null } : null,
    nav ? { key: 'dom', text: `dom: ${ms(nav.domContentLoadedEventEnd)}`, anchor: null } : null,
    { key: 'scroll', text: `scroll: ${Math.round(win.scrollY)} / ${doc.documentElement.scrollHeight}`, anchor: null },
    h2 && h2.getBoundingClientRect().top < t.vh ? { key: 'h2', text: `section: y ${px(h2.getBoundingClientRect().top)}`, anchor: box(h2) } : null,
    { key: 'scheme', text: `scheme: ${win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}`, anchor: null },
    { key: 'motion', text: `motion: ${win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'ok'}`, anchor: null },
    tip >= 0 ? { key: 'rail-tip', text: `rail: tip ${Math.round(tip)}`, anchor: null } : null,
    row ? { key: 'rail-gutter', text: `rail: gutter ${css(getComputedStyle(row).gridTemplateColumns.split(' ')[0] ?? '')}`, anchor: null } : null,
    rail && tick ? { key: 'rail-tick', text: `rail: tick +${px(tick.getBoundingClientRect().top - rail.getBoundingClientRect().top)}`, anchor: null } : null,
    { key: 'rail-segments', text: `rail: ${segments} segments`, anchor: null },
    { key: 'rail-fill', text: `rail: fill ${live.transitionDuration}`, anchor: null },
    h2 ? { key: 'label', text: `label: ${css(getComputedStyle(h2).fontSize)} · ${css(getComputedStyle(h2).letterSpacing)}`, anchor: null } : null,
    lead ? { key: 'lead', text: `lead: ${type(lead)} · max ${css(getComputedStyle(lead).maxWidth)}`, anchor: null } : null,
    second ? { key: 'para', text: `p: ${type(second)} · max ${css(getComputedStyle(second).maxWidth)} · ×${paras.length - 1}`, anchor: null } : null,
    secBody ? { key: 'pad', text: `pad: ${css(getComputedStyle(secBody).paddingTop)} / ${css(getComputedStyle(secBody).paddingRight)} / ${css(getComputedStyle(secBody).paddingLeft)}`, anchor: null } : null,
    { key: 'gap', text: `gap: ${token('--section-gap')}`, anchor: null },
  ];
  return out.filter((c): c is Chip => c !== null);
}
