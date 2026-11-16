// HEARTWOOD — plants: what each kind does every tick, and how it looks.
// One clear job: plant behavior (shooting, generating pollen, blocking,
// chilling) plus plant drawing. Placement and economy live in world.js.

import { PLANTS, GRID } from './config.js';
import { cellCenter } from './input.js';
import { sfx } from './audio.js';
import { spawnBurst, spawnFloat, spawnPetal } from './particles.js';

// A fresh plant instance on the grid.
export function makePlant(typeId, col, row, mods) {
  const def = PLANTS[typeId];
  const maxHp = Math.round(def.hp * (mods.plantHp || 1));
  const c = cellCenter(col, row);
  return {
    type: typeId, col, row, x: c.x, y: c.y,
    hp: maxHp, maxHp,
    cooldown: 0, // seconds until next attack / generation
    anim: Math.random() * 10, // per-plant sway phase
    flash: 0, // hit flash timer
  };
}

export function plantAt(game, col, row) {
  for (const p of game.plants) {
    if (p.col === col && p.row === row) return p;
  }
  return null;
}

function damageOf(game, def) {
  return Math.round(def.damage * (game.mods.damage || 1) * (def.id === 'frost' && game.mods.frostbite ? 2 : 1));
}

function cooldownOf(game, def) {
  return def.cooldown / (game.mods.fireRate || 1);
}

// Nearest pest in the same lane, ahead of the plant, inside range.
function nearestInLane(game, plant, range) {
  let best = null;
  let bestX = Infinity;
  for (const pest of game.pests) {
    if (pest.row !== plant.row) continue;
    const dx = pest.x - plant.x;
    if (dx <= 0 || dx > range) continue;
    if (pest.x < bestX) { bestX = pest.x; best = pest; }
  }
  return best;
}

// Nearest pest in any lane within a radius.
function nearestAnywhere(game, plant, range) {
  let best = null;
  let bestD = Infinity;
  for (const pest of game.pests) {
    const dx = pest.x - plant.x;
    const dy = pest.y - plant.y;
    const d = Math.hypot(dx, dy);
    if (d > range) continue;
    if (d < bestD) { bestD = d; best = pest; }
  }
  return best;
}

// Tick every plant. dt is seconds. Projectiles and pollen go through game.
export function updatePlants(game, dt) {
  for (const plant of game.plants) {
    plant.anim += dt;
    if (plant.flash > 0) plant.flash -= dt;
    const def = PLANTS[plant.type];
    plant.cooldown -= dt;
    if (plant.cooldown > 0) continue;

    if (plant.type === 'thorn') {
      const target = nearestInLane(game, plant, def.range);
      if (!target) { plant.cooldown = 0.05; continue; }
      plant.cooldown = cooldownOf(game, def);
      game.projectiles.push({
        kind: 'thorn', x: plant.x + 26, y: plant.y - 6,
        vx: 620, vy: 0, dmg: damageOf(game, def), target,
        row: plant.row, size: 5,
      });
      sfx.shoot();
    } else if (plant.type === 'spore') {
      const target = nearestAnywhere(game, plant, def.range);
      if (!target) { plant.cooldown = 0.05; continue; }
      plant.cooldown = cooldownOf(game, def);
      game.projectiles.push({
        kind: 'spore', x: plant.x, y: plant.y - 22,
        tx: target.x, ty: target.y, t: 0, dur: 0.55,
        dmg: damageOf(game, def), splash: def.splash, size: 9,
      });
      sfx.spore();
    } else if (plant.type === 'sunpetal') {
      plant.cooldown = cooldownOf(game, def);
      const gain = Math.round(15 * (game.mods.pollen || 1));
      game.pollen += gain;
      game.stats.earned += gain;
      spawnFloat(game.floats, plant.x, plant.y - 34, '+' + gain + ' pollen', '#ffe9a3');
      spawnPetal(game.particles, plant.x, plant.y - 10, '#ffd94d');
      sfx.coin();
    } else if (plant.type === 'frost') {
      // Frostfern is an aura: it re-applies chill every tick while pests
      // are near, and nips them. The cooldown gates the nip damage.
      plant.cooldown = 0.4;
      const slow = game.mods.frostbite ? 0.65 : 0.5;
      for (const pest of game.pests) {
        const d = Math.hypot(pest.x - plant.x, pest.y - plant.y);
        if (d < def.range) {
          pest.slowUntil = game.time + 0.6;
          pest.slowFactor = slow;
          pest.hp -= damageOf(game, def) * dt * 2.5;
          pest.flash = 0.08;
        }
      }
    }
    // Bramble does nothing on its own — it is a wall pests chew.
  }
}

// Remove dead plants (hp <= 0). Returns how many died.
export function sweepPlants(game) {
  let died = 0;
  for (let i = game.plants.length - 1; i >= 0; i--) {
    if (game.plants[i].hp <= 0) {
      const p = game.plants[i];
      spawnBurst(game.particles, p.x, p.y, '#7fae4e', 14, 110);
      game.plants.splice(i, 1);
      died++;
    }
  }
  return died;
}

// --- Drawing ---------------------------------------------------------------

function drawThornspike(ctx, p, def, t) {
  const sway = Math.sin(t * 2 + p.anim) * 3;
  ctx.fillStyle = def.color;
  // stem
  ctx.strokeStyle = '#4c7a34';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + 18);
  ctx.quadraticCurveTo(p.x + sway, p.y - 6, p.x + sway, p.y - 22);
  ctx.stroke();
  // head: spiky rose
  ctx.fillStyle = '#e26a8a';
  ctx.beginPath();
  ctx.arc(p.x + sway, p.y - 26, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9db4';
  ctx.beginPath();
  ctx.arc(p.x + sway - 4, p.y - 29, 6, 0, Math.PI * 2);
  ctx.fill();
  // thorns
  ctx.fillStyle = '#dfe9c9';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(p.x + sway + s * 8, p.y - 8);
    ctx.lineTo(p.x + sway + s * 20, p.y - 12);
    ctx.lineTo(p.x + sway + s * 8, p.y - 2);
    ctx.closePath();
    ctx.fill();
  }
  // leaves
  ctx.fillStyle = '#5d8a3e';
  ctx.beginPath();
  ctx.ellipse(p.x - 12, p.y + 8, 12, 6, -0.5, 0, Math.PI * 2);
  ctx.ellipse(p.x + 12, p.y + 8, 12, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSunpetal(ctx, p, def, t) {
  const sway = Math.sin(t * 1.6 + p.anim) * 4;
  ctx.strokeStyle = '#4c7a34';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + 18);
  ctx.quadraticCurveTo(p.x + sway * 0.5, p.y - 4, p.x + sway, p.y - 20);
  ctx.stroke();
  const cx = p.x + sway;
  const cy = p.y - 28;
  // petals
  ctx.fillStyle = '#ffd94d';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.sin(t + p.anim) * 0.06;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 8, 4.5, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // face
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d2a12';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 2, 1.6, 0, Math.PI * 2);
  ctx.arc(cx + 3, cy - 2, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d2a12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawBramble(ctx, p, def, t) {
  ctx.fillStyle = '#5d7a3a';
  ctx.beginPath();
  ctx.arc(p.x - 12, p.y + 6, 14, 0, Math.PI * 2);
  ctx.arc(p.x + 12, p.y + 6, 14, 0, Math.PI * 2);
  ctx.arc(p.x, p.y - 6, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4c7a34';
  ctx.beginPath();
  ctx.arc(p.x - 6, p.y - 2, 10, 0, Math.PI * 2);
  ctx.arc(p.x + 8, p.y - 4, 9, 0, Math.PI * 2);
  ctx.fill();
  // thorns
  ctx.strokeStyle = '#dfe9c9';
  ctx.lineWidth = 2;
  for (const [dx, dy] of [[-18, -8], [18, -10], [0, -22], [-8, 4], [10, 2]]) {
    ctx.beginPath();
    ctx.moveTo(p.x + dx * 0.6, p.y + dy * 0.6 + 6);
    ctx.lineTo(p.x + dx, p.y + dy);
    ctx.stroke();
  }
}

function drawSporecap(ctx, p, def, t) {
  const bob = Math.sin(t * 2.4 + p.anim) * 2;
  // stem
  ctx.fillStyle = '#efe6d0';
  ctx.fillRect(p.x - 5, p.y - 6 + bob, 10, 24);
  // cap
  ctx.fillStyle = '#b678e8';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 8 + bob, 18, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8d5ff';
  for (const [dx, dy] of [[-10, -14], [0, -20], [10, -14]]) {
    ctx.beginPath();
    ctx.arc(p.x + dx, p.y + dy + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // glowing spores
  ctx.fillStyle = 'rgba(199, 139, 250, 0.8)';
  for (let i = 0; i < 3; i++) {
    const a = t * 1.5 + p.anim + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * 16, p.y - 14 + Math.sin(a) * 8 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFrostfern(ctx, p, def, t) {
  // chill aura
  ctx.fillStyle = 'rgba(127, 227, 208, 0.10)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(191, 233, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 52, 0, Math.PI * 2);
  ctx.stroke();
  // fern fronds
  ctx.strokeStyle = '#7fe3d0';
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    const sway = Math.sin(t * 2 + p.anim + i) * 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 16);
    ctx.quadraticCurveTo(p.x + i * 10 + sway, p.y - 6, p.x + i * 16 + sway, p.y - 26 - Math.abs(i) * -2);
    ctx.stroke();
  }
  // snowflakes
  ctx.fillStyle = '#eaf7ff';
  for (let i = 0; i < 4; i++) {
    const a = t * 0.8 + p.anim + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * 12, p.y - 8 + Math.sin(a) * 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlant(ctx, plant, t) {
  const def = PLANTS[plant.type];
  // shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(plant.x, plant.y + 20, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (plant.type === 'thorn') drawThornspike(ctx, plant, def, t);
  else if (plant.type === 'sunpetal') drawSunpetal(ctx, plant, def, t);
  else if (plant.type === 'bramble') drawBramble(ctx, plant, def, t);
  else if (plant.type === 'spore') drawSporecap(ctx, plant, def, t);
  else if (plant.type === 'frost') drawFrostfern(ctx, plant, def, t);
  // hit flash
  if (plant.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, plant.flash * 4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(plant.x, plant.y - 6, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // hp bar when hurt
  if (plant.hp < plant.maxHp) {
    const w = 44;
    const frac = Math.max(0, plant.hp / plant.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(plant.x - w / 2, plant.y - 48, w, 6);
    ctx.fillStyle = frac > 0.5 ? '#8fce5e' : frac > 0.25 ? '#ffc94d' : '#ff7a5c';
    ctx.fillRect(plant.x - w / 2 + 1, plant.y - 47, (w - 2) * frac, 4);
  }
}
