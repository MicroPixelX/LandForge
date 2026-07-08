// three-shim.js — bridges our modules to the ES-module Three.js from an import map.
// index.html maps the bare specifier "three" to three.module.js.
// We re-export the full namespace both as named exports and as the default,
// so existing `import THREE from '../vendor/three-shim.js'` usage keeps working.
import * as THREE from 'three';

export default THREE;
export * from 'three';
