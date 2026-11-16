// HEARTWOOD — the world: game state, the update loop, the economy, and
// the rules that bind everything (planting, waves, grafts, win and loss).
// One clear job: own the state machine and advance it every tick.

import {
  GRID, HEART_MAX, START_POLLEN, WAVE_CLEAR_BONUS, SEASON_CLEAR_BONUS,
  EARLY_START_BONUS, PLANTS, PLANT_ORDER,
} from './config.js';
import { mulberry32 } from './random.js';
import { makePlant, plantAt, updatePlants, sweepPlants } from './plants.js';
import { makePest, updatePests, sweepPests, damagePest } from './pests.js';
import { buildWave, waveSize, rollGrafts, TOTAL_WAVES } from './waves.js';
import { updateParticles, spawnBurst, spawnFloat } from './particles.js';
import { sfx, setMuted, isMuted } from './audio.js';
import { cellAt } from './input.js';

export function newGame(seed) {
  return {
    mode: 'title', // title | play | graft | win | lose
    paused: false,
    time: 0,
    rng: mulberry32(seed || 20261117),
    seed: seed || 20261117,
    season: 0,
    wave: 0, // 0-based within the season
    waveNumber: 0, // 1-based across the whole run
    pollen: START_POLLEN,
    score: 0,
    heartHp: HEART_MAX,
    heartMax: HEART_MAX,
    plants: [],
    pests: [],
    projectiles: [],
    particles: [],
    floats: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    waveTotal: 0,
    waveSpawned: 0,
    selected: null, // plant id selected from the seed bar
    hover: null, // {x, y} canvas coords
    grafts: [],
    stats: { kills: 0, grown: 0, earned: 0, time: 0 },
    mods: { damage: 1, fireRate: 1, pollen: 1, plantHp: 1, frostbite: false },
    shake: 0,
    flash: 0,
    waveBanner: 0, // seconds left to show the wave banner
    bannerText: '',
  };
}

// --- Economy ---------------------------------------------------------------

export function canAfford(game, plantId) {
  return game.pollen >= PLANTS[plantId].cost;
}

export function plantSeed(game, col, row) {
  if (!game.selected) return false;
  const def = PLANTS[game.selected];
  if (!def) return false;
  if (plantAt(game, col, row)) { sfx.error(); return false; }
  if (!canAfford(game, game.selected)) { sfx.error(); return false; }
  game.pollen -= def.cost;
  game.plants.push(makePlant(game.selected, col, row, game.mods));
  game.stats.grown++;
  sfx.plant();
  spawnBurst(game.particles, GRID.x + col * GRID.cellW + GRID.cellW / 2, GRID.y + row * GRID.cellH + GRID.cellH / 2, '#8fce5e', 8, 70);
  return true;
}

export function removePlant(game, col, row) {
  for (let i = 0; i < game.plants.length; i++) {
    const p = game.plants[i];
    if (p.col === col && p.row === row) {
      game.pollen += Math.floor(PLANTS[p.type].cost * 0.5);
      spawnBurst(game.particles, p.x, p.y, '#c9a86a', 8, 70);
      game.plants.splice(i, 1);
      sfx.click();
      return true;
    }
  }
  return false;
}

// --- Waves -----------------------------------------------------------------

export function startWave(game) {
  if (game.mode !== 'play' || game.waveActive) return false;
  game.waveActive = true;
  game.waveNumber++;
  game.waveTotal = waveSize(game.season, game.wave);
  game.waveSpawned = 0;
  game.spawnQueue = buildWave(game.season, game.wave, game.rng);
  game.spawnTimer = 0;
  game.bannerText = `${['Spring', 'Summer', 'Autumn', 'Winter'][game.season]} — Wave ${game.wave + 1} of 3`;
  game.waveBanner = 2.2;
  sfx.horn();
  return true;
}

export function startWaveEarly(game) {
  // Starting the next wave while the field is clear pays a bonus.
  if (startWave(game)) {
    game.pollen += EARLY_START_BONUS;
    game.stats.earned += EARLY_START_BONUS;
    spawnFloat(game.floats, 640, 200, `+${EARLY_START_BONUS} early pollen`, '#ffe9a3');
  }
}

function endWave(game) {
  game.waveActive = false;
  const bonus = WAVE_CLEAR_BONUS;
  game.score += bonus;
  game.pollen += Math.round(40 * (game.mods.pollen || 1));
  spawnFloat(game.floats, 640, 240, `Wave clear! +${bonus} score`, '#ffe9a3');
  sfx.graft();
  if (game.wave < 2) {
    game.wave++;
  } else if (game.season < 3) {
    // Between seasons: offer grafts.
    game.season++;
    game.wave = 0;
    game.score += SEASON_CLEAR_BONUS;
    game.grafts = rollGrafts(game.rng);
    game.mode = 'graft';
  } else {
    // Winter wave 3 cleared: the grove survives. Win.
    game.mode = 'win';
    sfx.win();
  }
}

export function pickGraft(game, index) {
  const graft = game.grafts[index];
  if (!graft) return false;
  applyGraft(game, graft.id);
  game.grafts = [];
  game.mode = 'play';
  sfx.graft();
  return true;
}

function applyGraft(game, id) {
  if (id === 'roots') {
    game.mods.plantHp *= 1.3;
    for (const p of game.plants) { p.maxHp = Math.round(p.maxHp * 1.3); p.hp = Math.min(p.maxHp, p.hp + 30); }
  } else if (id === 'thorns') {
    game.mods.damage *= 1.25;
  } else if (id === 'gold') {
    game.mods.pollen *= 1.5;
  } else if (id === 'sap') {
    game.mods.fireRate *= 1.2;
  } else if (id === 'frostbite') {
    game.mods.frostbite = true;
  } else if (id === 'wind') {
    game.heartMax += 20;
    game.heartHp = Math.min(game.heartMax, game.heartHp + 20);
  }
}

// --- Projectiles -----------------------------------------------------------

function updateProjectiles(game, dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const pr = game.projectiles[i];
    if (pr.kind === 'thorn') {
      pr.x += pr.vx * dt;
      // Hit the first pest in the same lane whose circle we cross.
      let hit = null;
      for (const pest of game.pests) {
        if (pest.row !== pr.row) continue;
        if (Math.abs(pest.x - pr.x) < 22 && Math.abs(pest.y - pr.y) < 30) { hit = pest; break; }
      }
      if (hit) {
        damagePest(game, hit, pr.dmg, true);
        spawnBurst(game.particles, hit.x, hit.y, '#dfe9c9', 4, 60);
        game.projectiles.splice(i, 1);
        continue;
      }
      if (pr.x > 1300) game.projectiles.splice(i, 1);
    } else if (pr.kind === 'spore') {
      pr.t += dt / pr.dur;
      if (pr.t >= 1) {
        // Burst: splash everything near the landing point.
        spawnBurst(game.particles, pr.tx, pr.ty, '#c78bfa', 18, 140);
        for (const pest of game.pests) {
          if (Math.hypot(pest.x - pr.tx, pest.y - pr.ty) < pr.splash) {
            damagePest(game, pest, pr.dmg, false);
          }
        }
        game.projectiles.splice(i, 1);
        continue;
      }
      // Arc: lerp along x/y with a height hump.
      const t = pr.t;
      // (stored start in sx/sy on first tick)
      if (pr.sx === undefined) { pr.sx = pr.x; pr.sy = pr.y; }
      pr.x = pr.sx + (pr.tx - pr.sx) * t;
      pr.y = pr.sy + (pr.ty - pr.sy) * t - Math.sin(t * Math.PI) * 70;
    }
  }
}

// --- Main update -----------------------------------------------------------

export function update(game, dt) {
  game.time += dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 22);
  if (game.flash > 0) game.flash -= dt;
  if (game.waveBanner > 0) game.waveBanner -= dt;
  updateParticles(game.particles, game.floats, dt);

  if (game.mode !== 'play' || game.paused) return;
  game.stats.time += dt;

  // Spawn queue.
  if (game.waveActive && game.spawnQueue.length > 0) {
    game.spawnTimer += dt;
    while (game.spawnQueue.length > 0 && game.spawnQueue[0].at <= game.spawnTimer) {
      const s = game.spawnQueue.shift();
      game.pests.push(makePest(s.type, s.row, game.rng, game.season));
      game.waveSpawned++;
    }
  }

  updatePlants(game, dt);
  updatePests(game, dt);
  updateProjectiles(game, dt);
  sweepPlants(game);
  sweepPests(game);

  // Wave cleared: queue empty, no pests left.
  if (game.waveActive && game.spawnQueue.length === 0 && game.pests.length === 0) {
    endWave(game);
  }
}

// --- Click routing ---------------------------------------------------------

export function clickAt(game, x, y) {
  if (game.mode === 'title') {
    startRun(game);
    return;
  }
  if (game.mode === 'win' || game.mode === 'lose') {
    // Any click on an end screen restarts the run.
    const fresh = newGame(game.seed + 1);
    Object.assign(game, fresh);
    startRun(game);
    return;
  }
  if (game.mode === 'graft') {
    // Cards are drawn by render.js; their hit boxes are recomputed here.
    const cards = graftCardRects();
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        pickGraft(game, i);
        return;
      }
    }
    return;
  }
  // Play mode: seed bar first, then the grid.
  const seed = seedCardAt(x, y);
  if (seed) {
    game.selected = game.selected === seed ? null : seed;
    sfx.click();
    return;
  }
  if (y < 100) {
    // Top bar buttons: start wave / pause / mute live here.
    if (x >= 1010 && x <= 1130 && y >= 18 && y <= 58) { startWaveEarly(game); return; }
    if (x >= 1140 && x <= 1180 && y >= 18 && y <= 58) { game.paused = !game.paused; sfx.click(); return; }
    if (x >= 1190 && x <= 1230 && y >= 18 && y <= 58) { setMuted(!isMuted()); sfx.click(); return; }
    return;
  }
  const cell = cellAt(x, y);
  if (cell && game.selected) {
    plantSeed(game, cell.col, cell.row);
  } else if (cell) {
    // Clicking a planted cell without a seed selected deselects.
    game.selected = null;
  }
}

// Seed card rectangles, shared with render.js so clicks and drawing agree.
export function seedCardRects() {
  const rects = [];
  for (let i = 0; i < PLANT_ORDER.length; i++) {
    rects.push({ x: 208 + i * 108, y: 12, w: 100, h: 76, id: PLANT_ORDER[i] });
  }
  return rects;
}

export function seedCardAt(x, y) {
  for (const r of seedCardRects()) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
  }
  return null;
}

export function graftCardRects() {
  const rects = [];
  for (let i = 0; i < 3; i++) {
    rects.push({ x: 200 + i * 300, y: 250, w: 280, h: 240 });
  }
  return rects;
}

export function startRun(game) {
  game.mode = 'play';
  game.wave = 0;
  game.season = 0;
  game.waveActive = false;
  sfx.click();
}
