import { BS, BV, DI, DK, N_VISIBLE } from './constants';

export type Detail = (x: number, z: number) => number;
export type Nodes = {
  x: Float32Array;
  z: Float32Array;
  near(x: number, z: number, radius: number): number[];
};
export type Attractors = {
  readonly count: number;
  place(nodes: Nodes, x: number, z: number, detail: Detail): void;
  associate(
    nodes: Nodes,
    pull: (node: number, ux: number, uz: number) => void,
    join: (arrived: number[], x: number, z: number) => void,
    detail: Detail,
  ): void;
  retire(inside: (x: number, z: number) => boolean): void;
};

export function createAttractors(): Attractors {
  const ax = new Float32Array(N_VISIBLE);
  const az = new Float32Array(N_VISIBLE);
  const arrived: number[] = [];
  let count = 0;

  const drop = (i: number) => { count -= 1; ax[i] = ax[count]!; az[i] = az[count]!; };

  const place = (nodes: Nodes, x: number, z: number, detail: Detail) => {
    if (count === N_VISIBLE) return;
    const s = detail(x, z), bs = BS * s, bv = BV * s;
    for (let i = 0; i < count; i++) {
      const ex = ax[i]! - x, ez = az[i]! - z;
      if (ex * ex + ez * ez < bs * bs) return;
    }
    if (nodes.near(x, z, bv).length) return;
    ax[count] = x; az[count] = z; count += 1;
  };

  const associate = (
    nodes: Nodes,
    pull: (node: number, ux: number, uz: number) => void,
    join: (arrived: number[], x: number, z: number) => void,
    detail: Detail,
  ) => {
    for (let i = count - 1; i >= 0; i--) {
      const sx = ax[i]!, sz = az[i]!;
      const s = detail(sx, sz), di = DI * s, dk = DK * s;
      const candidates = nodes.near(sx, sz, di);
      const k = candidates.length;
      if (!k) continue;
      arrived.length = 0;
      let waiting = 0;
      for (let a = 0; a < k; a++) {
        const v = candidates[a]!;
        const vx = nodes.x[v]!, vz = nodes.z[v]!;
        const dx = sx - vx, dz = sz - vz;
        const dv2 = dx * dx + dz * dz;
        // The venation paper's Equation 2, v influences s when d(v,s) < max(d(u,s), d(v,u)) for
        // every u: the closed lune between v and s must hold no other node, ties included.
        let lit = true;
        for (let b = 0; b < k && lit; b++) {
          const u = candidates[b]!;
          if (u === v) continue;
          const ex = sx - nodes.x[u]!, ez = sz - nodes.z[u]!;
          if (ex * ex + ez * ez > dv2) continue;
          const fx = vx - nodes.x[u]!, fz = vz - nodes.z[u]!;
          lit = fx * fx + fz * fz > dv2;
        }
        if (!lit) continue;
        if (dv2 <= dk * dk) { arrived.push(v); continue; }
        waiting += 1;
        const d = Math.sqrt(dv2);
        pull(v, dx / d, dz / d);
      }
      if (waiting) continue;
      if (arrived.length > 1) join(arrived, sx, sz);
      drop(i);
    }
  };

  const retire = (inside: (x: number, z: number) => boolean) => {
    for (let i = count - 1; i >= 0; i--) if (!inside(ax[i]!, az[i]!)) drop(i);
  };

  return { get count() { return count; }, place, associate, retire };
}
