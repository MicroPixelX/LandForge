// blocks.js — block definitions and the registry.
// Each block references atlas tile BY NAME; the world maps names -> slot indices.
import THREE from '../vendor/three-shim.js';
import * as Tex from './textures.js';

let _cache = null;

function tex(name) {
  if (name === '') return null;
  return Tex.canvasToTexture(Tex.tileCanvas(name));
}

export function defineBlocks() {
  let id = 0;
  const blocks = [];
  function add(name, faces, opts = {}) {
    // faces: [px,nx,py,ny,pz,nz] each a tile-name string
    const def = {
      id: id++,
      name,
      tiles: faces,
      faces: faces.map((n) => tex(n)), // THREE.Texture for icon rendering
      transparent: !!opts.transparent,
      liquid: !!opts.liquid,
      solid: opts.solid !== false,
    };
    blocks[def.id] = def;
    BLOCK_ID_BY_NAME[name] = def.id;
    return def.id;
  }

  add('air',     ['', '', '', '', '', ''], { solid: false, transparent: true });
  add('grass',   ['grassSide', 'grassSide', 'grassTop', 'dirt', 'grassSide', 'grassSide']);
  add('dirt',    ['dirt', 'dirt', 'dirt', 'dirt', 'dirt', 'dirt']);
  add('stone',   ['stone', 'stone', 'stone', 'stone', 'stone', 'stone']);
  add('cobble',  ['cobble', 'cobble', 'cobble', 'cobble', 'cobble', 'cobble']);
  add('planks',  ['planks', 'planks', 'planks', 'planks', 'planks', 'planks']);
  add('log',     ['logSide', 'logSide', 'logTop', 'logTop', 'logSide', 'logSide']);
  add('leaves',  ['leaves', 'leaves', 'leaves', 'leaves', 'leaves', 'leaves'], { transparent: true });
  add('sand',    ['sand', 'sand', 'sand', 'sand', 'sand', 'sand']);
  add('water',   ['water', 'water', 'water', 'water', 'water', 'water'], { solid: false, transparent: true, liquid: true });
  add('bedrock', ['bedrock', 'bedrock', 'bedrock', 'bedrock', 'bedrock', 'bedrock']);
  add('coal',    ['coalOre', 'coalOre', 'coalOre', 'coalOre', 'coalOre', 'coalOre']);
  add('iron',    ['ironOre', 'ironOre', 'ironOre', 'ironOre', 'ironOre', 'ironOre']);
  add('diamond', ['diamondOre', 'diamondOre', 'diamondOre', 'diamondOre', 'diamondOre', 'diamondOre']);

  _cache = blocks;
  return blocks;
}

export function getBlocks() {
  if (!_cache) defineBlocks();
  return _cache;
}

export function getBlock(id) { return getBlocks()[id]; }

export const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, PLANKS: 5, LOG: 6,
  LEAVES: 7, SAND: 8, WATER: 9, BEDROCK: 10, COAL: 11, IRON: 12, DIAMOND: 13,
};

// Block-name -> BLOCK id (used for UI labels)
export const BLOCK_ID_BY_NAME = {};
export function getName(id) { return getBlock(id)?.name ?? ''; }

// Block ids the player can legitimately select & place in the world.
// Excludes AIR and BEDROCK (air is invisible; bedrock is meant to be permanent).
export const PLACEABLE = [
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLE, BLOCK.PLANKS,
  BLOCK.LOG, BLOCK.LEAVES, BLOCK.SAND, BLOCK.WATER,
  BLOCK.COAL, BLOCK.IRON, BLOCK.DIAMOND,
];
