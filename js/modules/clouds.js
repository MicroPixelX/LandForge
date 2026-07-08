// clouds.js — a flat layer of white volumetric-looking puffs that move slowly.
import THREE from '../vendor/three-shim.js';

export class Clouds {
  constructor(radius = 220) {
    this.group = new THREE.Group();
    this.speed = 3.0; // blocks / second
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.material = mat;
    const puffs = [];
    const count = 60;
    const span = radius * 1.4;
    for (let i = 0; i < count; i++) {
      const w = 12 + Math.random() * 30;
      const d = 12 + Math.random() * 30;
      const px = (Math.random() - 0.5) * span;
      const pz = (Math.random() - 0.5) * span;
      const py = 70 + Math.random() * 12;
      const geom = new THREE.BoxGeometry(w, 4, d);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(px, py, pz);
      this.group.add(mesh);
      puffs.push(mesh);
    }
    this.puffs = puffs;
    this.span = span;
    this.group.position.y = 0;
  }

  update(dt, playerX, playerZ) {
    for (const m of this.puffs) {
      m.position.x += this.speed * dt;
      if (m.position.x > this.span / 2) m.position.x -= this.span;
    }
    // keep clouds centered above player (drift with player)
    this.group.position.x = playerX;
    this.group.position.z = playerZ;
  }

  setOpacity(opacity) {
    this.material.opacity = MathUtilsClamp(opacity, 0, 1);
  }
}
function MathUtilsClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
