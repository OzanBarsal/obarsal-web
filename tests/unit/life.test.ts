import { describe, expect, it } from 'vitest';
import { DK, GRADE_NEAR, GRADE_SPAN, GROWTH_INTERVAL, MAX_NODES, SPEED } from '../../lib/field/constants';
import { type Detail } from '../../lib/field/attractors';
import { view } from '../../lib/field/camera';
import { createField, type Seed } from '../../lib/field/life';
import { height } from '../../lib/field/terrain';

const box = { x0: -60, x1: 60, z0: -20, z1: 140 };
const inBox = (x: number, z: number) => x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;
const run = (seconds: number, rng = mulberry(1)) => {
  const f = createField();
  const seed = (place: (x: number, z: number) => void) => {
    for (let i = 0; i < 40; i++) place(box.x0 + rng() * (box.x1 - box.x0), box.z0 + rng() * (box.z1 - box.z0));
  };
  for (let t = 0; t <= seconds; t += 1 / 60) f.step(t, seed, inBox, () => 1);
  return f;
};
function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

describe('space colonization', () => {
  it('fills the seeded region rather than drawing a few lines', () => {
    const f = run(60);
    // The measure that matters: how much of the region is within DK of some node.
    const grid = 40;
    let reached = 0;
    for (let a = 0; a < grid; a++) for (let b = 0; b < grid; b++) {
      const x = box.x0 + ((a + 0.5) / grid) * (box.x1 - box.x0);
      const z = box.z0 + ((b + 0.5) / grid) * (box.z1 - box.z0);
      let covered = false;
      for (let i = 0; i < f.live && !covered; i++) {
        const o = i * 9, ex = f.segments[o + 3]! - x, ez = f.segments[o + 5]! - z;
        covered = ex * ex + ez * ez <= DK * DK;
      }
      if (covered) reached += 1;
    }
    expect(reached / (grid * grid), 'fraction of the region within DK of a drawn endpoint').toBeGreaterThan(0.9);
  });

  it('branches: many nodes have two children', () => {
    const f = run(60);
    const children = new Map<number, number>();
    for (let i = 0; i < f.live; i++) {
      const o = i * 9;
      const k = `${f.segments[o]!.toFixed(3)},${f.segments[o + 2]!.toFixed(3)}`;
      children.set(k as unknown as number, (children.get(k as unknown as number) ?? 0) + 1);
    }
    const forks = [...children.values()].filter((n) => n >= 2).length;
    expect(forks, 'fork points in the drawn record').toBeGreaterThan(30);
  });

  it('closes loops and flashes when it does', () => {
    const f = run(60);
    expect(f.flashes.length, 'anastomoses').toBeGreaterThan(0);
  });

  it('is deterministic in its seed', () => {
    const a = run(30), b = run(30);
    expect(Array.from(a.segments.subarray(0, a.live * 9))).toEqual(Array.from(b.segments.subarray(0, b.live * 9)));
  });

  it('keeps every endpoint on the terrain', () => {
    const f = run(20);
    for (let i = 0; i < f.live; i += 11) {
      const o = i * 9;
      expect(f.segments[o + 1]).toBeCloseTo(height(f.segments[o]!, f.segments[o + 2]!), 4);
      expect(f.segments[o + 4]).toBeCloseTo(height(f.segments[o + 3]!, f.segments[o + 5]!), 4);
    }
  });

  it('never exceeds the ring, and drops what a moving region cannot see', () => {
    const f = createField();
    const rng = mulberry(1);
    let front = 0;
    const window = (x: number, z: number) => x >= box.x0 && x <= box.x1 && z >= front - 40 && z <= front + 60;
    for (let t = 0; t <= 120; t += 1 / 60) {
      front = t * 8;
      f.step(t, (place) => {
        for (let i = 0; i < 40; i++) place(box.x0 + rng() * (box.x1 - box.x0), front - 40 + rng() * 100);
      }, window, () => 1);
    }
    expect(f.live).toBeLessThanOrEqual(MAX_NODES);
    let outside = 0;
    for (let i = 0; i < f.live; i++) { const o = i * 9; if (!window(f.segments[o + 3]!, f.segments[o + 5]!)) outside++; }
    expect(outside / Math.max(1, f.live), 'fraction drawn outside the region').toBeLessThan(0.25);
  });

  it('never draws the same span twice', () => {
    const f = run(120);
    const seen = new Map<string, number>();
    for (let i = 0; i < f.live; i++) {
      const o = i * 9;
      seen.set(`${f.segments[o]},${f.segments[o + 2]},${f.segments[o + 3]},${f.segments[o + 5]}`,
        (seen.get(`${f.segments[o]},${f.segments[o + 2]},${f.segments[o + 3]},${f.segments[o + 5]}`) ?? 0) + 1);
    }
    let repeats = 0, worst = 0;
    for (const n of seen.values()) { repeats += n - 1; worst = Math.max(worst, n); }
    expect(repeats, `segments repeating a span already drawn (${seen.size} distinct spans, worst repeated ${worst}x)`).toBe(0);
  });

  it('never roots a second line', () => {
    const f = createField();
    const rng = mulberry(1);
    let front = 0;
    const window = (x: number, z: number) => x >= box.x0 && x <= box.x1 && z >= front + 20 && z <= front + 120;
    for (let t = 0; t <= 120; t += 1 / 60) {
      front = t * SPEED;
      f.step(t, (place) => {
        for (let i = 0; i < 40; i++) place(box.x0 + rng() * (box.x1 - box.x0), front + 20 + rng() * 100);
      }, window, () => 1);
    }
    expect(f.reroots, 'lines rooted from nothing after the first').toBe(0);
    expect(f.nodes, 'nodes alive at the end, so the run did not pass by dying').toBeGreaterThan(0);
  });

  it('spaces attractors by the birth distances', () => {
    const f = run(20);
    expect(f.attractors).toBeGreaterThan(0);
  });

  it('subdivides veined ground when the detail scale shrinks', () => {
    const grow = (detail: Detail) => {
      const field = createField();
      const seed: Seed = (place) => { for (let i = 0; i < 300; i++) place(((i * 7) % 41) - 20, 8 + ((i * 13) % 37)); };
      for (let t = 0; t <= 8; t += GROWTH_INTERVAL) field.step(t, seed, () => true, detail);
      return field.live;
    };
    const coarse = grow(() => 1);
    const graded = grow((_x, z) => Math.max(GRADE_NEAR, Math.min(1, z / GRADE_SPAN)));
    expect(graded, `graded ${graded} against coarse ${coarse}`).toBeGreaterThan(coarse * 3);
  });

  it('never loses the frontier to a camera flying at SPEED', () => {
    const field = createField();
    for (let t = 0; t <= 12; t += GROWTH_INTERVAL) {
      const camZ = t * SPEED;
      const v = view(1440, 900, camZ, 0);
      field.step(t, v.seed, v.visible, v.detail);
    }
    expect(field.reroots, 'the field was overtaken by the camera and re-rooted').toBe(0);
    expect(field.live, 'segments alive after a 12 s flight').toBeGreaterThan(800);
  });
});
