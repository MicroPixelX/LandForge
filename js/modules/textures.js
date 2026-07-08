// textures.js — procedural pixel-art textures drawn on canvases, cached as singletons.
// Each tile function returns the SAME canvas instance on repeat calls so that the
// world atlas and the block textures reference identical image data.

const SIZE = 16;
const cache = new Map();

function getCanvas(name) {
  if (cache.has(name)) return cache.get(name);
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  cache.set(name, c);
  return c;
}
function ctx2(c) { return c.getContext('2d'); }

let seed = 1337;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
function setSeed(s) { seed = s; }

function speckle(base, dark, light, density = 0.5) {
  return (c) => {
    const x = ctx2(c);
    x.fillStyle = base; x.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (rand() < density) { x.fillStyle = rand() < 0.5 ? dark : light; x.fillRect(i, j, 1, 1); }
    return c;
  };
}

// ordered list of all tiles (determines atlas slot index)
export const TILE_NAMES = [
  'grassTop', 'grassSide', 'dirt', 'stone',
  'cobble', 'planks', 'logSide', 'logTop',
  'leaves', 'sand', 'water', 'bedrock',
  'coalOre', 'ironOre', 'diamondOre',
];

export function allTiles() {
  // ensure all generated
  TILE_NAMES.forEach((n) => TILE_BUILDERS[n]());
  return TILE_NAMES.map((n) => cache.get(n));
}

const builders = {};

export const TILE_BUILDERS = {
  grassTop() {
    setSeed(101);
    return speckle('#6aa84f', '#56883f', '#7cbf5a', 0.55)(getCanvas('grassTop'));
  },
  grassSide() {
    setSeed(102);
    const c = getCanvas('grassSide'); const x = ctx2(c);
    x.fillStyle = '#866043'; x.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 4; j < SIZE; j++)
        if (rand() < 0.5) { x.fillStyle = rand() < 0.5 ? '#6f4d34' : '#9a7050'; x.fillRect(i, j, 1, 1); }
    for (let i = 0; i < SIZE; i++) {
      const h = 3 + Math.floor(rand() * 2);
      for (let j = 0; j < h; j++) { x.fillStyle = rand() < 0.5 ? '#6aa84f' : '#56883f'; x.fillRect(i, j, 1, 1); }
    }
    return c;
  },
  dirt() {
    setSeed(103);
    return speckle('#866043', '#6f4d34', '#9a7050', 0.55)(getCanvas('dirt'));
  },
  stone() {
    setSeed(104);
    return speckle('#888888', '#6f6f6f', '#9d9d9d', 0.5)(getCanvas('stone'));
  },
  cobble() {
    setSeed(105);
    const c = getCanvas('cobble'); const x = ctx2(c);
    x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, SIZE, SIZE);
    for (let k = 0; k < 6; k++) {
      const w = 3 + Math.floor(rand() * 4), h = 3 + Math.floor(rand() * 4);
      const px = Math.floor(rand() * (SIZE - w)), py = Math.floor(rand() * (SIZE - h));
      x.fillStyle = rand() < 0.5 ? '#5f5f5f' : '#9a9a9a'; x.fillRect(px, py, w, h);
      x.fillStyle = '#444'; x.fillRect(px, py, w, 1); x.fillRect(px, py, 1, h);
    }
    return c;
  },
  planks() {
    setSeed(106);
    const c = getCanvas('planks'); const x = ctx2(c);
    x.fillStyle = '#b48a4e'; x.fillRect(0, 0, SIZE, SIZE);
    for (let j = 0; j < SIZE; j++)
      for (let i = 0; i < SIZE; i++)
        if (rand() < 0.4) { x.fillStyle = rand() < 0.5 ? '#9c7240' : '#c69a5e'; x.fillRect(i, j, 1, 1); }
    for (let j = 0; j < SIZE; j += 4) { x.fillStyle = '#6f4e2c'; x.fillRect(0, j, SIZE, 1); }
    x.fillStyle = '#6f4e2c';
    x.fillRect(7, 0, 1, 4); x.fillRect(3, 4, 1, 4); x.fillRect(11, 4, 1, 4);
    x.fillRect(7, 8, 1, 4); x.fillRect(3, 12, 1, 4); x.fillRect(11, 12, 1, 4);
    return c;
  },
  logSide() {
    setSeed(107);
    const c = getCanvas('logSide'); const x = ctx2(c);
    x.fillStyle = '#6f4e2c'; x.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (rand() < 0.45) { x.fillStyle = rand() < 0.5 ? '#5a4022' : '#7f5a34'; x.fillRect(i, j, 1, 1); }
    for (let j = 0; j < SIZE; j += 3) { x.fillStyle = '#4a3419'; x.fillRect(0, j, SIZE, 1); }
    return c;
  },
  logTop() {
    setSeed(108);
    const c = getCanvas('logTop'); const x = ctx2(c);
    x.fillStyle = '#b48a4e'; x.fillRect(0, 0, SIZE, SIZE);
    for (let r = 7; r >= 1; r -= 2) {
      x.strokeStyle = r % 4 === 0 ? '#6f4e2c' : '#9c7240';
      x.lineWidth = 1; x.beginPath(); x.arc(8, 8, r, 0, Math.PI * 2); x.stroke();
    }
    x.fillStyle = '#6f4e2c'; x.fillRect(8, 8, 1, 1);
    return c;
  },
  leaves() {
    setSeed(109);
    const c = getCanvas('leaves'); const x = ctx2(c);
    x.fillStyle = '#3a7d34'; x.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++) {
        const r = rand();
        if (r < 0.4) x.fillStyle = '#2f6b2a';
        else if (r < 0.6) x.fillStyle = '#4a9d42';
        else x.fillStyle = '#365e2f';
        x.fillRect(i, j, 1, 1);
      }
    return c;
  },
  sand() {
    setSeed(110);
    return speckle('#e6d8a0', '#d4c382', '#f0e6b8', 0.5)(getCanvas('sand'));
  },
  water() {
    setSeed(111);
    const c = getCanvas('water'); const x = ctx2(c);
    x.fillStyle = '#3a6ed8'; x.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (rand() < 0.5) { x.fillStyle = rand() < 0.5 ? '#2f5fbf' : '#4f80e8'; x.fillRect(i, j, 1, 1); }
    return c;
  },
  bedrock() {
    setSeed(112);
    const c = getCanvas('bedrock'); const x = ctx2(c);
    x.fillStyle = '#3a3a3a'; x.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++) {
        const r = rand();
        x.fillStyle = r < 0.33 ? '#222' : r < 0.66 ? '#4a4a4a' : '#2c2c2c';
        x.fillRect(i, j, 1, 1);
      }
    return c;
  },
  coalOre() { return ore('coalOre', '#1a1a1a', '#3a3a3a'); },
  ironOre() { return ore('ironOre', '#7a4a2a', '#c08a55'); },
  diamondOre() { return ore('diamondOre', '#1f8f8f', '#6ff0f0'); },
};

function ore(name, colorDark, colorLight) {
  setSeed((colorDark.charCodeAt(0) * 7) % 2147483647);
  const c = getCanvas(name); const x = ctx2(c);
  x.fillStyle = '#888888'; x.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++)
      if (rand() < 0.5) { x.fillStyle = rand() < 0.5 ? '#6f6f6f' : '#9d9d9d'; x.fillRect(i, j, 1, 1); }
  const blobs = 3 + Math.floor(rand() * 3);
  for (let k = 0; k < blobs; k++) {
    const px = 1 + Math.floor(rand() * (SIZE - 3));
    const py = 1 + Math.floor(rand() * (SIZE - 3));
    x.fillStyle = colorDark; x.fillRect(px, py, 3, 3);
    x.fillStyle = colorLight; x.fillRect(px, py, 2, 2);
    x.fillStyle = '#fff'; x.fillRect(px, py, 1, 1);
  }
  return c;
}

export function tileCanvas(name) { return TILE_BUILDERS[name](); }

import THREE from '../vendor/three-shim.js';
export function canvasToTexture(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
