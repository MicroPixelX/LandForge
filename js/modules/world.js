// world.js — holds chunks, terrain generation, world material (texture atlas), and helpers.
import THREE from '../vendor/three-shim.js';
import { Chunk, SIZE, HEIGHT } from './chunk.js';
import { fbm2D, hash3 } from './noise.js';
import { BLOCK } from './blocks.js';
import * as Tex from './textures.js';

export const TILE = 16;
const ATLAS_COLS = 4;
const ATLAS_ROWS = 4;

export class World {
  constructor(seed = 2024) {
    this.seed = seed;
    this.chunks = new Map(); // key "cx,cz" -> Chunk
    this.tileSlots = this._buildSlots();
    this.atlas = this._buildAtlas();
    this.material = this._buildMaterial();
  }

  _buildSlots() {
    // tile-name -> atlas slot index (matches Tex.TILE_NAMES ordering/padding)
    const names = Tex.TILE_NAMES;
    const map = new Map();
    names.forEach((n, i) => map.set(n, i));
    // unknown/air -> 0 (grass) — but air has no faces so unused
    this.tileNames = names;
    return map;
  }

  _buildAtlas() {
    const cols = ATLAS_COLS, rows = ATLAS_ROWS;
    const canvas = document.createElement('canvas');
    canvas.width = cols * TILE;
    canvas.height = rows * TILE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.tileNames.forEach((name, i) => {
      const cx = (i % cols) * TILE;
      const cy = Math.floor(i / cols) * TILE;
      ctx.drawImage(Tex.tileCanvas(name), cx, cy);
    });
    return canvas;
  }

  _buildMaterial() {
    const tex = new THREE.CanvasTexture(this.atlas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshLambertMaterial({
      map: tex,
      side: THREE.FrontSide,
      transparent: false,
    });
  }

  // tile-name -> slot
  slot(name) {
    if (this.tileSlots.has(name)) return this.tileSlots.get(name);
    return 0;
  }

  // Convert chunk-local uv (0..1) into atlas uv for a given slot index.
  static slotUV(slot, u, v) {
    const cols = ATLAS_COLS, rows = ATLAS_ROWS;
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const lu = (col + u) / cols;
    // v: face.uv uses v increasing upward (0 bottom,1 top); atlas y grows downward
    const lv = 1.0 - ((row + (1 - v)) / rows);
    return [lu, lv];
  }

  key(cx, cz) { return cx + ',' + cz; }
  getChunk(cx, cz) { return this.chunks.get(this.key(cx, cz)); }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(wx / SIZE);
    const cz = Math.floor(wz / SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BLOCK.AIR;
    const lx = wx - cx * SIZE;
    const lz = wz - cz * SIZE;
    return chunk.get(lx, wy, lz);
  }

  setBlock(wx, wy, wz, v) {
    if (wy < 0 || wy >= HEIGHT) return false;
    const cx = Math.floor(wx / SIZE);
    const cz = Math.floor(wz / SIZE);
    let chunk = this.getChunk(cx, cz);
    if (!chunk) chunk = this.loadChunk(cx, cz);
    const lx = wx - cx * SIZE;
    const lz = wz - cz * SIZE;
    chunk.set(lx, wy, lz, v);
    if (lx === 0) { const n = this.getChunk(cx - 1, cz); if (n) n.dirty = true; }
    if (lx === SIZE - 1) { const n = this.getChunk(cx + 1, cz); if (n) n.dirty = true; }
    if (lz === 0) { const n = this.getChunk(cx, cz - 1); if (n) n.dirty = true; }
    if (lz === SIZE - 1) { const n = this.getChunk(cx, cz + 1); if (n) n.dirty = true; }
    return true;
  }

  loadChunk(cx, cz) {
    const k = this.key(cx, cz);
    if (this.chunks.has(k)) return this.chunks.get(k);
    const chunk = new Chunk(cx, cz, this);
    this._generate(chunk);
    chunk.build();
    this.chunks.set(k, chunk);
    return chunk;
  }

  unloadChunk(cx, cz) {
    const k = this.key(cx, cz);
    const chunk = this.chunks.get(k);
    if (chunk) {
      if (chunk.mesh) chunk.mesh.geometry.dispose();
      chunk.group.parent?.remove(chunk.group);
      this.chunks.delete(k);
    }
  }

  // highest solid block at (wx,wz) within generated terrain (used for spawn)
  surfaceHeight(wx, wz) {
    const e = fbm2D(wx * 0.018, wz * 0.018, { seed: this.seed, octaves: 5, gain: 0.5 });
    return Math.floor(8 + e * 28);
  }

  _generate(chunk) {
    const { cx, cz } = chunk;
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const wx = cx * SIZE + x;
        const wz = cz * SIZE + z;
        const e = fbm2D(wx * 0.018, wz * 0.018, { seed: this.seed, octaves: 5, gain: 0.5 });
        const h = Math.floor(8 + e * 28);
        const seaLevel = 14;

        for (let y = 0; y <= Math.max(h, seaLevel) && y < HEIGHT; y++) {
          let block = BLOCK.STONE;
          if (y === 0) block = BLOCK.BEDROCK;
          else if (y === h) block = (h <= seaLevel) ? BLOCK.SAND : BLOCK.GRASS;
          else if (y > h - 4) block = (h <= seaLevel) ? BLOCK.SAND : BLOCK.DIRT;
          else block = BLOCK.STONE;

          if (y < h - 4 && y > 1) {
            const depth = h - y;
            const oreN = fbm2D(wx * 0.12 + 13, wz * 0.12 + 7 + y, { seed: this.seed + 5, octaves: 2 });
            if (oreN > 0.85) {
              // deep-down bonus hash for choosing ore type
              const pick = hash3(wx, y, wz, this.seed + 11);
              if (depth > 16 && y > 3 && pick > 0.85) block = BLOCK.DIAMOND;
              else if (depth > 8) block = BLOCK.IRON;
              else block = BLOCK.COAL;
            }
          }

          if (y <= seaLevel && y > h) block = BLOCK.WATER;

          chunk.blocks[y * SIZE * SIZE + z * SIZE + x] = block;
        }

        // tree on grass above sea level (sparse, deterministic)
        const top = h;
        if (chunk.blocks[top * SIZE * SIZE + z * SIZE + x] === BLOCK.GRASS && h > seaLevel) {
          if (hash3(wx, wz, top, this.seed + 7) > 0.984) this._placeTree(chunk, x, top + 1, z);
        }
      }
    }
    chunk.dirty = true;
  }

  _placeTree(chunk, x, y, z) {
    // Deterministic pseudo-random so trees look the same across page reloads.
    const trunkH = 4 + Math.floor(hash3(x, y, z, this.seed + 13) * 2);
    for (let i = 0; i < trunkH; i++) {
      const yy = y + i;
      if (yy < HEIGHT) chunk.blocks[yy * SIZE * SIZE + z * SIZE + x] = BLOCK.LOG;
    }
    const topY = y + trunkH;
    for (let ly = -2; ly <= 1; ly++) {
      const r = ly <= -1 ? 2 : 1;
      for (let lx = -r; lx <= r; lx++)
        for (let lz = -r; lz <= r; lz++) {
          if (lx === 0 && lz === 0 && ly < 1) continue;
          const px = x + lx, py = topY + ly, pz = z + lz;
          if (py < 0 || py >= HEIGHT || px < 0 || px >= SIZE || pz < 0 || pz >= SIZE) continue;
          // round the canopy a bit by trimming some corners deterministically
          if (Math.abs(lx) === r && Math.abs(lz) === r && hash3(px, py, pz, this.seed + 17) < 0.6) continue;
          const cur = chunk.blocks[py * SIZE * SIZE + pz * SIZE + px];
          if (cur === BLOCK.AIR) chunk.blocks[py * SIZE * SIZE + pz * SIZE + px] = BLOCK.LEAVES;
        }
    }
  }

  updateDirtyBudget(maxPerFrame = 2) {
    let n = 0;
    for (const chunk of this.chunks.values())
      if (chunk.dirty) { chunk.build(); if (++n >= maxPerFrame) break; }
  }
}
