import { CAM_H, HORIZON_BREAKPOINT, HORIZON_DESKTOP, HORIZON_MAX, HORIZON_MIN, HORIZON_MOBILE, THETA } from './constants';
import { height } from './terrain';

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
