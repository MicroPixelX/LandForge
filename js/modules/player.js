// player.js — first-person controller with AABB physics, gravity, jumping.
import THREE from '../vendor/three-shim.js';
import { getBlock, BLOCK } from './blocks.js';

const PLAYER_W = 0.6;   // half-width
const PLAYER_H = 1.8;   // height
const EYE = 1.62;       // eye height above feet
const GRAVITY = 28;
const JUMP_V = 8.5;
const MOVE_SPEED = 4.6;
const SPRINT_MULT = 1.7;
const WATER_DRAG = 0.7;

export class Player {
  constructor(world, camera, domElement) {
    this.world = world;
    this.camera = camera;
    this.dom = domElement;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.inWater = false;

    this.yaw = 0;
    this.pitch = 0;

    this.keys = {};
    this.mouse = { left: false, right: false };
    this.pointerLocked = false;

    this._bindInputs();
  }

  spawn(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
  }

  _bindInputs() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    this.dom.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    });
    this.dom.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.yaw -= e.movementX * 0.0024;
      this.pitch -= e.movementY * 0.0024;
      const lim = Math.PI / 2 - 0.01;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  requestLock() {
    // Optimistically mark locked; the pointerlockchange event will correct it.
    this.pointerLocked = true;
    try {
      const r = this.dom.requestPointerLock?.();
      // Modern browsers return a Promise that can reject (e.g. if called too
      // soon after a previous exit, or the document isn't focused). Swallow it
      // so we don't get an unhandled rejection that looks like a button failure.
      if (r && typeof r.catch === 'function') {
        r.catch((err) => { console.warn('pointer lock failed:', err); this.pointerLocked = false; });
      }
    } catch (e) {
      console.warn('pointer lock error:', e);
      this.pointerLocked = false;
    }
  }

  releaseLock() {
    document.exitPointerLock?.();
    this.pointerLocked = false;
  }

  // collide a single axis moving by `amount` in small steps; returns true if blocked.
  _collideAxis(axis, amount) {
    if (amount === 0) return false;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / 0.2));
    const inc = amount / steps;
    const next = this.pos.clone();
    for (let i = 0; i < steps; i++) {
      next[axis] += inc;
      if (this._hits(next)) {
        return true; // keep this.pos where it was (don't apply the colliding step)
      }
      this.pos[axis] = next[axis];
    }
    return false;
  }

  // AABB test for player body against solid blocks.
  // We shrink the body vertically slightly so feet rest on top of a block
  // rather than overlapping the solid surface.
  _hits(p) {
    const w = PLAYER_W;
    const minX = Math.floor(p.x - w + 1e-4);
    const maxX = Math.floor(p.x + w - 1e-4);
    const minY = Math.floor(p.y + 1e-3);
    const maxY = Math.floor(p.y + PLAYER_H - 1e-3);
    const minZ = Math.floor(p.z - w + 1e-4);
    const maxZ = Math.floor(p.z + w - 1e-4);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++)
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, y, z);
          if (b === BLOCK.AIR) continue;
          const def = getBlock(b);
          if (def && def.solid) return true;
        }
    return false;
  }

  update(dt) {
    // detect water at feet
    const feetBlock = this.world.getBlock(
      Math.floor(this.pos.x), Math.floor(this.pos.y + 0.1), Math.floor(this.pos.z)
    );
    this.inWater = feetBlock === BLOCK.WATER;

    // gravity
    this.vel.y -= GRAVITY * dt;
    if (this.inWater) {
      this.vel.y *= 0.92; // buoyancy-ish drag
      if (this.vel.y < -3) this.vel.y = -3;
    }

    // movement input (relative to yaw)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let wish = new THREE.Vector3();
    if (this.keys['KeyW']) wish.add(forward);
    if (this.keys['KeyS']) wish.sub(forward);
    if (this.keys['KeyD']) wish.add(right);
    if (this.keys['KeyA']) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();
    let speed = MOVE_SPEED;
    if (this.keys['ShiftLeft']) speed *= SPRINT_MULT;
    if (this.inWater) speed *= 0.6;

    // horizontal velocity directly set (arcade-ish but responsive)
    this.vel.x = wish.x * speed;
    this.vel.z = wish.z * speed;

    // jump
    if (this.keys['Space'] && this.onGround) {
      this.vel.y = JUMP_V;
      this.onGround = false;
    }
    if (this.keys['Space'] && this.inWater) this.vel.y = Math.max(this.vel.y, 3);

    // integrate axis by axis with collision
    let grounded = false;
    const dx = this.vel.x * dt;
    const dy = this.vel.y * dt;
    const dz = this.vel.z * dt;

    this._collideAxis('x', dx);
    const hitY = this._collideAxis('y', dy);
    if (this.vel.y < 0 && hitY) { grounded = true; this.vel.y = 0; }
    if (this.vel.y > 0 && hitY) { this.vel.y = 0; }
    this._collideAxis('z', dz);

    this.onGround = grounded;

    if (this.pos.y < -5) { // fell out
      this.pos.y = 50;
      this.vel.set(0, 0, 0);
    }

    // update camera
    this.camera.position.set(this.pos.x, this.pos.y + EYE, this.pos.z);
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}

export const PLAYER_DIMS = { PLAYER_W, PLAYER_H, EYE };
