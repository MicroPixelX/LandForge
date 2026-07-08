# LandForge

A Minecraft-like voxel world built with **Three.js** (pure ES modules, no build step).

## Features
- Chunked infinite-ish world with terrain generation (hills, water, beaches, trees)
- 3 ores: **coal**, **iron**, **diamond** (deeper = rarer)
- Running / drifting clouds
- Full **day / night cycle** (sun, sky & fog colors, cloud opacity)
- First-person controls: WASD, jump, sprint, swim in water, AABB physics
- Voxel **raycasting** — left-click to break, right-click to place
- **Hotbar** (1–9) + toggleable **inventory** (E) with drag-to-swap slots
- Held-block **hand** that swings on click
- Pixel-art **procedural textures** (one canvas per tile, packed into a texture atlas)
- Face-culled merged mesh per chunk for performance

## Play
Live demo: **https://micropixelx.github.io/LandForge/**

### Run locally
Because the game uses ES modules, serve it over HTTP (don't open `index.html` directly):

```bash
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

### Controls
| Action | Key |
| --- | --- |
| Move | W A S D |
| Jump | Space |
| Sprint | Left Shift |
| Look | Mouse |
| Break block | Left click (hold) |
| Place block | Right click |
| Select hotbar slot | 1 – 9 |
| Toggle inventory | E |

## Project layout
```
index.html                  # page + UI (hotbar, inventory, crosshair, play screen)
js/main.js                  # render loop, chunk streaming, input wiring
js/vendor/three-shim.js     # re-exports global THREE as an ES module
js/modules/textures.js      # procedural pixel textures (cached, packed into an atlas)
js/modules/blocks.js        # block registry & ids
js/modules/noise.js         # value noise, fbm, deterministic 3D hash
js/modules/chunk.js         # 16x64x16 chunk, face-culled merged mesh
js/modules/world.js         # chunk store, terrain/ore/tree/water gen, atlas material
js/modules/player.js        # first-person controller + AABB physics
js/modules/interaction.js   # voxel DDA raycast for break/place
js/modules/inventory.js     # hotbar + 9x3 inventory UI
js/modules/hand.js          # first-person held-block hand
js/modules/clouds.js        # drifting cloud puffs
js/modules/daynight.js      # sun/ambient/hemi/sky/fog cycle
```

## Tech
- [Three.js r160](https://threejs.org/) loaded from CDN (UMD global re-exported as ES modules)
- No bundler / no dependencies — static files only
