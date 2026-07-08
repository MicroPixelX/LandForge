// interaction.js — voxel raycasting (DDA) for block selection and breaking/placing.
import { getBlock, BLOCK } from './blocks.js';

const MAX_DIST = 6.0;

// Returns { hit, pos, normal, blockId } or null.
// Uses an integer DDA along the camera direction from `origin`.
export function raycastBlock(world, origin, direction, maxDist = MAX_DIST) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const dx = direction.x, dy = direction.y, dz = direction.z;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  // distance to next voxel boundary
  const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  const tDeltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);

  const fracX = dx > 0 ? (Math.ceil(origin.x) - origin.x) : (origin.x - Math.floor(origin.x));
  const fracY = dy > 0 ? (Math.ceil(origin.y) - origin.y) : (origin.y - Math.floor(origin.y));
  const fracZ = dz > 0 ? (Math.ceil(origin.z) - origin.z) : (origin.z - Math.floor(origin.z));

  let tMaxX = dx === 0 ? Infinity : tDeltaX * (fracX || 1);
  let tMaxY = dy === 0 ? Infinity : tDeltaY * (fracY || 1);
  let tMaxZ = dz === 0 ? Infinity : tDeltaZ * (fracZ || 1);

  let normal = [0, 0, 0];
  let t = 0;
  while (t <= maxDist) {
    const b = world.getBlock(x, y, z);
    if (b !== BLOCK.AIR) {
      const def = getBlock(b);
      if (def && def.solid) {
        return {
          hit: true,
          pos: [x, y, z],
          normal,
          blockId: b,
        };
      }
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; normal = [-stepX, 0, 0]; }
    else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; normal = [0, -stepY, 0]; }
    else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; normal = [0, 0, -stepZ]; }
  }
  return null;
}
