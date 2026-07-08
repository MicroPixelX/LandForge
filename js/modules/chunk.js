// chunk.js — a single chunk of the world.
// Stores blocks in a flat Uint8Array and builds a merged THREE.Mesh with face culling.
import THREE from '../vendor/three-shim.js';
import { getBlocks, BLOCK } from './blocks.js';

export const SIZE = 16;   // x,z width
export const HEIGHT = 64; // y height
const N = SIZE * SIZE * HEIGHT;

function idx(x, y, z) { return y * SIZE * SIZE + z * SIZE + x; }

// Face definitions: [px,nx,py,ny,pz,nz]
// corners ordered [b_left_top, t_left_top, t_right_top, b_right_top] winding CCW so +normal.
const FACES = [
  { // +X
    dir: [1, 0, 0],
    corners: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]], // (u maps texture X, v maps texture Y)
  },
  { // -X
    dir: [-1, 0, 0],
    corners: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
  { // +Y (top)
    dir: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  { // -Y (bottom)
    dir: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  { // +Z
    dir: [0, 0, 1],
    corners: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
  { // -Z
    dir: [0, 0, -1],
    corners: [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
];

export class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;
    this.blocks = new Uint8Array(N);
    this.mesh = null;
    this.dirty = true;
    this.group = new THREE.Group();
    this.group.position.set(cx * SIZE, 0, cz * SIZE);
  }

  get(x, y, z) {
    if (y < 0 || y >= HEIGHT) return BLOCK.AIR;
    return this.blocks[idx(x, y, z)];
  }

  set(x, y, z, v) {
    if (y < 0 || y >= HEIGHT || x < 0 || x >= SIZE || z < 0 || z >= SIZE) return;
    this.blocks[idx(x, y, z)] = v;
    this.dirty = true;
  }

  build() {
    const blocks = getBlocks();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const slotUV = this.world.constructor.slotUV;

    const baseX = this.cx * SIZE;
    const baseZ = this.cz * SIZE;

    for (let y = 0; y < HEIGHT; y++) {
      for (let z = 0; z < SIZE; z++) {
        for (let x = 0; x < SIZE; x++) {
          const b = this.blocks[idx(x, y, z)];
          if (b === BLOCK.AIR) continue;
          const def = blocks[b];
          const wx = baseX + x, wy = y, wz = baseZ + z;

          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const tileName = def.tiles[f];
            if (tileName === '') continue; // air has no faces
            const slot = this.world.slot(tileName);
            const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
            let neighbor;
            if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE) {
              neighbor = this.world.getBlock(wx + face.dir[0], ny, wz + face.dir[2]);
            } else {
              neighbor = this.get(nx, ny, nz);
            }
            // visibility/cull rules
            if (neighbor !== BLOCK.AIR) {
              const nd = blocks[neighbor];
              // cull if neighbor opaque
              if (nd && !nd.transparent) continue;
              // cull if neighbor is same transparent block (e.g. water-water, leaves-leaves)
              if (nd && nd.transparent && neighbor === b) continue;
              // for water facing air or leaves etc, still draw
            }

            const start = positions.length / 3;
            for (let c = 0; c < 4; c++) {
              const corner = face.corners[c];
              positions.push(x + corner[0], y + corner[1], z + corner[2]);
              normals.push(face.dir[0], face.dir[1], face.dir[2]);
              const [su, sv] = slotUV(slot, face.uv[c][0], face.uv[c][1]);
              uvs.push(su, sv);
            }
            indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
          }
        }
      }
    }

    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (positions.length === 0) {
      this.dirty = false;
      return;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);

    const mesh = new THREE.Mesh(geom, this.world.material);
    mesh.frustumCulled = true;
    this.mesh = mesh;
    this.group.add(mesh);
    this.dirty = false;
  }
}
