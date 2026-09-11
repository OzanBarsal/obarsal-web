export type Rect = { x: number; y: number; w: number; h: number };

export type Size = { w: number; h: number };

export type Point = { x: number; y: number };

export type Side = 'left' | 'right';

export type Stack = { spine: Rect; chips: Rect[] };

export const GAP = 4;

export const SPINE = 8;

export const STEP = 8;

export const OFFSET = 12;

export function overlaps(a: Rect, b: Rect, gap = GAP): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

export function inside(r: Rect, bounds: Rect): boolean {
  return r.x >= bounds.x && r.y >= bounds.y && r.x + r.w <= bounds.x + bounds.w && r.y + r.h <= bounds.y + bounds.h;
}

export function free(r: Rect, bounds: Rect, taken: readonly Rect[]): boolean {
  return inside(r, bounds) && !taken.some((t) => overlaps(r, t));
}

export function beside(anchor: Rect, size: Size, slots = 4): Point[] {
  const out: Point[] = [];
  const right = anchor.x + anchor.w;
  const bottom = anchor.y + anchor.h;
  const dy = size.h + 6;
  const dx = size.w + 6;
  for (let k = 0; k < slots; k++) out.push({ x: right + OFFSET, y: anchor.y + k * dy });
  for (let k = 0; k < slots; k++) out.push({ x: right - size.w - k * dx, y: bottom + 8 });
  for (let k = 0; k < slots; k++) out.push({ x: anchor.x - OFFSET - size.w, y: anchor.y + k * dy });
  for (let k = 0; k < slots; k++) out.push({ x: anchor.x + k * dx, y: anchor.y - 8 - size.h });
  return out;
}

export function scan(size: Size, bounds: Rect, taken: readonly Rect[], step = 8): Rect | null {
  for (let y = bounds.y; y + size.h <= bounds.y + bounds.h; y += step) {
    for (let x = bounds.x + bounds.w - size.w; x >= bounds.x; x -= step) {
      const r = { x, y, w: size.w, h: size.h };
      if (!taken.some((t) => overlaps(r, t))) return r;
    }
  }
  return null;
}

export function place(size: Size, anchor: Rect | null, bounds: Rect, taken: readonly Rect[]): Rect | null {
  if (anchor) {
    for (const p of beside(anchor, size)) {
      const r = { x: p.x, y: p.y, w: size.w, h: size.h };
      if (free(r, bounds, taken)) return r;
    }
  }
  return scan(size, bounds, taken);
}

export function columns(size: Size, edge: number, side: Side, bounds: Rect, taken: readonly Rect[], step = STEP): Rect | null {
  const x0 = side === 'left' ? edge - SPINE - size.w : edge + OFFSET;
  const dx = side === 'left' ? -step : step;
  for (let x = x0; x >= bounds.x && x + size.w <= bounds.x + bounds.w; x += dx) {
    for (let y = bounds.y; y + size.h <= bounds.y + bounds.h; y += step) {
      const r = { x, y, w: size.w, h: size.h };
      if (!taken.some((t) => overlaps(r, t))) return r;
    }
  }
  return null;
}

export function span(edge: number, side: Side, bounds: Rect): number {
  const block = side === 'left' ? edge - SPINE - bounds.x : bounds.x + bounds.w - edge - OFFSET;
  return block - 1 - SPINE;
}

export function rows(sizes: readonly Size[], width: number): Size[][] {
  const out: Size[][] = [];
  let row: Size[] = [];
  let used = 0;
  for (const s of sizes) {
    if (row.length && used + GAP + s.w > width) { out.push(row); row = []; used = 0; }
    used += (row.length ? GAP : 0) + s.w;
    row.push(s);
  }
  if (row.length) out.push(row);
  return out;
}

const rowWidth = (row: readonly Size[]) => row.reduce((w, s) => w + s.w, 0) + GAP * (row.length - 1);

const rowHeight = (row: readonly Size[]) => Math.max(...row.map((s) => s.h));

export function blockSize(grid: readonly (readonly Size[])[]): Size {
  return { w: Math.max(...grid.map(rowWidth)) + 1 + SPINE, h: grid.reduce((h, row) => h + rowHeight(row) + GAP, GAP) };
}

export function blockAt(r: Rect, grid: readonly (readonly Size[])[], side: Side): Stack {
  const sx = side === 'left' ? r.x + r.w - 1 : r.x;
  const chips: Rect[] = [];
  let y = r.y + GAP;
  for (const row of grid) {
    let x = side === 'left' ? sx - SPINE : sx + 1 + SPINE;
    for (const s of row) {
      if (side === 'left') x -= s.w;
      chips.push({ x, y, w: s.w, h: s.h });
      x = side === 'left' ? x - GAP : x + s.w + GAP;
    }
    y += rowHeight(row) + GAP;
  }
  return { spine: { x: sx, y: r.y, w: 1, h: r.h }, chips };
}
