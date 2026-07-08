// main.js — wires together world, player, inventory, clouds, day/night, hand, and the render loop.
import THREE from '../vendor/three-shim.js';
import { World } from './modules/world.js';
import { Chunk, SIZE, HEIGHT } from './modules/chunk.js';
import { Player, PLAYER_DIMS } from './modules/player.js';
import { Clouds } from './modules/clouds.js';
import { DayNight } from './modules/daynight.js';
import { Hand } from './modules/hand.js';
import { Inventory } from './modules/inventory.js';
import { raycastBlock } from './modules/interaction.js';
import { BLOCK, getBlock, PLACEABLE } from './modules/blocks.js';

const RENDER_RADIUS = 5; // chunks

let renderer, scene, camera, world, player, clouds, daynight, hand, inventory;
let sun, ambient, hemi;
let blocker, playBtn, fpsEl;
let last = performance.now();
const dir = new THREE.Vector3();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = 'pointer';

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 30, 160);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  scene.add(camera); // needed so the hand (child of camera) renders

  // lights
  sun = new THREE.DirectionalLight(0xffffff, 1.0);
  scene.add(sun);
  scene.add(sun.target);

  ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a3a22, 0.5);
  scene.add(hemi);

  world = new World(2024);
  // pre-generate chunks around spawn
  for (let cx = -RENDER_RADIUS; cx <= RENDER_RADIUS; cx++)
    for (let cz = -RENDER_RADIUS; cz <= RENDER_RADIUS; cz++)
      scene.add(world.loadChunk(cx, cz).group);

  // spawn position
  const sx = 0, sz = 0;
  const sy = world.surfaceHeight(sx, sz) + 3;
  player = new Player(world, camera, renderer.domElement);
  player.spawn(sx + 0.5, sy, sz + 0.5);

  clouds = new Clouds(220);
  scene.add(clouds.group);

  daynight = new DayNight(scene, sun, ambient, hemi, clouds);

  hand = new Hand(camera);

  inventory = new Inventory();
  refreshHand();
  inventory.onChange = refreshHand;

  blocker = document.getElementById('blocker');
  playBtn = document.getElementById('playBtn');
  fpsEl = document.getElementById('fps');

  playBtn.addEventListener('click', () => {
    blocker.classList.add('hidden');
    player.requestLock();
  });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    player.pointerLocked = locked;
    if (!locked && !inventory.open) blocker.classList.remove('hidden');
  });

  window.addEventListener('resize', onResize);
  setupMouseAction();

  // Number keys swap hotbar selection handled in inventory; keep hand refreshed
  document.addEventListener('keydown', (e) => {
    const n = parseInt(e.code.replace('Digit', ''), 10);
    if (n >= 1 && n <= 9) setTimeout(refreshHand, 0);
  });

  animate(performance.now());
}

function refreshHand() {
  const id = inventory.selectedBlock();
  if (id == null) { hand.setBlock(null); return; }
  hand.setBlock(getBlock(id));
}

function setupMouseAction() {
  let leftWasDown = false, rightWasDown = false;
  const origin = new THREE.Vector3();
  function tryBreak() {
    origin.copy(camera.position);
    camera.getWorldDirection(dir);
    const hit = raycastBlock(world, origin, dir);
    if (!hit) return;
    const [x, y, z] = hit.pos;
    const id = world.getBlock(x, y, z);
    if (id === BLOCK.BEDROCK) return; // unbreakable
    world.setBlock(x, y, z, BLOCK.AIR);
    inventory.addBlock(id);
    hand.swing();
  }
  let placeCooldown = 0;
  function tryPlace() {
    origin.copy(camera.position);
    camera.getWorldDirection(dir);
    const hit = raycastBlock(world, origin, dir);
    if (!hit) return;
    const id = inventory.selectedBlock();
    if (id == null) return;
    const [x, y, z] = hit.pos;
    const n = hit.normal;
    const px = x + n[0], py = y + n[1], pz = z + n[2];
    // don't place inside the player
    const pminX = Math.floor(player.pos.x - PLAYER_DIMS.PLAYER_W);
    const pmaxX = Math.floor(player.pos.x + PLAYER_DIMS.PLAYER_W);
    const pminZ = Math.floor(player.pos.z - PLAYER_DIMS.PLAYER_W);
    const pmaxZ = Math.floor(player.pos.z + PLAYER_DIMS.PLAYER_W);
    const pminY = Math.floor(player.pos.y);
    const pmaxY = Math.floor(player.pos.y + PLAYER_DIMS.PLAYER_H);
    if (px >= pminX && px <= pmaxX && pz >= pminZ && pz <= pmaxZ && py >= pminY && py <= pmaxY) {
      return;
    }
    world.setBlock(px, py, pz, id);
    hand.swing();
  }

  document.addEventListener('mousedown', (e) => {
    if (!player.pointerLocked) return;
    if (e.button === 0) tryBreak();
    if (e.button === 2) { tryPlace(); placeCooldown = 0.18; }
  });
  // continuous holding right mouse to place repeatedly
  document.addEventListener('mouseup', (e) => { if (e.button === 2) placeCooldown = 0; });

  // continuous hold for break: handle in animate via player.mouse flags
  window._tryBreak = tryBreak;
  window._tryPlace = tryPlace;
  window._placeCooldown = () => placeCooldown;
  window._setPlaceCooldown = (v) => { placeCooldown = v; };
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function ensureChunksAround(cx, cz) {
  // simple radius streaming
  const min = -RENDER_RADIUS, max = RENDER_RADIUS;
  for (let dx = min; dx <= max; dx++)
    for (let dz = min; dz <= max; dz++) {
      const k = (cx + dx) + ',' + (cz + dz);
      if (!world.chunks.has(k)) {
        const ch = world.loadChunk(cx + dx, cz + dz);
        scene.add(ch.group);
      }
    }
  // unload far
  const keep = new Set();
  for (let dx = min; dx <= max; dx++)
    for (let dz = min; dz <= max; dz++)
      keep.add((cx + dx) + ',' + (cz + dz));
  for (const key of [...world.chunks.keys()]) {
    if (!keep.has(key)) {
      const [cxu, czu] = key.split(',').map(Number);
      world.unloadChunk(cxu, czu);
    }
  }
}

let lastBreak = 0, lastPlace = 0;
let fpsAcc = 0, fpsCount = 0, fpsTimer = 0;

function animate(now) {
  requestAnimationFrame(animate);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1; // clamp big gaps

  daynight.update(dt);

  if (player.pointerLocked) {
    player.update(dt);

    // continuous breaking while left button held
    if (player.mouse.left) {
      lastBreak += dt;
      if (lastBreak > 0.28) {
        window._tryBreak();
        lastBreak = 0;
      }
    } else lastBreak = 1;
    if (player.mouse.right) {
      window._setPlaceCooldown(window._placeCooldown() - dt);
      if (window._placeCooldown() <= 0) {
        window._tryPlace();
        window._setPlaceCooldown(0.18);
      }
    } else window._setPlaceCooldown(0);
  }

  // clouds and hand always update
  clouds.update(dt, player.pos.x, player.pos.z);
  hand.update(dt);

  // build dirty chunk meshes (budget)
  world.updateDirtyBudget(2);

  // stream chunks
  const pcx = Math.floor(player.pos.x / SIZE);
  const pcz = Math.floor(player.pos.z / SIZE);
  ensureChunksAround(pcx, pcz);

  renderer.render(scene, camera);

  // fps
  fpsAcc += dt; fpsCount++; fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fpsEl.textContent = `FPS: ${Math.round(fpsCount / fpsAcc)}`;
    fpsAcc = 0; fpsCount = 0; fpsTimer = 0;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
