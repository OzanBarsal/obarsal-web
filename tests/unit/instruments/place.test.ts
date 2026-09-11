import { describe, expect, it } from 'vitest';
import { beside, free, inside, overlaps, place, scan, type Rect } from '@/lib/instruments/place';

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
