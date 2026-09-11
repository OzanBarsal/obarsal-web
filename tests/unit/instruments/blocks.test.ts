import { describe, expect, it } from 'vitest';
import { SPINE, blockAt, blockSize, columns, inside, overlaps, rows, span, type Rect } from '@/lib/instruments/place';

const bounds: Rect = { x: 0, y: 0, w: 200, h: 100 };
const size = { w: 40, h: 10 };

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

describe('span', () => {
  it('is the widest chip row whose block columns() can still open beside the edge, on either side', () => {
    for (const [edge, side] of [[160, 'left'], [40, 'right']] as const) {
      const fits = blockSize([[{ w: span(edge, side, bounds), h: 10 }]]);
      expect(columns(fits, edge, side, bounds, []), side).not.toBeNull();
      const over = blockSize([[{ w: span(edge, side, bounds) + 1, h: 10 }]]);
      expect(columns(over, edge, side, bounds, []), side).toBeNull();
    }
  });
});
