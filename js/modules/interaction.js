// interaction.js — voxel raycasting (DDA) for block selection and breaking/placing.
import { getBlock, BLOCK } from './blocks.js';

const MAX_DIST = 6.0;

// Returns { hit, pos, normal, blockId } or null.
// Uses an integer DDA along the camera direction from `origin`.
export function raycastBlock(world, origin, direction, maxDist = MAX_DIST) {
  // Normalize the direction so t translates 1:1 to world units.
  const dl = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const dx = direction.x / dl, dy = direction.y / dl, dz = direction.z / dl;

  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  // If the camera is itself inside a solid block (e.g. head poking into leaves),
  // don't let the player mine their own position; advance the DDA out of origin cell.
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  // distance to next voxel boundary (in world units along the ray)
  const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  const tDeltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);

  const originCellX = Math.floor(origin.x);
  const originCellY = Math.floor(origin.y);
  const originCellZ = Math.floor(origin.z);
  const distToBoundaryX = dx > 0
    ? (originCellX + 1 - origin.x)
    : (origin.x - originCellX);
  const distToBoundaryY = dy > 0
    ? (originCellY + 1 - origin.y)
    : (origin.y - originCellY);
  const distToBoundaryZ = dz > 0
    ? (originCellZ + 1 - origin.z)
    : (origin.z - originCellZ);

  // t to cross the first boundary of each axis; 0 only if exactly on a boundary,
  // which we bump to a full cell distance to avoid a zero-length step.
  let tMaxX = dx === 0 ? Infinity : tDeltaX * (distToBoundaryX > 0 ? distToBoundaryX : 1);
  let tMaxY = dy === 0 ? Infinity : tDeltaY * (distToBoundaryY > 0 ? distToBoundaryY : 1);
  let tMaxZ = dz === 0 ? Infinity : tDeltaZ * (distToBoundaryZ > 0 ? distToBoundaryZ : 1);

  let normal = [0, 0, 0];
  let t = 0;
  // Skip checking the origin's own cell (self-hit) UNLESS we've already stepped
  // past it via the first boundary; simplest: test after the first advance.
  for (let guard = 0; guard < 1024; guard++) {
    // advance to the next voxel on the closest axis
    if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; normal = [-stepX, 0, 0]; }
    else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; normal = [0, -stepY, 0]; }
    else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; normal = [0, 0, -stepZ]; }
    if (t > maxDist) return null;

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
  }
  return null;
}

