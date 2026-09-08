import { describe, expect, it } from 'vitest';
import { CAM_H, D, DI, GRADE_FLOOR, GRADE_NEAR, GRADE_SPAN, GROWTH_INTERVAL, HORIZON_DESKTOP, LIFT, REACH, SPEED, TERRAIN, THETA } from '../../lib/field/constants';
import { height } from '../../lib/field/terrain';
import { cameraY, DARTS, focal, horizonFraction, view } from '../../lib/field/camera';

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
  it('puts the horizon at 19.56% on desktop and 39.93% on mobile', () => {
    expect(horizonFraction(1440, 820)).toBe(0.1956);
    expect(horizonFraction(390, 844)).toBe(0.3993);
  });
  it('gives f ≈ 0.72·w at 1440×820', () => {
    expect(focal(1440, 820) / 1440).toBeCloseTo(0.72, 2);
  });
  it('solves f so the horizon lands at the fraction', () => {
    const f = focal(1440, 820);
    expect(820 / 2 - f * Math.tan(THETA)).toBeCloseTo(HORIZON_DESKTOP * 820, 6);
  });
  it('rides the terrain plus the lift', () => {
    expect(cameraY(100, 2)).toBeCloseTo(CAM_H + height(0, 100) + 2, 9);
  });
  it('puts the camera 13 units above the terrain', () => {
    expect(CAM_H).toBe(13);
  });

  it('grows the frontier at least a quarter faster than the camera flies', () => {
    const frontier = (D * GRADE_FLOOR) / GROWTH_INTERVAL;
    expect(
      frontier / SPEED,
      `frontier ${frontier} units/s against camera ${SPEED.toFixed(2)} units/s`,
    ).toBeGreaterThan(1.25);
  });
});

describe('view', () => {
  const CAMS = [0, 137.4, 913.7, 4021.1];

  it('offers no candidate it would itself cull, the first one included', () => {
    for (const camZ of CAMS) {
      const v = view(1440, 900, camZ, 0);
      let index = 0;
      v.seed((x, z) => {
        expect(v.visible(x, z), `candidate ${index} at ${x.toFixed(1)}, ${(z - camZ).toFixed(1)} ahead`).toBe(true);
        index += 1;
      });
      expect(index, 'candidates offered').toBeGreaterThan(DARTS / 2);
    }
  });

  it('offers the root first, one radius of influence beyond the near edge', () => {
    const v = view(1440, 900, 913.7, 0);
    const offered: number[][] = [];
    v.seed((x, z) => offered.push([x, z]));
    expect(offered[0]).toEqual([0, 913.7 + v.near + DI]);
  });

  it('culls what is behind the camera, what is past the fog, and what is 1.4 half-widths out', () => {
    for (const camZ of CAMS) {
      const v = view(1440, 900, camZ, 0);
      expect(v.visible(0, camZ - 1)).toBe(false);
      expect(v.visible(0, camZ + v.far + 20)).toBe(false);
      for (const dz of [v.near + 1, 40, 100, 200]) {
        expect(v.visible((v.edge + v.flare * dz) * 1.4, camZ + dz), `dz ${dz}`).toBe(false);
      }
    }
  });

  it('seeds a band that stops short of the far edge and no deeper than the reach', () => {
    const v = view(1440, 900, 0, 0);
    let deepest = 0;
    v.seed((_x, z) => { deepest = Math.max(deepest, z); });
    expect(deepest, 'the seeded band stops short of the far edge').toBeLessThan(v.far);
    expect(deepest, 'the seeded band stops within the reach').toBeLessThanOrEqual(v.near + REACH);
  });

  it('grades detail from GRADE_NEAR at the camera to 1 beyond GRADE_SPAN', () => {
    const v = view(1440, 900, 100, 0);
    expect(v.detail(0, 100)).toBeCloseTo(GRADE_NEAR, 5);
    expect(v.detail(0, 100 + GRADE_SPAN)).toBeCloseTo(1, 5);
    expect(v.detail(0, 100 + GRADE_SPAN * 2)).toBe(1);
    expect(v.detail(0, 100 + GRADE_SPAN / 2)).toBeCloseTo((GRADE_NEAR + 1) / 2, 5);
  });

  it('never grades above 1, which would overrun the spatial hash', () => {
    const v = view(1440, 900, 0, 0);
    for (let z = -50; z < 800; z += 7) expect(v.detail(0, z)).toBeLessThanOrEqual(1);
  });

  it('seeds by screen area: most darts land in the near third of the reach', () => {
    const v = view(1440, 900, 0, 0);
    const depths: number[] = [];
    v.seed((_x, z) => depths.push(z));
    const third = v.near + REACH / 3;
    const nearCount = depths.filter((z) => z < third).length;
    expect(nearCount / depths.length, 'darts in the near third of the reach').toBeGreaterThan(0.5);
  });
  it('keeps every growth-step segment shorter on screen than the cull margin, at every viewport and lift', () => {
    for (const [w, h] of [[390, 844], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160]] as const) {
      for (const lift of [0, LIFT]) {
        const v = view(w, h, 0, lift);
        const f = focal(w, h);
        let worst = 0;
        for (let dz = v.near; dz <= v.far; dz += 0.25) {
          const zc = (CAM_H + lift) * Math.sin(THETA) + dz * Math.cos(THETA);
          worst = Math.max(worst, (D * Math.max(GRADE_FLOOR, v.detail(0, dz)) * f) / zc);
        }
        expect(worst, `${w}x${h} lift ${lift}: worst growth-step span ${worst.toFixed(1)}px against margin ${v.margin.toFixed(0)}px`).toBeLessThan(v.margin);
      }
    }
  });
});
