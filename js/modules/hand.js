// hand.js — first-person hand mesh attached to the camera (a small block,
// changes texture based on selected inventory block).
import THREE from '../vendor/three-shim.js';
import { getBlock } from './blocks.js';
import * as Tex from './textures.js';

export class Hand {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.visible = true;

    // small cube showing held block
    this.material = new THREE.MeshLambertMaterial({ vertexColors: false });
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), this.material);
    this.group.add(this.cube);
    this.group.position.set(0.42, -0.42, -0.72);
    this.group.rotation.set(-0.2, -0.5, 0.1);
    camera.add(this.group);
    this.setBlock(getBlock(1));
  }

  setBlock(def) {
    if (!def || !def.tiles || def.tiles.every((t) => t === '')) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    // build a 6-face material array using the same atlas canvases -> CanvasTextures
    const mats = [];
    for (let i = 0; i < 6; i++) {
      const name = def.tiles[i];
      const canvas = Tex.tileCanvas(name);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      mats.push(new THREE.MeshLambertMaterial({ map: tex }));
    }
    if (this.cube.material && Array.isArray(this.cube.material)) {
      this.cube.material.forEach((m) => { m.map?.dispose(); m.dispose(); });
    }
    this.cube.material = mats;
    this._swingT = 0;
  }

  swing() {
    this._swingT = 1.0;
  }

  update(dt) {
    const g = this.group;
    const s = this._swingT || 0;
    if (s > 0) this._swingT = Math.max(0, s - dt * 4);
    const k = Math.sin(s * Math.PI);
    g.rotation.x = -0.2 + k * 0.5;
    g.position.x = 0.42 - k * 0.04;
    g.position.y = -0.42 + k * 0.05;
  }
}
