// three-shim.js — re-exports the global THREE (loaded via UMD <script> in index.html)
// as an ES module so our game modules can `import THREE from '../vendor/three-shim.js'`
// and use THREE.WebGLRenderer etc.
const THREE = (typeof window !== 'undefined' && window.THREE)
  ? window.THREE
  : (typeof globalThis !== 'undefined' ? globalThis.THREE : null);

if (!THREE) {
  throw new Error('THREE global not found. Ensure three.min.js is loaded before modules.');
}

export default THREE;
export const WebGLRenderer = THREE.WebGLRenderer;
export const Scene = THREE.Scene;
export const Color = THREE.Color;
export const Fog = THREE.Fog;
export const PerspectiveCamera = THREE.PerspectiveCamera;
export const Vector2 = THREE.Vector2;
export const Vector3 = THREE.Vector3;
export const Vector4 = THREE.Vector4;
export const Quaternion = THREE.Quaternion;
export const Matrix4 = THREE.Matrix4;
export const Euler = THREE.Euler;
export const PlaneGeometry = THREE.PlaneGeometry;
export const BoxGeometry = THREE.BoxGeometry;
export const Mesh = THREE.Mesh;
export const MeshBasicMaterial = THREE.MeshBasicMaterial;
export const MeshLambertMaterial = THREE.MeshLambertMaterial;
export const MeshStandardMaterial = THREE.MeshStandardMaterial;
export const CanvasTexture = THREE.CanvasTexture;
export const NearestFilter = THREE.NearestFilter;
export const RepeatWrapping = THREE.RepeatWrapping;
export const ClampToEdgeWrapping = THREE.ClampToEdgeWrapping;
export const DirectionalLight = THREE.DirectionalLight;
export const AmbientLight = THREE.AmbientLight;
export const HemisphereLight = THREE.HemisphereLight;
export const Box3 = THREE.Box3;
export const Raycaster = THREE.Raycaster;
export const Group = THREE.Group;
export const AdditiveBlending = THREE.AdditiveBlending;
export const DoubleSide = THREE.DoubleSide;
export const FrontSide = THREE.FrontSide;
export const Plane = THREE.Plane;
export const MathUtils = THREE.MathUtils;
export const SRGBColorSpace = THREE.SRGBColorSpace;
export const PCFSoftShadowMap = THREE.PCFSoftShadowMap;
