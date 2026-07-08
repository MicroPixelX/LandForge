// main.js — wires together world, player, inventory, clouds, day/night, hand, and the render loop.
import THREE from '../vendor/three-shim.js';
import { World } from './modules/world.js';
import { SIZE } from './modules/chunk.js';
import { Player, PLAYER_DIMS } from './modules/player.js';
import { Clouds } from './modules/clouds.js';
import { DayNight } from './modules/daynight.js';
import { Hand } from './modules/hand.js';
import { Inventory } from './modules/inventory.js';
import { raycastBlock } from './modules/interaction.js';
import { BLOCK, getBlock, PLACEABLE } from './modules/blocks.js';

const RENDER_RADIUS = 4; // chunks (kept modest so the page is responsive)

let renderer, scene, camera, world, player, clouds, daynight, hand, inventory;
let sun, ambient, hemi;
let blocker, playBtn, fpsEl;
let last = performance.now();
const dir = new THREE.Vector3();
let ready = false;       // becomes true once async init finished
let started = false;     // becomes true after the PLAY click requests pointer lock
// refs set by setupMouseAction() so the render loop can drive continuous break/place
let _tryBreak = () => {}, _tryPlace = () => {}, _getCooldown = () => 0, _setCooldown = () => {};

// Show an error overlay on screen so failures are visible (instead of a dead PLAY button).
function showError(err) {
  console.error(err);
  let box = document.getElementById('errorBox');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'errorBox';
    Object.assign(box.style, {
      position: 'fixed', left: '8px', bottom: '8px', right: '8px',
      maxHeight: '40vh', overflow: 'auto', padding: '10px',
      background: 'rgba(120,0,0,0.9)', color: '#fff', fontSize: '12px',
      whiteSpace: 'pre-wrap', zIndex: 100, fontFamily: 'monospace',
    });
    document.body.appendChild(box);
  }
  box.textContent = 'Error: ' + (err && err.stack ? err.stack : err);
  // hide the blocker so the error is visible
  const b = document.getElementById('blocker');
  if (b) b.style.display = 'none';
}

// Attach the PLAY button wiring as early as possible; if init isn't done yet,
// we tell the user to wait a moment instead of doing nothing.
function wirePlayButton() {
  const btn = document.getElementById('playBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!ready) {
      // init still running (pre-generating chunks) — reflect that on the button
      btn.textContent = 'LOADING…';
      btn.disabled = true;
      // poll until ready, then click again
      const wait = setInterval(() => {
        if (ready) { clearInterval(wait); btn.disabled = false; btn.textContent = 'PLAY'; btn.click(); }
      }, 80);
      return;
    }
    if (started) return; // already entered the game
    // try to enter: lock pointer; the pointerlockchange handler sets `started`.
    const b = document.getElementById('blocker');
    if (b) b.classList.add('hidden');
    try {
      player.requestLock();
    } catch (e) {
      showError(e);
      started = false;
      if (b) b.classList.remove('hidden');
    }
  });
}

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

  // player + spawn
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
  // Opening the inventory exits pointer lock (so the cursor can click slots);
  // closing it re-acquires pointer lock to resume play.
  inventory.onToggle = (open) => {
    if (open) {
      // exit pointer lock to interact with the inventory UI
      if (player.pointerLocked) player.releaseLock();
      // keep `started` true so the game view stays hidden — we re-lock on close
    } else if (started) {
      // resume play
      player.requestLock();
    }
  };

  blocker = document.getElementById('blocker');
  playBtn = document.getElementById('playBtn');
  fpsEl = document.getElementById('fps');

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    player.pointerLocked = locked;
    if (locked) {
      started = true;
      inventory.setInGame(true);
      const b = document.getElementById('blocker');
      if (b) b.classList.add('hidden');
    } else {
      // pointer lock exited (Esc or failed). Only re-show the menu if the
      // inventory isn't the reason we exited (otherwise closing the inventory
      // would pop the start menu back up).
      if (!inventory.open) {
        started = false;
        const b = document.getElementById('blocker');
        if (b) b.classList.remove('hidden');
      }
    }
  });

  window.addEventListener('resize', onResize);
  setupMouseAction();

  // Start the render loop immediately so the world renders behind the menu,
  // and stream/highlight chunks over the first few frames (keeps the page responsive).
  animate(performance.now());

  // Pre-generate the chunks around spawn in small async batches so we don't
  // freeze the page for seconds (which made the PLAY button look dead).
  let pending = [];
  for (let cx = -RENDER_RADIUS; cx <= RENDER_RADIUS; cx++)
    for (let cz = -RENDER_RADIUS; cz <= RENDER_RADIUS; cz++)
      pending.push([cx, cz]);
  const BATCH = 4;
  let i = 0;
  (function genBatch() {
    const end = Math.min(i + BATCH, pending.length);
    for (; i < end; i++) {
      const [cx, cz] = pending[i];
      if (!world.getChunk(cx, cz)) scene.add(world.loadChunk(cx, cz).group);
    }
    if (i < pending.length) {
      setTimeout(genBatch, 0);
    } else {
      ready = true;
    }
  })();
}

function refreshHand() {
  const id = inventory.selectedBlock();
  if (id == null) { hand.setBlock(null); return; }
  hand.setBlock(getBlock(id));
}

function setupMouseAction() {
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
    if (!PLACEABLE.includes(id)) return; // reject air/bedrock/non-placeable
    const [x, y, z] = hit.pos;
    const n = hit.normal;
    const px = x + n[0], py = y + n[1], pz = z + n[2];
    // only place into an empty (air or water) cell
    const target = world.getBlock(px, py, pz);
    if (target !== BLOCK.AIR && target !== BLOCK.WATER) return;
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

  // expose the place/break closures (and cooldown state) to the render loop
  // via module-scoped refs instead of polluting `window`.
  _tryBreak = tryBreak;
  _tryPlace = tryPlace;
  _getCooldown = () => placeCooldown;
  _setCooldown = (v) => { placeCooldown = v; };
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

let lastBreak = 0;
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
        _tryBreak();
        lastBreak = 0;
      }
    } else lastBreak = 1;
    if (player.mouse.right) {
      _setCooldown(_getCooldown() - dt);
      if (_getCooldown() <= 0) {
        _tryPlace();
        _setCooldown(0.18);
      }
    } else _setCooldown(0);
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

// Wire the PLAY button as early as possible and run init with a try/catch
// so any startup error is shown on screen instead of leaving the button dead.
(function bootstrap() {
  const start = () => {
    wirePlayButton();
    try { init(); }
    catch (e) { showError(e); }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
