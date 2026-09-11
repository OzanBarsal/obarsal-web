import { describe, expect, it } from 'vitest';
import { CHIP_KEYS, GROUPS, GROUP_KEYS, type Chip } from '@/lib/instruments/chips';
import { LINE_KEYS, READ_KEYS, type Targets } from '@/lib/instruments/frame';
import { layout, type Placed } from '@/lib/instruments/layout';
import { GAP, SPINE, inside, overlaps, type Size } from '@/lib/instruments/place';

const desktop: Targets = {
  vw: 1440, vh: 900,
  header: { x: 0, y: 0, w: 1440, h: 66 },
  head: { x: 80, y: 0, w: 1280, h: 66 },
  h1: { x: 232, y: 174, w: 848, h: 246 },
  body: { x: 176, y: 66, w: 1080, h: 640 },
  lede: { x: 232, y: 446, w: 720, h: 94 },
  actions: { x: 232, y: 572, w: 311, h: 48 },
  section: { x: 176, y: 701, w: 1080, h: 600 },
  sectionBody: { x: 232, y: 765, w: 928, h: 536 },
  rail: { x: 175, y: 66, w: 1, h: 834 },
  lead: { x: 232, y: 810, w: 494, h: 180 },
  copy: [{ x: 232, y: 130, w: 160, h: 14 }, { x: 118, y: 130, w: 18, h: 14 }, { x: 232, y: 676, w: 740, h: 14 }, { x: 232, y: 765, w: 160, h: 14 }],
};
const wide: Targets = {
  ...desktop, vw: 2560, vh: 1440,
  head: { x: 640, y: 0, w: 1280, h: 66 },
  h1: { x: 792, y: 174, w: 848, h: 246 }, body: { x: 736, y: 66, w: 1080, h: 640 },
  lede: { x: 792, y: 446, w: 720, h: 94 }, actions: { x: 792, y: 572, w: 311, h: 48 },
  section: { x: 736, y: 701, w: 1080, h: 600 }, sectionBody: { x: 792, y: 765, w: 928, h: 536 },
  rail: { x: 735, y: 66, w: 1, h: 1374 },
  lead: { x: 792, y: 810, w: 494, h: 180 },
  copy: [{ x: 792, y: 130, w: 160, h: 14 }, { x: 792, y: 676, w: 740, h: 14 }, { x: 792, y: 765, w: 160, h: 14 }, { x: 792, y: 1010, w: 726, h: 300 }],
};
const phone: Targets = {
  vw: 390, vh: 844,
  header: { x: 0, y: 0, w: 390, h: 66 },
  head: { x: 0, y: 0, w: 390, h: 66 },
  h1: { x: 76, y: 138, w: 274, h: 144 },
  body: { x: 56, y: 66, w: 322, h: 600 },
  lede: { x: 76, y: 300, w: 274, h: 130 },
  actions: { x: 76, y: 448, w: 274, h: 110 },
  section: { x: 56, y: 696, w: 322, h: 600 }, sectionBody: { x: 76, y: 736, w: 274, h: 560 },
  rail: { x: 55, y: 66, w: 1, h: 778 },
  lead: { x: 76, y: 780, w: 274, h: 200 },
  copy: [{ x: 76, y: 100, w: 160, h: 14 }, { x: 76, y: 590, w: 274, h: 60 }, { x: 76, y: 760, w: 160, h: 14 }, { x: 76, y: 780, w: 274, h: 200 }],
};

const read = new Map<string, Chip>(CHIP_KEYS.map((key) => [key, { key, text: key, anchor: null }]));
const sizes = new Map<string, Size>([...CHIP_KEYS.map((k): [string, Size] => [k, { w: 100, h: 20 }]), ...READ_KEYS.map((k): [string, Size] => [k, { w: 34, h: 14 }])]);
const isLine = (p: Placed) => p.line !== undefined;
const spines = (placed: Placed[]) => placed.filter((p) => p.key.startsWith('spine-'));
const stackOf = (placed: Placed[], g: keyof typeof GROUPS) => placed.filter((p) => (GROUPS[g] as readonly string[]).includes(p.key));

describe('layout invariants', () => {
  for (const [name, t] of [['desktop', desktop], ['wide', wide], ['phone', phone]] as const) {
    it(`${name}: everything is inside the viewport, nothing overlaps but line and line, no chip touches copy, --i ascends`, () => {
      const { placed } = layout(t, read, sizes);
      const paper = { x: 0, y: 0, w: t.vw, h: t.vh };
      const copy = [t.h1, t.lede!, t.actions!, ...t.copy];
      expect(placed.length).toBeGreaterThan(20);
      placed.forEach((p, n) => {
        expect(p.i, p.key).toBe(n);
        expect(inside(p.rect, paper), p.key).toBe(true);
        if (!isLine(p) && !READ_KEYS.includes(p.key as (typeof READ_KEYS)[number])) {
          for (const c of copy) expect(overlaps(p.rect, c, 0), `${p.key} on copy`).toBe(false);
        }
        for (const q of placed.slice(n + 1)) {
          if (isLine(p) && isLine(q)) continue;
          expect(overlaps(p.rect, q.rect, 0), `${p.key} vs ${q.key}`).toBe(false);
        }
      });
    });
  }
  it('reports the width readout\'s index', () => {
    const { placed, widthOrder } = layout(desktop, read, sizes);
    expect(placed[widthOrder]?.key).toBe('width');
  });
});

describe('blocks', () => {
  const RIGHT = ['layout', 'tokens', 'env'] as const;
  const spineOf = (placed: Placed[], g: keyof typeof GROUPS) => placed.find((p) => p.key === `spine-${g}`)!;
  it('places the groups rail, layout, tokens, env, section, in that --i order', () => {
    expect(GROUP_KEYS).toEqual(['rail', 'layout', 'tokens', 'env', 'section']);
    expect(spines(layout(desktop, read, sizes).placed).map((p) => p.key)).toEqual(['spine-rail', 'spine-layout', 'spine-tokens', 'spine-env']);
  });
  it('desktop: the rail block stands left of the rail rule, spine on its right edge, every chip SPINE off it', () => {
    const { placed } = layout(desktop, read, sizes);
    const spine = spineOf(placed, 'rail');
    expect(spine.rect.x).toBeLessThan(placed.find((p) => p.key === 'rail')!.rect.x);
    for (const c of stackOf(placed, 'rail')) expect(c.rect.x + c.rect.w + SPINE, c.key).toBe(spine.rect.x);
  });
  it('desktop: layout, tokens and env open 12px right of the heading, spines on their left edges, one under another', () => {
    const { placed } = layout(desktop, read, sizes);
    const right = RIGHT.map((g) => spineOf(placed, g));
    for (const s of right) expect(s.rect.x, s.key).toBe(desktop.h1.x + desktop.h1.w + 12);
    for (let k = 1; k < right.length; k++) expect(right[k]!.rect.y, right[k]!.key).toBeGreaterThanOrEqual(right[k - 1]!.rect.y + right[k - 1]!.rect.h);
    for (const g of RIGHT) for (const c of stackOf(placed, g)) expect(c.rect.x, c.key).toBeGreaterThanOrEqual(spineOf(placed, g).rect.x + 1 + SPINE);
  });
  it("desktop: a right block lays its chips in rows — layout's three share one y, GAP apart; env wraps onto three", () => {
    const { placed } = layout(desktop, read, sizes);
    const row = stackOf(placed, 'layout');
    expect(new Set(row.map((c) => c.rect.y)).size).toBe(1);
    for (let k = 1; k < row.length; k++) expect(row[k]!.rect.x).toBe(row[k - 1]!.rect.x + row[k - 1]!.rect.w + GAP);
    expect(new Set(stackOf(placed, 'env').map((c) => c.rect.y)).size).toBe(3);
  });
  it('wide: the right blocks are one row each, and the section block stands beside the lead, 12px off its right edge, inside the section box', () => {
    const { placed } = layout(wide, read, sizes);
    for (const g of RIGHT) expect(new Set(stackOf(placed, g).map((c) => c.rect.y)).size, g).toBe(1);
    const spine = spineOf(placed, 'section');
    expect(spine.rect.x).toBe(wide.lead!.x + wide.lead!.w + 12);
    expect(stackOf(placed, 'section')).toHaveLength(5);
    const right = placed.find((p) => p.key === 'section-right')!.rect.x;
    for (const c of stackOf(placed, 'section')) expect(c.rect.x + c.rect.w + GAP, c.key).toBeLessThanOrEqual(right);
  });
  it('desktop: no section block while the lead paragraph runs past the fold', () => {
    const { placed } = layout(desktop, read, sizes);
    expect(placed.some((p) => p.key === 'spine-section')).toBe(false);
    expect(stackOf(placed, 'section')).toHaveLength(0);
  });
  it('phone: no block fits; the groups fall back to single chips in --i order until the page is full, no spine', () => {
    const { placed } = layout(phone, read, sizes);
    expect(spines(placed)).toEqual([]);
    expect(stackOf(placed, 'rail').length).toBeGreaterThan(0);
    expect(stackOf(placed, 'layout').length).toBeGreaterThan(0);
    expect(stackOf(placed, 'env')).toEqual([]);
    expect(stackOf(placed, 'section')).toEqual([]);
  });
  it('a group with no readings places nothing', () => {
    const none = new Map([...read].filter(([k]) => !(GROUPS.rail as readonly string[]).includes(k)));
    const { placed } = layout(desktop, none, sizes);
    expect(placed.some((p) => p.key === 'spine-rail')).toBe(false);
    expect(GROUP_KEYS).toContain('rail');
  });
});

describe('lines and readouts', () => {
  it('places every line the frame draws, in its order, with its dash count', () => {
    const { placed } = layout(desktop, read, sizes);
    const lines = placed.filter(isLine).filter((p) => !p.key.startsWith('spine-'));
    expect(lines.map((p) => p.key)).toEqual([...LINE_KEYS]);
    expect(lines.find((p) => p.key === 'h1-top')!.line!.n).toBe(94);
    expect(lines.find((p) => p.key === 'rail')!.line!.vertical).toBe(true);
  });
});
