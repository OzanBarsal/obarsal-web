import { CAM_H, CULL_MARGIN, CULL_SPAN, DI, FOG, GRADE_NEAR, GRADE_SPAN, HORIZON_BREAKPOINT, HORIZON_DESKTOP, HORIZON_MAX, HORIZON_MIN, HORIZON_MOBILE, REACH, THETA, Z_NEAR } from './constants';
import { height } from './terrain';

export const DARTS = 250;

export type View = {
  camY: number;
  f: number;
  horizon: number;
  near: number;
  far: number;
  margin: number;
  edge: number;
  flare: number;
  visible(x: number, z: number): boolean;
  detail(x: number, z: number): number;
  seed(place: (x: number, z: number) => void): void;
};

export function horizonFraction(width: number, heightPx: number): number {
  void heightPx;
  const frac = width >= HORIZON_BREAKPOINT ? HORIZON_DESKTOP : HORIZON_MOBILE;
  return Math.min(HORIZON_MAX, Math.max(HORIZON_MIN, frac));
}

export function focal(width: number, heightPx: number): number {
  return (heightPx / 2 - horizonFraction(width, heightPx) * heightPx) / Math.tan(THETA);
}

export function cameraY(camZ: number, lift: number): number {
  return CAM_H + height(0, camZ) + lift;
}

export function view(width: number, heightPx: number, camZ: number, lift: number): View {
  const f = focal(width, heightPx);
  const c = Math.cos(THETA);
  const s = Math.sin(THETA);
  const above = CAM_H + lift;
  const camY = cameraY(camZ, lift);
  const margin = Math.max(CULL_MARGIN, heightPx * CULL_SPAN);
  const down = (heightPx / 2 + margin) / f;
  const side = (width / 2 + margin) / f;
  const near = (above * (c - down * s)) / (s + down * c);
  const far = (FOG - above * s) / c;
  const edge = above * s * side;
  const flare = c * side;
  const visible = (x: number, z: number) => {
    const dy = height(x, z) - camY;
    const dz = z - camZ;
    const zc = dz * c - dy * s;
    if (zc <= Z_NEAR || zc > FOG) return false;
    if (Math.abs(f * x) > (width / 2 + margin) * zc) return false;
    const sy = heightPx / 2 - (f * (dy * c + dz * s)) / zc;
    return sy > -margin && sy < heightPx + margin;
  };
  return {
    camY, f, near, far, margin, edge, flare, visible,
    horizon: horizonFraction(width, heightPx) * heightPx,
    detail(_x, z) {
      return GRADE_NEAR + (1 - GRADE_NEAR) * Math.min(1, Math.max(0, (z - camZ) / GRADE_SPAN));
    },
    seed(place) {
      const limit = Math.min(far, near + REACH);
      place(0, camZ + near + DI);
      // Reciprocal in depth, so dart density falls as one over depth squared and follows screen area.
      for (let i = 0; i < DARTS; i++) {
        const u = (i + Math.random()) / DARTS;
        const dz = 1 / ((1 - u) / near + u / limit);
        const x = (Math.random() * 2 - 1) * (edge + flare * dz);
        if (visible(x, camZ + dz)) place(x, camZ + dz);
      }
    },
  };
}
