// inventory.js — hotbar + full inventory UI.
// Holds a list of block ids assigned to slots. Hotbar is 9 slots; inventory 9x3.
// Block break adds to inventory; selecting a slot chooses the placeable block.
import { BLOCK, getBlock, PLACEABLE } from './blocks.js';
import * as Tex from './textures.js';

export class Inventory {
  constructor() {
    this.hotbar = new Array(9).fill(null);
    this.inv = new Array(9 * 3).fill(null);
    this.selected = 0;
    // give the player a starter set in the hotbar
    this.hotbar[0] = BLOCK.GRASS;
    this.hotbar[1] = BLOCK.DIRT;
    this.hotbar[2] = BLOCK.STONE;
    this.hotbar[3] = BLOCK.COBBLE;
    this.hotbar[4] = BLOCK.PLANKS;
    this.hotbar[5] = BLOCK.LOG;
    this.hotbar[6] = BLOCK.LEAVES;
    this.hotbar[7] = BLOCK.SAND;
    this.hotbar[8] = BLOCK.WATER;
    // ore presets plus an empty
    this.inv[0] = BLOCK.COAL;
    this.inv[1] = BLOCK.IRON;
    this.inv[2] = BLOCK.DIAMOND;

    this.counts = new Map(); // not heavily used; placeholder counts of Infinity
    this.open = false;
    this.onChange = null;

    this._buildUI();
  }

  _buildUI() {
    this.hotbarEl = document.getElementById('hotbar');
    this.invEl = document.getElementById('inventory');
    this._renderHotbar();
    this._renderInventory();

    // number keys and e to toggle handled in main; here we expose methods.
    document.addEventListener('keydown', (e) => {
      const n = parseInt(e.code.replace('Digit', ''), 10);
      if (n >= 1 && n <= 9) {
        this.selected = n - 1;
        this._renderHotbar();
      }
      if (e.code === 'KeyE') {
        this.toggle();
      }
      if (this.open && e.code === 'Escape') this.toggle(false);
    });
  }

  toggle(force = null) {
    const next = force === null ? !this.open : force;
    this.open = next;
    this.invEl.classList.toggle('open', this.open);
  }

  selectedBlock() {
    return this.hotbar[this.selected];
  }

  // returns block id adjacent to currently clicked (for placing)
  // used by main to read which slot is selected
  setSelected(i) { this.selected = i; this._renderHotbar(); }

  // cycle pick-block on right click harvest: add dropped ore block to inventory
  addBlock(id) {
    // not heavily tracked; just light feedback
    this._renderHotbar();
    this._renderInventory();
  }

  _slotEl(blockId, withKey, keyIndex, count) {
    const el = document.createElement('div');
    el.className = 'slot';
    if (withKey) el.classList.add('active');
    if (blockId == null) {
      if (withKey) { const k = document.createElement('div'); k.className = 'key'; k.textContent = (keyIndex + 1); el.appendChild(k); }
      return el;
    }
    const def = getBlock(blockId);
    if (!def) return el;
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // composite a pseudo-3D cube using top + side tiles
    const top = Tex.tileCanvas(def.tiles[2]);
    const side = Tex.tileCanvas(def.tiles[0]);
    // side fills full, top fills upper triangle-ish top band
    ctx.drawImage(side, 0, 0);
    // overlay top register
    ctx.drawImage(top, 0, 0, 16, 4, 0, 0, 16, 4);
    el.appendChild(c);
    if (withKey) {
      const k = document.createElement('div'); k.className = 'key'; k.textContent = (keyIndex + 1); el.appendChild(k);
    }
    return el;
  }

  _renderHotbar() {
    this.hotbarEl.innerHTML = '';
    this.hotbar.forEach((id, i) => {
      const el = this._slotEl(id, i === this.selected, i, null);
      el.addEventListener('mouseenter', () => { this.selected = i; this._renderHotbar(); });
      this.hotbarEl.appendChild(el);
    });
  }

  _renderInventory() {
    this.invEl.innerHTML = '';
    this.inv.forEach((id, i) => {
      const el = this._slotEl(id, false, -1, null);
      el.addEventListener('click', () => {
        // swap with currently selected hotbar slot
        const tmp = this.hotbar[this.selected];
        this.hotbar[this.selected] = this.inv[i];
        this.inv[i] = tmp;
        this._renderHotbar();
        this._renderInventory();
        this.onChange?.();
      });
      this.invEl.appendChild(el);
    });
  }
}
