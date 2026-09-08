import { TERRAIN } from './constants';

// A 32-bit integer mix (multiply–xorshift), not Math.random: the same lattice point must hash
// identically on every call, in every cell, in every session.
function hash(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function noise(x: number, z: number, wavelength: number): number {
  const u = x / wavelength;
  const v = z / wavelength;
  const ix = Math.floor(u);
  const iz = Math.floor(v);
  const fx = smooth(u - ix);
  const fz = smooth(v - iz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

export function height(x: number, z: number): number {
  let y = 0;
  for (const octave of TERRAIN) y += (noise(x, z, octave.wavelength) - 0.5) * 2 * octave.amplitude;
  return y;
}
