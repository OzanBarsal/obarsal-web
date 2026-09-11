import { describe, expect, it } from 'vitest';
import {
  SPINE,
  beside,
  blockAt,
  blockSize,
  columns,
  free,
  inside,
  overlaps,
  place,
  rows,
  scan,
  type Rect,
} from '@/lib/instruments/place';

const bounds: Rect = { x: 0, y: 0, w: 200, h: 100 };
const size = { w: 40, h: 10 };

describe('overlaps', () => {
  it('is true when boxes intersect or sit closer than the gap, false beyond it', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: 13, y: 0, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: 14, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: 0, y: 14, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: 13, y: 0, w: 10, h: 10 }, 2)).toBe(false);
  });
});

describe('inside', () => {
  it('requires the whole box within the bounds', () => {
    expect(inside({ x: 160, y: 90, w: 40, h: 10 }, bounds)).toBe(true);
    expect(inside({ x: 161, y: 90, w: 40, h: 10 }, bounds)).toBe(false);
    expect(inside({ x: -1, y: 0, w: 40, h: 10 }, bounds)).toBe(false);
  });
});

describe('free', () => {
  const r: Rect = { x: 100, y: 40, w: 40, h: 10 };
  it('is true only when the box is inside the bounds and clear of every taken one', () => {
    expect(free(r, bounds, [])).toBe(true);
    expect(free(r, bounds, [{ x: 0, y: 0, w: 10, h: 10 }])).toBe(true);
    expect(free({ ...r, y: 95 }, bounds, [])).toBe(false);
    expect(free({ ...r, x: 170 }, bounds, [])).toBe(false);
    expect(free(r, bounds, [{ x: 120, y: 45, w: 10, h: 10 }])).toBe(false);
    expect(free(r, bounds, [{ x: 0, y: 0, w: 10, h: 10 }, { x: 143, y: 40, w: 10, h: 10 }])).toBe(false);
  });
});

describe('beside', () => {
  it('offers a column to the right first, then a row below right-aligned, a column left, a row above', () => {
    const c = beside({ x: 50, y: 50, w: 20, h: 20 }, size);
    expect(c).toHaveLength(16);
    expect(c[0]).toEqual({ x: 82, y: 50 });
    expect(c[1]).toEqual({ x: 82, y: 66 });
    expect(c[4]).toEqual({ x: 30, y: 78 });
    expect(c[5]).toEqual({ x: -16, y: 78 });
    expect(c[8]).toEqual({ x: -2, y: 50 });
    expect(c[12]).toEqual({ x: 50, y: 32 });
  });
});

describe('scan', () => {
  it('returns the top-most, then right-most free spot on the step grid', () => {
    expect(scan(size, bounds, [])).toEqual({ x: 160, y: 0, w: 40, h: 10 });
    expect(scan(size, bounds, [{ x: 160, y: 0, w: 40, h: 10 }])).toEqual({ x: 112, y: 0, w: 40, h: 10 });
  });
  it('returns null when nothing fits', () => {
    expect(scan(size, bounds, [{ x: 0, y: 0, w: 200, h: 100 }])).toBeNull();
    expect(scan({ w: 201, h: 10 }, bounds, [])).toBeNull();
  });
});

describe('place', () => {
  it('prefers a free candidate beside the anchor over the scan', () => {
    expect(place(size, { x: 50, y: 50, w: 20, h: 20 }, bounds, [])).toEqual({ x: 82, y: 50, w: 40, h: 10 });
  });
  it('falls back to the scan when every candidate beside the anchor is taken or outside', () => {
    const anchor = { x: 150, y: 80, w: 50, h: 20 };
    const blocked = beside(anchor, size).map((p) => ({ x: p.x, y: p.y, w: size.w, h: size.h }));
    const r = place(size, anchor, bounds, [anchor, ...blocked]);
    expect(r).toEqual({ x: 160, y: 0, w: 40, h: 10 });
  });
  it('never returns a box that overlaps a taken one or leaves the bounds', () => {
    const taken: Rect[] = [];
    for (let i = 0; i < 60; i++) {
      const r = place(size, i % 2 ? { x: 100, y: 40, w: 10, h: 10 } : null, bounds, taken);
      if (!r) break;
      expect(inside(r, bounds)).toBe(true);
      expect(taken.some((t) => overlaps(r, t))).toBe(false);
      taken.push(r);
    }
    expect(taken.length).toBeGreaterThan(10);
    expect(place(size, null, bounds, taken)).toBeNull();
  });
});

describe('columns', () => {
  const edge = 160;
  it('opens a column SPINE left of the edge and fills it top-down before moving left', () => {
    expect(SPINE).toBe(8);
    expect(columns(size, edge, 'left', bounds, [])).toEqual({ x: 112, y: 0, w: 40, h: 10 });
    const first = { x: 112, y: 0, w: 40, h: 10 };
    expect(columns(size, edge, 'left', bounds, [first])).toEqual({ x: 112, y: 16, w: 40, h: 10 });
    const column = Array.from({ length: 7 }, (_, k) => ({ x: 112, y: k * 16, w: 40, h: 10 }));
    expect(columns(size, edge, 'left', bounds, column)).toEqual({ x: 64, y: 0, w: 40, h: 10 });
  });
  it('opens a column 12px right of the edge and steps rightward', () => {
    expect(columns(size, 40, 'right', bounds, [])).toEqual({ x: 52, y: 0, w: 40, h: 10 });
    expect(columns(size, 40, 'right', bounds, [{ x: 52, y: 0, w: 40, h: 100 }])).toEqual({ x: 100, y: 0, w: 40, h: 10 });
  });
  it('returns null when no column fits between the edge and the bounds', () => {
    expect(columns(size, 47, 'left', bounds, [])).toBeNull();
    expect(columns(size, 149, 'right', bounds, [])).toBeNull();
    expect(columns(size, edge, 'left', bounds, [{ x: 0, y: 0, w: 200, h: 100 }])).toBeNull();
  });
});

describe('rows and blockSize', () => {
  it('wraps greedily at the width, GAP between chips; a chip wider than the width gets its own row', () => {
    expect(rows([size, size, size], 84)).toEqual([[size, size], [size]]);
    expect(rows([size, size, size], 83)).toEqual([[size], [size], [size]]);
    expect(rows([{ w: 100, h: 10 }, size], 50)).toEqual([[{ w: 100, h: 10 }], [size]]);
  });
  it('is the widest row plus the spine and its gap, and the rows plus a gap around each', () => {
    expect(blockSize([[{ w: 90, h: 20 }], [{ w: 120, h: 20 }], [{ w: 60, h: 20 }]])).toEqual({ w: 129, h: 76 });
    expect(blockSize([[size, size], [size]])).toEqual({ w: 93, h: 32 });
  });
});

describe('blockAt', () => {
  const grid = [[size, size], [size]];
  const r = { x: 100, y: 50, ...blockSize(grid) };
  it('puts the spine on the right edge and right-aligns each row SPINE off it when the block is on the left', () => {
    const s = blockAt(r, grid, 'left');
    expect(s.spine).toEqual({ x: 192, y: 50, w: 1, h: 32 });
    expect(s.chips).toEqual([{ x: 144, y: 54, w: 40, h: 10 }, { x: 100, y: 54, w: 40, h: 10 }, { x: 144, y: 68, w: 40, h: 10 }]);
  });
  it('puts the spine on the left edge and left-aligns each row when the block is on the right; every chip stays inside the rect and clear of the rest', () => {
    const s = blockAt(r, grid, 'right');
    expect(s.spine).toEqual({ x: 100, y: 50, w: 1, h: 32 });
    expect(s.chips).toEqual([{ x: 109, y: 54, w: 40, h: 10 }, { x: 153, y: 54, w: 40, h: 10 }, { x: 109, y: 68, w: 40, h: 10 }]);
    for (const side of ['left', 'right'] as const) blockAt(r, grid, side).chips.forEach((c, k, all) => {
      expect(inside(c, r), side).toBe(true);
      for (const d of all.slice(k + 1)) expect(overlaps(c, d, 0), side).toBe(false);
    });
  });
});
