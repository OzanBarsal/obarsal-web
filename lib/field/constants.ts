export const THETA = 0.23562;
export const CAM_H = 13;
export const Z_NEAR = 3;
export const FOG = 340;
export const SPEED = 30 / 2.5;
export const D = 2;
export const DI = 12 * D;
export const DK = 3 * D;
export const G = 0.35;
export const N_VISIBLE = 700;
export const BS = DK;
export const BV = DK;
export const GRADE_NEAR = 0.2;
export const GRADE_SPAN = 160;
export const GRADE_FLOOR = 0.7;
export const REACH = 240;
export const GROWTH_INTERVAL = 1 / 20;
export const CATCHUP = 2 * GROWTH_INTERVAL;
export const SETTLE = 6;
export const MAX_NODES = 6000;
export const FLASH_LIFE = 0.5;
export const MAX_FLASHES = 128;
export const CULL_MARGIN = 120;
export const CULL_SPAN = 0.12;
export const FLOATS = 9;
export const FLASH_FLOATS = 4;
export const CORE_CAP = 0.4;
export const LIFT = 6;
export const LIFT_RATE = 3.0773;
export const HORIZON_BREAKPOINT = 768;
export const HORIZON_DESKTOP = 0.1956;
export const HORIZON_MOBILE = 0.3993;
export const HORIZON_MIN = 0.19;
export const HORIZON_MAX = 0.46;
export const TERRAIN = [
  { wavelength: 90, amplitude: 4.25 },
  { wavelength: 45, amplitude: 2.125 },
] as const;
