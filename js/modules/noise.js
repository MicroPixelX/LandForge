// noise.js — lightweight value noise + fbm for terrain generation.
// Deterministic given a seed. Good enough for a Minecraft-like overworld.

function hash2(x, y, seed) {
  // Use Math.imul for proper 32-bit integer multiply; rotate/mix to spread bits fully.
  let h = Math.imul((x | 0), 374761393) ^ Math.imul((y | 0), 668265263) ^ Math.imul((seed | 0), 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2654435761);
  return (h >>> 0) / 4294967296; // full 0..1 range
}

function smooth(t) { return t * t * (3 - 2 * t); }

function lerp(a, b, t) { return a + (b - a) * t; }

export function valueNoise2D(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(v00, v10, u), lerp(v01, v11, u), v);
}

// Deterministic 0..1 hash for a 3D cell — used for ore scatter and tree placement.
export function hash3(x, y, z, seed = 0) {
  let h = Math.imul((x | 0), 374761393) ^ Math.imul((y | 0), 668265263) ^ Math.imul((z | 0), 1442693504) ^ Math.imul((seed | 0), 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2654435761);
  return (h >>> 0) / 4294967296;
}

export function fbm2D(x, y, opts = {}) {
  const { octaves = 4, lacunarity = 2, gain = 0.5, frequency = 1, seed = 0 } = opts;
  let amp = 1, freq = frequency, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 101);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm; // 0..1
}
