// HEARTWOOD — bootstrap: creates the game, wires input, runs the loop,
// and offers deterministic screenshot modes (?shot=start|play|graft|win|lose)
// so the maker can capture the title, a mid-wave fight, the graft choice
// and the victory screen exactly as the game renders them.

import { VIEW } from './config.js';
import { GRAFTS } from './config.js';
import { newGame, update, clickAt, startRun, startWave, plantSeed, removePlant } from './world.js';
import { makePlant } from './plants.js';
import { render } from './render.js';
import { bindInput } from './input.js';
import { setMuted, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261117);
const game = newGame(seed);
window.__game = game;

const shot = params.get('shot');

// --- Screenshot setups -----------------------------------------------------
// Each builds a fixed, attractive state, then renders one frame. The loop
// does not run in shot mode, so the capture is stable.

function placeDemoPlants(layout) {
  for (const [type, col, row] of layout) {
    game.plants.push(makePlant(type, col, row, game.mods));
  }
}

function setupShot(kind) {
  if (kind === 'start') {
    placeDemoPlants([
      ['thorn', 2, 1], ['sunpetal', 1, 3], ['bramble', 4, 0],
      ['spore', 3, 2], ['frost', 5, 4], ['thorn', 2, 4],
      ['sunpetal', 0, 1], ['thorn', 4, 3],
    ]);
    game.mode = 'title';
  } else if (kind === 'play') {
    startRun(game);
    game.season = 1; // Summer
    game.wave = 1; // second wave
    game.waveNumber = 3; // three Spring waves already held
    game.pollen = 320;
    game.score = 1250;
    game.stats.kills = 41;
    game.stats.grown = 11;
    game.stats.earned = 1830;
    placeDemoPlants([
      ['sunpetal', 0, 0], ['sunpetal', 0, 4], ['thorn', 2, 0],
      ['thorn', 2, 1], ['thorn', 2, 2], ['thorn', 2, 3], ['thorn', 2, 4],
      ['spore', 3, 1], ['spore', 3, 3], ['frost', 4, 2],
      ['bramble', 5, 0], ['bramble', 5, 4], ['thorn', 4, 1],
    ]);
    game.selected = 'thorn';
    game.hover = { x: 208 + 2 * 122 + 61, y: 118 + 2 * 104 + 52 };
    startWave(game);
    // Simulate 24 seconds of the wave so pests are mid-field, thorns are
    // flying and the HUD shows a real fight.
    for (let i = 0; i < 24 * 60; i++) update(game, 1 / 60);
    game.waveBanner = 0;
    game.mode = 'play';
  } else if (kind === 'graft') {
    startRun(game);
    game.season = 2; // Autumn begins
    game.wave = 0;
    game.pollen = 410;
    game.score = 2980;
    game.stats.kills = 96;
    game.stats.grown = 18;
    game.stats.earned = 3120;
    placeDemoPlants([
      ['sunpetal', 0, 1], ['sunpetal', 0, 3], ['thorn', 2, 0],
      ['thorn', 2, 2], ['thorn', 2, 4], ['spore', 3, 1],
      ['spore', 3, 3], ['frost', 4, 2], ['bramble', 5, 1],
    ]);
    game.grafts = [
      GRAFTS.find((g) => g.id === 'thorns'),
      GRAFTS.find((g) => g.id === 'gold'),
      GRAFTS.find((g) => g.id === 'roots'),
    ];
    game.mode = 'graft';
  } else if (kind === 'win') {
    startRun(game);
    game.season = 3;
    game.wave = 2;
    game.waveNumber = 12;
    game.pollen = 520;
    game.score = 8640;
    game.heartHp = 6;
    game.stats = { kills: 187, grown: 34, earned: 4210, time: 754 };
    placeDemoPlants([
      ['sunpetal', 0, 0], ['sunpetal', 0, 4], ['thorn', 2, 1],
      ['thorn', 2, 3], ['spore', 3, 2], ['frost', 4, 2],
      ['bramble', 5, 0], ['bramble', 5, 4],
    ]);
    game.mode = 'win';
  } else if (kind === 'lose') {
    startRun(game);
    game.season = 2;
    game.wave = 1;
    game.waveNumber = 8;
    game.pollen = 120;
    game.score = 3120;
    game.heartHp = 0;
    game.stats = { kills: 118, grown: 22, earned: 2680, time: 521 };
    game.mode = 'lose';
  }
  render(ctx, game);
  window.__shotReady = true;
}

// --- Interactive mode ------------------------------------------------------

if (shot) {
  setupShot(shot);
} else {
  bindInput(canvas, {
    onSelectSeed: (id) => { game.selected = id; },
    onPlantAt: (x, y) => clickAt(game, x, y),
    onRemoveAt: (col, row) => removePlant(game, col, row),
    onStartWave: () => {
      if (game.mode === 'title') startRun(game);
      else if (game.mode === 'play' && !game.waveActive) startWave(game);
      else if (game.mode === 'play') game.paused = !game.paused;
    },
    onTogglePause: () => { if (game.mode === 'play') game.paused = !game.paused; },
    onToggleMute: () => setMuted(!isMuted()),
    onRestart: () => {
      const fresh = newGame(game.seed + 1);
      Object.assign(game, fresh);
      startRun(game);
    },
    onConfirm: () => {
      if (game.mode === 'title') startRun(game);
      else if (game.mode === 'win' || game.mode === 'lose') {
        const fresh = newGame(game.seed + 1);
        Object.assign(game, fresh);
        startRun(game);
      }
    },
    onHover: (x, y) => { game.hover = x === null ? null : { x, y }; },
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(game, dt);
    render(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
