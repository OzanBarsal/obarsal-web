import type { Rect } from './place';

export const LINE_KEYS = [
  'head-left', 'head-top', 'head-right', 'head-bottom', 'rail',
  'h1-left', 'h1-top', 'h1-right', 'h1-bottom', 'lede-left', 'lede-top', 'lede-right', 'lede-bottom',
  'section-top', 'section-left', 'section-right', 'fold',
] as const;

export const READ_KEYS = ['width', 'height', 'clock'] as const;

export const DASH = 9;

export const MARGIN = 8;

export type LineKey = (typeof LINE_KEYS)[number];

export type Line = { key: LineKey; rect: Rect; from: string };

export type Targets = {
  vw: number; vh: number; header: Rect; head: Rect | null; h1: Rect; body: Rect;
  lede: Rect | null; actions: Rect | null; section: Rect | null; sectionBody: Rect | null;
  rail: Rect | null; lead: Rect | null; copy: Rect[];
};

const box = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const content = (el: Element, win: Window): Rect => {
  const r = box(el);
  const s = win.getComputedStyle(el);
  const pad = (v: string) => Number.parseFloat(v);
  return {
    x: r.x + pad(s.paddingLeft), y: r.y + pad(s.paddingTop),
    w: r.w - pad(s.paddingLeft) - pad(s.paddingRight), h: r.h - pad(s.paddingTop) - pad(s.paddingBottom),
  };
};

const COPY = 'hgroup > p:first-child, #top ul, main section h2, main section p, #top > div > div:first-child > span, main > section > div:first-child > span';

export function targets(doc: Document, win: Window): Targets | null {
  const header = doc.querySelector('header');
  const head = doc.querySelector('header > div');
  const h1 = doc.querySelector('h1');
  const body = h1?.closest('#top > div > div');
  const lede = doc.querySelector('hgroup > p:last-child');
  const actions = doc.querySelector('#top a')?.parentElement ?? null;
  const section = doc.querySelector('main section');
  const sectionBody = doc.querySelector('main section h2')?.parentElement ?? null;
  const rail = doc.querySelector('#top > div > div:first-child > div');
  const lead = doc.querySelector('main section p');
  if (!header || !h1 || !body || !doc.querySelector('main')) return null;
  const vh = win.innerHeight;
  const bar = box(header);
  return {
    vw: win.innerWidth,
    vh,
    header: bar,
    head: head ? { ...box(head), y: bar.y, h: bar.h } : null,
    h1: box(h1),
    body: box(body),
    lede: lede ? box(lede) : null,
    actions: actions ? box(actions) : null,
    section: section ? box(section) : null,
    sectionBody: sectionBody ? content(sectionBody, win) : null,
    rail: rail ? box(rail) : null,
    lead: lead ? box(lead) : null,
    copy: Array.from(doc.querySelectorAll(COPY), box).filter((r) => r.h > 0 && r.y < vh),
  };
}

const crisp = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

const LEFT_TO_RIGHT = '0 100% 0 0';
const RIGHT_TO_LEFT = '0 0 0 100%';
const TOP_DOWN = '0 0 100% 0';

const edges = (key: 'head' | 'h1' | 'lede', r: Rect): Line[] => [
  { key: `${key}-left`, rect: { x: r.x, y: r.y, w: 1, h: r.h }, from: TOP_DOWN },
  { key: `${key}-top`, rect: { x: r.x, y: r.y, w: r.w, h: 1 }, from: LEFT_TO_RIGHT },
  { key: `${key}-right`, rect: { x: r.x + r.w - 1, y: r.y, w: 1, h: r.h }, from: TOP_DOWN },
  { key: `${key}-bottom`, rect: { x: r.x, y: r.y + r.h - 1, w: r.w, h: 1 }, from: RIGHT_TO_LEFT },
];

export function lines(t: Targets): Line[] {
  const { h1, body, header } = t;
  const foldY = t.vh - 24;
  const headY = header.y + header.h - 1;
  const out: Line[] = [];
  if (t.head) out.push(...edges('head', t.head));
  if (t.rail) out.push({ key: 'rail', rect: { x: t.rail.x - 5, y: headY + 1, w: 1, h: foldY - headY - 1 }, from: TOP_DOWN });
  out.push(...edges('h1', h1));
  if (t.lede && t.lede.y + t.lede.h <= foldY) out.push(...edges('lede', t.lede));
  const s = t.sectionBody;
  if (s && t.section && t.section.y < foldY - 40) {
    out.push(
      { key: 'section-top', rect: { x: s.x, y: s.y, w: s.w, h: 1 }, from: LEFT_TO_RIGHT },
      { key: 'section-left', rect: { x: s.x, y: s.y, w: 1, h: foldY - s.y }, from: TOP_DOWN },
      { key: 'section-right', rect: { x: s.x + s.w - 1, y: s.y, w: 1, h: foldY - s.y }, from: TOP_DOWN },
    );
  }
  out.push({ key: 'fold', rect: { x: body.x, y: foldY, w: body.w, h: 1 }, from: RIGHT_TO_LEFT });
  return out.map((l) => ({ ...l, rect: crisp(l.rect) }));
}

export function dashes(len: number): { n: number; ms: number } {
  const n = Math.max(1, Math.round(len / DASH));
  return { n, ms: Math.min(480, Math.max(120, n * 8)) };
}

export function readoutAt(key: (typeof READ_KEYS)[number], size: { w: number; h: number }, t: Targets): Rect {
  const above = t.h1.y - size.h - 4;
  if (key === 'width') return { x: t.h1.x, y: above, ...size };
  if (key === 'height') return { x: t.h1.x + t.h1.w - size.w, y: above, ...size };
  return { x: t.vw - MARGIN - size.w, y: t.header.y + t.header.h + MARGIN, ...size };
}
