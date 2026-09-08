import { D, DI, FLOATS, G, GRADE_FLOOR, GROWTH_INTERVAL, MAX_FLASHES, MAX_NODES } from './constants';
import { createAttractors, type Detail, type Nodes } from './attractors';
import { height } from './terrain';

export type Flash = { x: number; y: number; z: number; birth: number };
export type Seed = (place: (x: number, z: number) => void) => void;
export type Visible = (x: number, z: number) => boolean;
export type Field = {
  segments: Float32Array;
  live: number;
  flashes: Flash[];
  nodes: number;
  attractors: number;
  reroots: number;
  step(now: number, seed: Seed, visible: Visible, detail: Detail): number;
};

const LIMIT = MAX_NODES * 2, SIDE = 2048, RANK = 16384, THICKEST = 5, MERGE = -1;

export function createField(): Field {
  const nx = new Float32Array(LIMIT);
  const nz = new Float32Array(LIMIT);
  const thick = new Float32Array(LIMIT);
  const dirX = new Float64Array(LIMIT);
  const dirZ = new Float64Array(LIMIT);
  const pulled = new Uint8Array(LIMIT);
  const ranking = new Float64Array(LIMIT);
  const found: number[] = [];
  const buckets = new Map<number, number[]>();
  const segments = new Float32Array(LIMIT * FLOATS);
  const attractors = createAttractors();
  const field: Field = { segments, live: 0, flashes: [], nodes: 0, attractors: 0, reroots: 0, step };
  let count = 0, live = 0, next = 0, clock = 0, merged = 0, rooted = false;
  let detail: Detail = () => 1;

  const cell = (v: number) => Math.floor(v / DI);
  const key = (cx: number, cz: number) => (cx & (SIDE - 1)) * SIDE + (cz & (SIDE - 1));

  const rehash = () => {
    buckets.clear();
    for (let i = 0; i < count; i++) {
      const k = key(cell(nx[i]!), cell(nz[i]!)), bucket = buckets.get(k);
      if (bucket) bucket.push(i); else buckets.set(k, [i]);
    }
  };

  const near = (x: number, z: number, radius: number) => {
    const r2 = radius * radius, cx = cell(x), cz = cell(z);
    let n = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const bucket = buckets.get(key(cx + dx, cz + dz));
      if (!bucket) continue;
      for (let b = 0; b < bucket.length; b++) {
        const i = bucket[b]!, ex = nx[i]! - x, ez = nz[i]! - z, d2 = ex * ex + ez * ez;
        if (d2 <= r2) ranking[n++] = Math.round(d2 * 1024) * RANK + i;
      }
    }
    const ranked = ranking.subarray(0, n);
    ranked.sort();
    found.length = 0;
    for (let r = 0; r < n; r++) found.push(ranked[r]! % RANK);
    return found;
  };

  const nodes: Nodes = { x: nx, z: nz, near };
  const add = (x: number, z: number, t: number) => { nx[count] = x; nz[count] = z; thick[count] = t; count += 1; };
  const pull = (v: number, ux: number, uz: number) => { dirX[v] = dirX[v]! + ux; dirZ[v] = dirZ[v]! + uz; pulled[v] = 1; };

  const commit = (x0: number, z0: number, x1: number, z1: number, slot: number) => {
    if (live === LIMIT) return 0;
    const o = live++ * FLOATS;
    segments[o] = x0; segments[o + 1] = height(x0, z0); segments[o + 2] = z0;
    segments[o + 3] = x1; segments[o + 4] = height(x1, z1); segments[o + 5] = z1;
    segments[o + 6] = slot; segments[o + 7] = clock; segments[o + 8] = GROWTH_INTERVAL;
    return 1;
  };

  const join = (arrived: number[], x: number, z: number) => {
    for (const a of arrived) merged += commit(nx[a]!, nz[a]!, x, z, MERGE);
    field.flashes.push({ x, y: height(x, z), z, birth: clock });
    if (field.flashes.length > MAX_FLASHES) field.flashes.shift();
  };

  const place = (x: number, z: number) => {
    if (count) { attractors.place(nodes, x, z, detail); return; }
    if (rooted) field.reroots += 1;
    rooted = true;
    add(x, z, THICKEST); rehash();
  };

  const grow = () => {
    const parents = count;
    let committed = 0;
    for (let v = 0; v < parents && count < LIMIT; v++) {
      if (!pulled[v]) continue;
      const sx = dirX[v]!, sz = dirZ[v]!, len = Math.sqrt(sx * sx + sz * sz);
      if (len === 0) continue;
      const gx = sx / len, gz = sz / len + G, m = Math.sqrt(gx * gx + gz * gz);
      const d = D * Math.max(GRADE_FLOOR, detail(nx[v]!, nz[v]!));
      const cx = Math.fround(nx[v]! + (gx / m) * d), cz = Math.fround(nz[v]! + (gz / m) * d);
      if (near(cx, cz, 0).length) continue;
      const i = count;
      add(cx, cz, Math.max(0, thick[v]! - D / DI));
      committed += commit(nx[v]!, nz[v]!, nx[i]!, nz[i]!, thick[i]!);
    }
    return committed;
  };

  const cull = (visible: Visible) => {
    let w = 0;
    for (let i = 0; i < count; i++) {
      if (!visible(nx[i]!, nz[i]!)) continue;
      nx[w] = nx[i]!; nz[w] = nz[i]!; thick[w] = thick[i]!; w += 1;
    }
    const oldest = w - MAX_NODES;
    if (oldest > 0) { nx.copyWithin(0, oldest, w); nz.copyWithin(0, oldest, w); thick.copyWithin(0, oldest, w); }
    count = Math.min(w, MAX_NODES);
    w = 0;
    for (let i = 0; i < live; i++) {
      const o = i * FLOATS;
      if (!visible(segments[o]!, segments[o + 2]!) || !visible(segments[o + 3]!, segments[o + 5]!)) continue;
      if (w !== i) segments.copyWithin(w * FLOATS, o, o + FLOATS);
      w += 1;
    }
    if (w > MAX_NODES) segments.copyWithin(0, (w - MAX_NODES) * FLOATS, w * FLOATS);
    live = Math.min(w, MAX_NODES);
  };

  function step(now: number, seed: Seed, visible: Visible, grade: Detail): number {
    detail = grade;
    let committed = 0;
    while (now >= next) {
      next += GROWTH_INTERVAL;
      clock = now; merged = 0;
      attractors.retire(visible);
      dirX.fill(0, 0, count); dirZ.fill(0, 0, count); pulled.fill(0, 0, count);
      attractors.associate(nodes, pull, join, detail);
      committed += merged + grow();
      cull(visible);
      rehash();
      seed(place);
    }
    field.live = live; field.nodes = count; field.attractors = attractors.count;
    return committed;
  }

  return field;
}
