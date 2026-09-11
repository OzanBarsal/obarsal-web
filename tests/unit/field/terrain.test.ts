import { describe, expect, it } from 'vitest';
import { TERRAIN } from '../../../lib/field/constants';
import { height } from '../../../lib/field/terrain';

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
