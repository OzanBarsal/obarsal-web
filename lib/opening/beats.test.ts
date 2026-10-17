import { describe, expect, it } from 'vitest';
import { CHIP_KEYS, GROUP_KEYS } from '@/lib/instruments/chips';
import { LINE_KEYS, READ_KEYS } from '@/lib/instruments/frame';
import { BEATS, EXIT_STAGGER, STAGGER, beatAt, countUp, reached } from './beats';

const INSTRUMENTS = LINE_KEYS.length + GROUP_KEYS.length + READ_KEYS.length + CHIP_KEYS.length;

describe('beatAt', () => {
  it('maps every boundary to its beat', () => {
    expect(beatAt(-5)).toBe(0);
    expect(beatAt(0)).toBe(0);
    expect(beatAt(1599)).toBe(0);
    expect(beatAt(1600)).toBe(1);
    expect(beatAt(2849)).toBe(1);
    expect(beatAt(2850)).toBe(2);
    expect(beatAt(3599)).toBe(2);
    expect(beatAt(3600)).toBe(3);
    expect(beatAt(60_000)).toBe(3);
  });
  it('holds 1250ms between build and exit, and leaves the exit 750ms', () => {
    expect(BEATS[2] - BEATS[1]).toBe(1250);
    expect(BEATS[3] - BEATS[2]).toBe(750);
  });
  it('staggers 20ms per index, so every instrument lands before the hold', () => {
    expect(STAGGER).toBe(20);
    expect(INSTRUMENTS * STAGGER + 420).toBeLessThan(BEATS[1]);
  });
  it('blinks out 6ms per index, so the last instrument is gone inside the exit', () => {
    expect(EXIT_STAGGER).toBe(6);
    expect(INSTRUMENTS * EXIT_STAGGER + 360).toBeLessThan(BEATS[3] - BEATS[2]);
  });
});

describe('reached', () => {
  it('lists every beat up to the current one, space-separated, so a beat never skips a rule', () => {
    expect(reached(0)).toBe('0');
    expect(reached(2)).toBe('0 1 2');
    expect(reached(3)).toBe('0 1 2 3');
  });
});

describe('countUp', () => {
  it('holds the start before its window, ends at the target after it, and is linear between', () => {
    expect(countUp(0, 848, 0, 420, 1020)).toBe(0);
    expect(countUp(0, 848, 420, 420, 1020)).toBe(0);
    expect(countUp(0, 848, 720, 420, 1020)).toBe(424);
    expect(countUp(0, 848, 1020, 420, 1020)).toBe(848);
    expect(countUp(0, 848, 7000, 420, 1020)).toBe(848);
  });
});
