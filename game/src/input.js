// HEARTWOOD — keyboard and mouse input. One clear job: translate raw
// browser events into game intents (select a seed, plant it, start a wave,
// pause, mute, restart), and convert screen pixels to canvas pixels.

import { GRID, PLANT_ORDER } from './config.js';

// Callbacks the world registers; input never touches game state directly.
const handlers = {
  onSelectSeed: null, // (plantId | null)
  onPlantAt: null, // (col, row)
  onRemoveAt: null, // (col, row) — right click / shovel
  onStartWave: null,
  onTogglePause: null,
  onToggleMute: null,
  onRestart: null,
  onConfirm: null, // Enter / click on a screen (title, graft handled by click pos)
  onGraftPick: null, // (index)
  onHover: null, // (x, y) canvas coords, or null when leaving
};

export function bindInput(canvas, hooks) {
  Object.assign(handlers, hooks);

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 1280,
      y: ((e.clientY - r.top) / r.height) * 720,
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e);
    if (handlers.onHover) handlers.onHover(p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => {
    if (handlers.onHover) handlers.onHover(null, null);
  });

  canvas.addEventListener('click', (e) => {
    const p = toCanvas(e);
    handleClick(p.x, p.y);
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const p = toCanvas(e);
    const cell = cellAt(p.x, p.y);
    if (cell && handlers.onRemoveAt) handlers.onRemoveAt(cell.col, cell.row);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') {
      const id = PLANT_ORDER[Number(k) - 1];
      if (handlers.onSelectSeed) handlers.onSelectSeed(id);
      return;
    }
    if (k === ' ') { e.preventDefault(); if (handlers.onStartWave) handlers.onStartWave(); return; }
    if (k === 'p') { if (handlers.onTogglePause) handlers.onTogglePause(); return; }
    if (k === 'm') { if (handlers.onToggleMute) handlers.onToggleMute(); return; }
    if (k === 'r') { if (handlers.onRestart) handlers.onRestart(); return; }
    if (k === 'enter') { if (handlers.onConfirm) handlers.onConfirm(); return; }
    if (k === 'escape') { if (handlers.onSelectSeed) handlers.onSelectSeed(null); return; }
  });
}

// Which grid cell (if any) holds canvas point (x, y)?
export function cellAt(x, y) {
  const col = Math.floor((x - GRID.x) / GRID.cellW);
  const row = Math.floor((y - GRID.y) / GRID.cellH);
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return { col, row };
}

// Center of a cell in canvas pixels.
export function cellCenter(col, row) {
  return {
    x: GRID.x + col * GRID.cellW + GRID.cellW / 2,
    y: GRID.y + row * GRID.cellH + GRID.cellH / 2,
  };
}

// The world decides what a click means for its current screen; input only
// routes the raw position. These helpers are shared with the world.
function handleClick(x, y) {
  if (handlers.onPlantAt) handlers.onPlantAt(x, y);
}
