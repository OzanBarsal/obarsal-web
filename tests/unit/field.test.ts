import { describe, expect, it } from 'vitest';
import { CELL, FLOATS, GROWTH_SPEED, SLOT_CAPACITY, STEP, TERRAIN, THETA } from '../../lib/field/constants';
import { height } from '../../lib/field/terrain';
import { cameraY, focal, horizonFraction } from '../../lib/field/camera';
import { cellSeed, generateCell } from '../../lib/field/growth';

describe('terrain', () => {
  it('is deterministic', () => {
    expect(height(12.5, 300.25)).toBe(height(12.5, 300.25));
  });
  it('stays within the summed amplitude', () => {
    const bound = TERRAIN[0].amplitude + TERRAIN[1].amplitude;
    for (let i = 0; i < 2000; i++) {
      const h = height((i * 7.3) % 500 - 250, i * 1.7);
      expect(Math.abs(h)).toBeLessThanOrEqual(bound);
    }
  });
  it('is continuous: a 0.1-unit step never moves more than 0.1 in height', () => {
    for (let z = 0; z < 600; z += 0.1) {
      expect(Math.abs(height(3, z + 0.1) - height(3, z))).toBeLessThan(0.1);
    }
  });
  it('is not flat', () => {
    const samples = Array.from({ length: 50 }, (_, i) => height(i * 11, i * 13));
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(2);
  });
});

describe('camera', () => {
  it('puts the horizon at 28% on desktop and 43% on mobile', () => {
    expect(horizonFraction(1440, 820)).toBe(0.28);
    expect(horizonFraction(390, 844)).toBe(0.43);
  });
  it('matches the reference: 1440×820 gives f ≈ 0.62·w', () => {
    expect(focal(1440, 820) / 1440).toBeCloseTo(0.62, 1);
  });
  it('solves f so the horizon lands at the fraction', () => {
    const f = focal(1440, 820);
    expect(820 / 2 - f * Math.tan(THETA)).toBeCloseTo(0.28 * 820, 6);
  });
  it('rides the terrain plus the lift', () => {
    expect(cameraY(100, 2)).toBeCloseTo(17 + height(0, 100) + 2, 9);
  });
});

describe('growth', () => {
  const cell = generateCell(4, 10);
  const n = cell.length / FLOATS;
  const seg = (i: number) => Array.from(cell.subarray(i * FLOATS, (i + 1) * FLOATS));

  it('seeds a cell from its index, sign included', () => {
    expect(cellSeed(4)).toBe(((4 + 1048576) * 2654435761 + 7) % 2147483647);
    expect(cellSeed(-3)).not.toBe(cellSeed(3));
  });
  it('is deterministic and fits a slot', () => {
    expect(Array.from(generateCell(4, 10))).toEqual(Array.from(cell));
    expect(n).toBeGreaterThan(500);
    expect(n).toBeLessThanOrEqual(SLOT_CAPACITY);
  });
  it("keeps every sub-segment within the step and within 60 units of its cell's z range", () => {
    for (let i = 0; i < n; i++) {
      const [x0, , z0, x1, , z1] = seg(i);
      expect(Math.hypot(x1! - x0!, z1! - z0!)).toBeLessThanOrEqual(STEP + 1e-9);
      expect(z0!).toBeGreaterThanOrEqual(4 * CELL - 60);
      expect(z1!).toBeLessThanOrEqual(5 * CELL + 60);
    }
  });
  it('places every endpoint on the terrain', () => {
    for (let i = 0; i < n; i += 37) {
      const [x0, y0, z0, x1, y1, z1] = seg(i);
      expect(y0).toBeCloseTo(height(x0!, z0!), 4);
      expect(y1).toBeCloseTo(height(x1!, z1!), 4);
    }
  });
  it('gives birth times from the spawn time at the growth speed, and durations from length', () => {
    for (let i = 0; i < n; i += 41) {
      const [x0, , z0, x1, , z1, , birth, duration] = seg(i);
      expect(birth).toBeGreaterThanOrEqual(10);
      expect(duration).toBeCloseTo(Math.hypot(x1! - x0!, z1! - z0!) / GROWTH_SPEED, 4);
    }
    let chained = 0;
    for (let i = 1; i < n; i++) {
      const prev = seg(i - 1);
      const next = seg(i);
      if (prev[6] === -1 || next[6] === -1) continue;
      if (next[0] !== prev[3] || next[2] !== prev[5]) continue;
      expect(next[7]! - prev[7]!).toBeCloseTo(prev[8]!, 4);
      chained++;
    }
    expect(chained).toBeGreaterThanOrEqual(100);
  });
  it('emits each rejoin once, so no two sub-segments share a pair of endpoints', () => {
    const pairs = new Set<string>();
    let duplicates = 0;
    for (let i = 0; i < n; i++) {
      const [x0, , z0, x1, , z1] = seg(i);
      const a = `${x0},${z0}`;
      const b = `${x1},${z1}`;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (pairs.has(key)) duplicates++;
      pairs.add(key);
    }
    expect(duplicates).toBe(0);
  });
  it('rejoins at least one branch to another', () => {
    const depths = new Set<number>();
    for (let i = 0; i < n; i++) depths.add(seg(i)[6]!);
    expect(depths.has(-1)).toBe(true);
  });
});
