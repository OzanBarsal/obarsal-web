import { describe, expect, it } from 'vitest';
import { BEATS, beatAt, countUp } from './beats';

describe('beatAt', () => {
  it('maps every boundary to its beat', () => {
    expect(beatAt(-5)).toBe(0);
    expect(beatAt(0)).toBe(0);
    expect(beatAt(1399)).toBe(0);
    expect(beatAt(1400)).toBe(1);
    expect(beatAt(2999)).toBe(1);
    expect(beatAt(3000)).toBe(2);
    expect(beatAt(4399)).toBe(2);
    expect(beatAt(4400)).toBe(3);
    expect(beatAt(60_000)).toBe(3);
  });
});

describe('countUp', () => {
  it('holds the start before the count window, ends at the target after it, and is linear between', () => {
    expect(countUp(56, 1184, 0)).toBe(56);
    expect(countUp(56, 1184, BEATS[1])).toBe(56);
    expect(countUp(56, 1184, (BEATS[1] + BEATS[2]) / 2)).toBe(620);
    expect(countUp(56, 1184, BEATS[2])).toBe(1184);
    expect(countUp(56, 1184, 5000)).toBe(1184);
  });
});
