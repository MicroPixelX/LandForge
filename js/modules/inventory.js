// inventory.js — hotbar + full inventory UI.
// Holds a list of block ids assigned to slots. Hotbar is 9 slots; inventory 9x3.
// Block break adds to inventory; selecting a slot chooses the placeable block.
import { BLOCK, getBlock } from './blocks.js';
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
    // ore presets in the inventory grid
    this.inv[0] = BLOCK.COAL;
    this.inv[1] = BLOCK.IRON;
    this.inv[2] = BLOCK.DIAMOND;

    this.open = false;
    this.onChange = null;   // called whenever the selected/hotbar/inventory config changes
    this.onToggle = null;    // called with (open:boolean) when the inventory opens/closes

    this._buildUI();
  }

  _buildUI() {
    this.hotbarEl = document.getElementById('hotbar');
    this.invEl = document.getElementById('inventory');
    this._renderHotbar();
    this._renderInventory();

    // Number keys select hotbar slots; E toggles the inventory; Esc closes it.
    // We only handle these when pointer lock is engaged (i.e. while in-game) so
    // the menu page's key events aren't hijacked.
    document.addEventListener('keydown', (e) => {
      if (!this._inGame) return;
      const n = parseInt(e.code.replace('Digit', ''), 10);
      if (n >= 1 && n <= 9) {
        this.selected = n - 1;
        this._renderHotbar();
        this.onChange?.();
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        // don't allow toggling while a modifier makes 'e' a typed character
        this.toggle();
      }
      if (this.open && e.code === 'Escape') this.toggle(false);
    });
  }

  // Called by main when the game starts/stops so the key handler knows context.
  setInGame(v) { this._inGame = v; }

  toggle(force = null) {
    const next = force === null ? !this.open : force;
    this.open = next;
    this.invEl.classList.toggle('open', this.open);
    this.onToggle?.(this.open);
  }

  selectedBlock() {
    return this.hotbar[this.selected];
  }

  setSelected(i) { this.selected = i; this._renderHotbar(); this.onChange?.(); }

  // Add a freshly-broken block to the inventory: put it in the first matching
  // hotbar slot, else first empty hotbar slot, else first empty inventory slot.
  addBlock(id) {
    if (id == null || id === BLOCK.AIR) return;
    const hotIdx = this.hotbar.indexOf(id);
    if (hotIdx >= 0) { return; } // already accessible
    const emptyHot = this.hotbar.indexOf(null);
    if (emptyHot >= 0) { this.hotbar[emptyHot] = id; }
    else {
      const emptyInv = this.inv.indexOf(null);
      if (emptyInv >= 0) this.inv[emptyInv] = id;
    }
    this._renderHotbar();
    this._renderInventory();
    this.onChange?.();
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
      el.addEventListener('mouseenter', () => { this.selected = i; this._renderHotbar(); this.onChange?.(); });
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
