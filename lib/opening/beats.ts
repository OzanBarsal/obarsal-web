export const BEATS = [0, 1400, 3000, 4400] as const;

export type Beat = 0 | 1 | 2 | 3;

export function beatAt(elapsedMs: number): Beat {
  if (elapsedMs >= BEATS[3]) return 3;
  if (elapsedMs >= BEATS[2]) return 2;
  if (elapsedMs >= BEATS[1]) return 1;
  return 0;
}

export function countUp(from: number, to: number, elapsedMs: number): number {
  const t = (elapsedMs - BEATS[1]) / (BEATS[2] - BEATS[1]);
  const p = Math.max(0, Math.min(1, t));
  return Math.round(from + (to - from) * p);
}
