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

  // returns 0..1 sun factor: 1 full day, 0 full night
  get dayFactor() {
    // map t to angle; sun overhead at t=0.5 (noon)
    const ang = (this.t - 0.25) * Math.PI * 2; // noon -> PI/2? adjust
    // Use elevation model: elevation = sin(2*pi*(t-0.25))
    const e = Math.sin((this.t - 0.25) * Math.PI * 2);
    return MathUtilsClamp(e, -0.2, 1);
  }

  update(dt) {
    this.t = (this.t + dt / DAY_LENGTH) % 1;

    // sun angle across the sky
    const ang = this.t * Math.PI * 2; // 0..2pi
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
    const warm = MathUtilsClamp(1 - daylight, 0, 1);
    this.sun.color.setRGB(
      1.0,
      0.75 + 0.25 * daylight,
      0.5 + 0.5 * daylight
    );

    // sky color lerp from dawn/day to dusk/night
    const night = new THREE.Color(0x0a0f25);
    const dayCol = new THREE.Color(0x87ceeb);
    const sunset = new THREE.Color(0xff8c42);

    const col = new THREE.Color();
    if (daylight > 0.0) {
      // near horizon (twilight) add sunset tint
      const twi = MathUtilsClamp(1 - Math.abs(day - 0.15), 0, 1) * 0.0; // disabled tint flat
      col.copy(night).lerp(dayCol, MathUtilsClamp(daylight, 0, 1));
    } else {
      col.copy(night);
    }
    // add sunset tinge when sun near horizon
    const horizon = MathUtilsClamp(1 - Math.abs(day) * 3, 0, 1);
    if (day > -0.05) col.lerp(sunset, horizon * 0.35);

    this.scene.background = col;
    if (this.scene.fog) {
      this.scene.fog.color.copy(col);
      // less fog at night
      const fogDensity = 0.55 + daylight * 0.4;
      this.scene.fog.near = 30 * fogDensity;
      this.scene.fog.far = 160 * fogDensity;
    }

    if (this.clouds) this.clouds.setOpacity(0.15 + daylight * 0.75);

    // ambient color shifts slightly cooler at night
    this.hemi.color.copy(day > 0 ? dayCol : night);
  }

  get isNight() { return this.dayFactor <= 0; }
}

function MathUtilsClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
