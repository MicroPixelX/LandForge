// daynight.js — drives a sun directional light, ambient/hemisphere light, sky & fog color,
// and overall cloud opacity across a 24-minute day/night cycle.
import THREE from '../vendor/three-shim.js';

const DAY_LENGTH = 240; // seconds for full cycle

export class DayNight {
  constructor(scene, sun, ambient, hemi, clouds) {
    this.scene = scene;
    this.sun = sun;
    this.ambient = ambient;
    this.hemi = hemi;
    this.clouds = clouds;
    this.t = 0.28; // start mid-morning (0..1, 0=midnight)
  }

  // returns a sun-elevation estimate: ~1 at noon, ~0 at midnight, negative below horizon.
  get dayFactor() {
    const e = Math.sin((this.t - 0.25) * Math.PI * 2);
    return MathUtilsClamp(e, -0.2, 1);
  }

  update(dt) {
    this.t = (this.t + dt / DAY_LENGTH) % 1;

    // sun position orbits overhead; t=0.5 -> noon (sun high in sky at +Y)
    const ang = this.t * Math.PI * 2;
    const sunDir = new THREE.Vector3(
      Math.cos(ang),
      Math.sin(ang),
      0.35
    ).normalize();
    this.sun.position.copy(sunDir).multiplyScalar(140);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    const day = this.dayFactor; // -0.2..1
    const daylight = MathUtilsClamp(day, 0, 1);

    // intensity ramp
    this.sun.intensity = 0.15 + daylight * 1.15;
    this.ambient.intensity = 0.18 + daylight * 0.32;
    this.hemi.intensity = 0.2 + daylight * 0.5;

    // sun color: warm at sunrise/sunset, white at noon
    this.sun.color.setRGB(1.0, 0.75 + 0.25 * daylight, 0.5 + 0.5 * daylight);

    // sky color: night -> day, with a sunset tinge near the horizon
    const night = new THREE.Color(0x0a0f25);
    const dayCol = new THREE.Color(0x87ceeb);
    const sunset = new THREE.Color(0xff8c42);

    const col = new THREE.Color().copy(night).lerp(dayCol, daylight);
    // strongest sunset tint when the sun is near the horizon
    const horizon = MathUtilsClamp(1 - Math.abs(day) * 3, 0, 1);
    if (day > -0.05) col.lerp(sunset, horizon * 0.35);

    this.scene.background = col;
    if (this.scene.fog) {
      this.scene.fog.color.copy(col);
      const fogDensity = 0.55 + daylight * 0.4;
      this.scene.fog.near = 30 * fogDensity;
      this.scene.fog.far = 160 * fogDensity;
    }

    if (this.clouds) this.clouds.setOpacity(0.15 + daylight * 0.75);

    // hemisphere light tint shifts cooler at night
    this.hemi.color.copy(day > 0 ? dayCol : night);
  }

  get isNight() { return this.dayFactor <= 0; }
}

function MathUtilsClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
