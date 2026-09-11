export const BEATS = [0, 2800, 5300, 6400] as const;

export const STAGGER = 40;

export const EXIT_STAGGER = 12;

export const COUNT_MS = 600;

export type Beat = 0 | 1 | 2 | 3;

export const LAST_BEAT: Beat = 3;

export function beatAt(elapsedMs: number): Beat {
  if (elapsedMs >= BEATS[3]) return 3;
  if (elapsedMs >= BEATS[2]) return 2;
  if (elapsedMs >= BEATS[1]) return 1;
  return 0;
}

export function reached(beat: Beat): string {
  return Array.from({ length: beat + 1 }, (_, i) => i).join(' ');
}

export function countUp(from: number, to: number, elapsedMs: number, startMs: number, endMs: number): number {
  const p = Math.max(0, Math.min(1, (elapsedMs - startMs) / (endMs - startMs)));
  return Math.round(from + (to - from) * p);
}
