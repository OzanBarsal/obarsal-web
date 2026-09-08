import { CELL, FLOATS, GROWTH_SPEED, MERGE_RADIUS, SLOT_CAPACITY, STEP } from './constants';
import { height } from './terrain';

type BranchNode = { x: number; z: number; root: number; path: number };
type Seg = { x0: number; z0: number; x1: number; z1: number; depth: number; path: number };

export function cellSeed(index: number): number {
  return ((index + 1048576) * 2654435761 + 7) % 2147483647;
}

function lehmer(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function generateCell(index: number, spawnTime: number): Float32Array {
  const r = lehmer(cellSeed(index));
  const z0 = index * CELL;
  const segs: Seg[] = [];
  const nodes: BranchNode[] = [];
  const grow = (x: number, z: number, ang: number, len: number, depth: number, root: number, path: number) => {
    if (depth < 0 || len < 1.2) return;
    const x2 = x + Math.sin(ang) * len;
    const z2 = z + Math.cos(ang) * len;
    segs.push({ x0: x, z0: z, x1: x2, z1: z2, depth, path });
    nodes.push({ x: x2, z: z2, root, path: path + len });
    for (const k of [-1, 1]) {
      if (r() < 0.93) grow(x2, z2, ang + k * (0.2 + r() * 0.26), len * (0.74 + r() * 0.1), depth - 1, root, path + len);
    }
  };
  for (let i = 0; i < 13; i++) {
    const x = (r() - 0.5) * 300;
    const z = z0 + r() * CELL;
    grow(x, z, (r() - 0.5) * 0.3, 9.5 * (0.8 + r() * 0.5), 5, i, 0);
  }
  const joined = new Set<string>();
  for (const leaf of nodes.filter((n) => segs.every((s) => s.x0 !== n.x || s.z0 !== n.z))) {
    let best: BranchNode | undefined;
    let bestD = MERGE_RADIUS * MERGE_RADIUS;
    for (const other of nodes) {
      if (other.root === leaf.root) continue;
      const dx = other.x - leaf.x;
      const dz = other.z - leaf.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = other; }
    }
    if (!best) continue;
    const from = `${leaf.x},${leaf.z}`;
    const to = `${best.x},${best.z}`;
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (joined.has(key)) continue;
    joined.add(key);
    segs.push({ x0: leaf.x, z0: leaf.z, x1: best.x, z1: best.z, depth: -1, path: leaf.path });
  }
  segs.sort((a, b) => b.depth - a.depth || a.path - b.path);
  const out: number[] = [];
  for (const s of segs) {
    const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
    const parts = Math.max(1, Math.ceil(len / STEP));
    for (let p = 0; p < parts && out.length / FLOATS < SLOT_CAPACITY; p++) {
      const t0 = p / parts;
      const t1 = (p + 1) / parts;
      const ax = s.x0 + (s.x1 - s.x0) * t0;
      const az = s.z0 + (s.z1 - s.z0) * t0;
      const bx = s.x0 + (s.x1 - s.x0) * t1;
      const bz = s.z0 + (s.z1 - s.z0) * t1;
      const sub = len / parts;
      out.push(ax, height(ax, az), az, bx, height(bx, bz), bz, s.depth, spawnTime + (s.path + sub * p) / GROWTH_SPEED, sub / GROWTH_SPEED);
    }
  }
  return new Float32Array(out);
}
