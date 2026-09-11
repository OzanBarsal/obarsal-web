import { CHIP_KEYS, GROUPS, GROUP_KEYS, type Chip, type GroupKey } from './chips';
import { MARGIN, READ_KEYS, dashes, lines, readoutAt, type Line, type Targets } from './frame';
import { GAP, SPINE, blockAt, blockSize, columns, free, place, rows, type Rect, type Side, type Size } from './place';

export type Placed = { key: string; rect: Rect; i: number; line?: { from: string; n: number; ms: number; vertical: boolean } };

export type Layout = { placed: Placed[]; widthOrder: number };

type Region = { edge: number; side: Side; x0: number; x1: number; bounds: Rect };

const TOP_DOWN = '0 0 100% 0';

function regions(t: Targets, railX: number, bounds: Rect): Record<GroupKey, Region | null> {
  const left: Region = { edge: railX, side: 'left', x0: MARGIN, x1: railX - SPINE, bounds };
  const h1Right = t.h1.x + t.h1.w;
  const right: Region = { edge: h1Right, side: 'right', x0: h1Right + 12, x1: t.vw - MARGIN, bounds };
  let beside: Region | null = null;
  if (t.lead && t.lead.y + t.lead.h <= t.vh) {
    const leadRight = t.lead.x + t.lead.w;
    const x1 = t.sectionBody ? t.sectionBody.x + t.sectionBody.w - 1 - GAP : t.body.x + t.body.w;
    const span = { x: MARGIN, y: t.lead.y, w: x1 - MARGIN, h: bounds.y + bounds.h - t.lead.y };
    beside = { edge: leadRight, side: 'right', x0: leadRight + 12, x1, bounds: span };
  }
  return { rail: left, layout: right, tokens: right, env: right, section: beside };
}

export function layout(t: Targets, read: ReadonlyMap<string, Chip>, sizes: ReadonlyMap<string, Size>): Layout {
  const taken: Rect[] = [];
  const placed: Placed[] = [];
  const add = (key: string, rect: Rect, line?: Placed['line']) => placed.push({ key, rect, i: placed.length, line });
  const put = (key: string, rect: Rect, line?: Placed['line']) => { add(key, rect, line); taken.push(rect); };
  const rule = (l: Line) => {
    const { n, ms } = dashes(Math.max(l.rect.w, l.rect.h));
    put(l.key, l.rect, { from: l.from, n, ms, vertical: l.rect.h > l.rect.w });
  };
  const drawn = lines(t);
  drawn.forEach(rule);
  const railX = drawn.find((l) => l.key === 'rail')?.rect.x ?? MARGIN;
  const paper = { x: MARGIN, y: MARGIN, w: t.vw - 2 * MARGIN, h: t.vh - 2 * MARGIN };
  let widthOrder = 0;
  for (const key of READ_KEYS) {
    const size = sizes.get(key);
    if (!size) continue;
    const r = readoutAt(key, size, t);
    if (!free(r, paper, taken)) continue;
    if (key === 'width') widthOrder = placed.length;
    put(key, r);
  }
  taken.push(t.h1, ...t.copy);
  if (t.lede) taken.push(t.lede);
  if (t.actions) taken.push(t.actions);
  const bounds = { x: MARGIN, y: t.header.y + t.header.h + MARGIN, w: t.vw - 2 * MARGIN, h: t.vh - t.header.h - 2 * MARGIN };
  const grouped = new Set<string>(GROUP_KEYS.flatMap((g) => GROUPS[g]));
  const single = (key: string, anchor: Rect | null) => {
    const size = sizes.get(key);
    if (!size) return;
    const r = place(size, anchor, bounds, taken);
    if (r) put(key, r);
  };
  for (const key of CHIP_KEYS) {
    const chip = read.get(key);
    if (chip && !grouped.has(key)) single(key, chip.anchor);
  }
  const where = regions(t, railX, bounds);
  for (const g of GROUP_KEYS) {
    const keys = GROUPS[g].filter((k) => read.has(k) && sizes.has(k));
    const region = where[g];
    if (!keys.length || !region) continue;
    const grid = rows(keys.map((k) => sizes.get(k)!), region.x1 - region.x0 - 1 - SPINE);
    const r = columns(blockSize(grid), region.edge, region.side, region.bounds, taken);
    if (!r) { for (const k of keys) single(k, null); continue; }
    const s = blockAt(r, grid, region.side);
    taken.push(r);
    const { n, ms } = dashes(s.spine.h);
    add(`spine-${g}`, s.spine, { from: TOP_DOWN, n, ms, vertical: true });
    keys.forEach((k, j) => add(k, s.chips[j]!));
  }
  return { placed, widthOrder };
}
