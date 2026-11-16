// HEARTWOOD — pests: spawning, walking, chewing, and drawing.
// One clear job: pest behavior (move left, stop to chew a plant or the
// Heart Tree, die with pollen) plus pest drawing.

import { PESTS, GRID, TREE_LINE_X } from './config.js';
import { cellCenter } from './input.js';
import { sfx } from './audio.js';
import { spawnBurst, spawnFloat } from './particles.js';

let pestSeq = 0;

// A fresh pest entering from the right on the given lane (row). Later
// seasons breed tougher pests: hit points scale with the season.
export function makePest(typeId, row, rng, seasonIdx) {
  const def = PESTS[typeId];
  const y = GRID.y + row * GRID.cellH + GRID.cellH / 2 + 8;
  const hpScale = 1 + 0.5 * (seasonIdx || 0);
  return {
    id: ++pestSeq,
    type: typeId,
    row,
    x: 1300 + (rng ? rng() * 60 : 0),
    y,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed,
    biteTimer: 0,
    slowUntil: 0,
    slowFactor: 0.5,
    flash: 0,
    walk: Math.random() * 10,
    chewing: false,
  };
}

// The plant (if any) directly in front of this pest's nose.
function plantAhead(game, pest) {
  for (const p of game.plants) {
    if (p.row !== pest.row) continue;
    const dx = p.x - pest.x;
    if (dx < -10 && dx > -GRID.cellW) return p;
  }
  return null;
}

export function updatePests(game, dt) {
  for (const pest of game.pests) {
    const def = PESTS[pest.type];
    pest.walk += dt * 6;
    if (pest.flash > 0) pest.flash -= dt;
    const slowed = game.time < pest.slowUntil;
    const speed = pest.speed * (slowed ? pest.slowFactor : 1);
    pest.chewing = false;

    // Flying pests ignore Bramble walls entirely.
    let blocker = plantAhead(game, pest);
    if (blocker && def.flies && blocker.type === 'bramble') blocker = null;

    if (blocker) {
      pest.chewing = true;
      pest.biteTimer -= dt;
      if (pest.biteTimer <= 0) {
        pest.biteTimer = def.biteEvery;
        blocker.hp -= def.bite;
        blocker.flash = 0.12;
        spawnBurst(game.particles, blocker.x, blocker.y - 10, '#c9a86a', 3, 50);
      }
      continue;
    }

    if (pest.x <= TREE_LINE_X) {
      // At the Heart Tree: the pest tears off one bite and vanishes in a
      // burst of blight. A leak costs the tree the pest's bite damage —
      // a few leaks are survivable, a flood is not.
      pest.chewing = true;
      pest.leaked = true;
      pest.hp = 0;
      game.heartHp -= def.bite;
      game.shake = Math.max(game.shake, 7);
      game.flash = 0.25;
      sfx.hurt();
      spawnBurst(game.particles, 150, pest.y, '#ff5d73', 8, 90);
      spawnFloat(game.floats, 150, pest.y - 30, `-${def.bite}`, '#ff8fa0');
      if (game.heartHp <= 0) {
        game.heartHp = 0;
        game.mode = 'lose';
        sfx.lose();
      }
      continue;
    }

    pest.x -= speed * dt;
  }
}

// Apply projectile damage and sweep dead pests. Returns kills this tick.
export function damagePest(game, pest, dmg, armoredHalved) {
  const def = PESTS[pest.type];
  let finalDmg = dmg;
  if (def.armored && armoredHalved) finalDmg = dmg * 0.5;
  pest.hp -= finalDmg;
  pest.flash = 0.1;
}

// Remove dead pests, pay out pollen + score, spawn feedback. Leaked pests
// (reached the Heart Tree) pay nothing — they already took their bite.
export function sweepPests(game) {
  let kills = 0;
  for (let i = game.pests.length - 1; i >= 0; i--) {
    const pest = game.pests[i];
    if (pest.hp > 0) continue;
    const def = PESTS[pest.type];
    if (pest.leaked) {
      spawnBurst(game.particles, pest.x, pest.y, '#5a3d24', 8, 70);
      game.pests.splice(i, 1);
      continue;
    }
    const gain = Math.round(def.pollen * (game.mods.pollen || 1));
    game.pollen += gain;
    game.score += def.score;
    game.stats.earned += gain;
    game.stats.kills++;
    kills++;
    spawnBurst(game.particles, pest.x, pest.y, def.color, 16, 130);
    spawnFloat(game.floats, pest.x, pest.y - 26, '+' + gain, '#ffe9a3');
    sfx.pop();
    game.pests.splice(i, 1);
  }
  return kills;
}

// --- Drawing ---------------------------------------------------------------

function drawLegs(ctx, x, y, r, t, walk, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    const s = Math.sin(walk + i * 1.7) * 4;
    ctx.beginPath();
    ctx.moveTo(x + i * r * 0.5, y + r * 0.5);
    ctx.lineTo(x + i * r * 0.5 + s, y + r + 6);
    ctx.stroke();
  }
}

function hpBar(ctx, pest) {
  if (pest.hp >= pest.maxHp) return;
  const w = 40;
  const frac = Math.max(0, pest.hp / pest.maxHp);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(pest.x - w / 2, pest.y - pestDefRadius(pest) - 16, w, 5);
  ctx.fillStyle = frac > 0.5 ? '#8fce5e' : frac > 0.25 ? '#ffc94d' : '#ff7a5c';
  ctx.fillRect(pest.x - w / 2 + 1, pest.y - pestDefRadius(pest) - 15, (w - 2) * frac, 3);
}

function pestDefRadius(pest) {
  return PESTS[pest.type].radius;
}

function drawAphid(ctx, pest, def, t) {
  const r = def.radius;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y + r + 2, r, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLegs(ctx, pest.x, pest.y, r, t, pest.walk, '#5d8a3e');
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(pest.x, pest.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.belly;
  ctx.beginPath();
  ctx.arc(pest.x - 3, pest.y + 3, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // antennae
  ctx.strokeStyle = '#5d8a3e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pest.x - r * 0.6, pest.y - r * 0.7);
  ctx.lineTo(pest.x - r - 4, pest.y - r - 8);
  ctx.moveTo(pest.x - r * 0.2, pest.y - r * 0.8);
  ctx.lineTo(pest.x - r * 0.4, pest.y - r - 10);
  ctx.stroke();
  // eyes
  ctx.fillStyle = '#1c2417';
  ctx.beginPath();
  ctx.arc(pest.x - r * 0.55, pest.y - r * 0.25, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeetle(ctx, pest, def, t) {
  const r = def.radius;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y + r + 2, r + 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLegs(ctx, pest.x, pest.y, r, t, pest.walk, '#2b2333');
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y, r + 3, r - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // shell shine + split
  ctx.fillStyle = def.belly;
  ctx.beginPath();
  ctx.ellipse(pest.x - 4, pest.y - 6, r * 0.55, r * 0.4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pest.x, pest.y - r + 3);
  ctx.lineTo(pest.x, pest.y + r - 3);
  ctx.stroke();
  // horns
  ctx.strokeStyle = '#2b2333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pest.x - r - 2, pest.y - 4);
  ctx.lineTo(pest.x - r - 10, pest.y - 12);
  ctx.moveTo(pest.x - r - 2, pest.y + 2);
  ctx.lineTo(pest.x - r - 9, pest.y + 8);
  ctx.stroke();
}

function drawWasp(ctx, pest, def, t) {
  const r = def.radius;
  const flap = Math.sin(t * 28 + pest.walk) * 0.5;
  // wings
  ctx.fillStyle = 'rgba(230, 240, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(pest.x + 2, pest.y - r - 4 + flap * 4, 12, 5, -0.6 + flap * 0.2, 0, Math.PI * 2);
  ctx.ellipse(pest.x + 6, pest.y - r - 2 - flap * 4, 10, 4, -0.4 - flap * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y + r + 2, r, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // striped body
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y, r + 2, r - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.belly;
  ctx.fillRect(pest.x - 2, pest.y - r + 2, 5, (r - 1) * 2);
  ctx.fillRect(pest.x + 6, pest.y - r + 4, 4, (r - 3) * 2);
  // stinger + eyes
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.moveTo(pest.x + r + 2, pest.y);
  ctx.lineTo(pest.x + r + 10, pest.y - 3);
  ctx.lineTo(pest.x + r + 10, pest.y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c2417';
  ctx.beginPath();
  ctx.arc(pest.x - r * 0.5, pest.y - 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoth(ctx, pest, def, t) {
  const r = def.radius;
  const flap = Math.sin(t * 10 + pest.walk) * 0.45;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y + r + 4, r, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // big pale wings
  ctx.fillStyle = def.color;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(pest.x, pest.y - 2);
    ctx.rotate(s * (0.5 + flap * 0.4));
    ctx.beginPath();
    ctx.ellipse(s * 14, -4, 15, 10, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#8f7fb8';
  ctx.beginPath();
  ctx.arc(pest.x - 8, pest.y - 8, 3, 0, Math.PI * 2);
  ctx.arc(pest.x + 8, pest.y - 8, 3, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = '#6b5a8a';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y, 7, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#ffe9a3';
  ctx.beginPath();
  ctx.arc(pest.x - 3, pest.y - r + 6, 2, 0, Math.PI * 2);
  ctx.arc(pest.x + 3, pest.y - r + 6, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnail(ctx, pest, def, t) {
  const r = def.radius;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y + r * 0.7, r + 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLegs(ctx, pest.x, pest.y + 4, r * 0.6, t, pest.walk * 0.4, '#8a5a3b');
  // shell with spiral
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(pest.x + 2, pest.y - 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a3b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pest.x + 2, pest.y - 2, r * 0.62, 0.5, 5.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pest.x + 2, pest.y - 2, r * 0.32, 1.2, 5.6);
  ctx.stroke();
  // body + eye stalks
  ctx.fillStyle = def.belly;
  ctx.beginPath();
  ctx.ellipse(pest.x - 4, pest.y + r * 0.55, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a3b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pest.x - r * 0.8, pest.y + r * 0.2);
  ctx.lineTo(pest.x - r - 6, pest.y - r * 0.5);
  ctx.moveTo(pest.x - r * 0.6, pest.y + r * 0.2);
  ctx.lineTo(pest.x - r - 2, pest.y - r * 0.6);
  ctx.stroke();
  ctx.fillStyle = '#1c2417';
  ctx.beginPath();
  ctx.arc(pest.x - r - 6, pest.y - r * 0.5, 2.4, 0, Math.PI * 2);
  ctx.arc(pest.x - r - 2, pest.y - r * 0.6, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawStag(ctx, pest, def, t) {
  const r = def.radius;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y + r + 4, r + 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLegs(ctx, pest.x, pest.y, r, t, pest.walk, '#241a24');
  // antlers
  ctx.strokeStyle = '#d9c9a3';
  ctx.lineWidth = 4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(pest.x - r * 0.4 + s * 8, pest.y - r * 0.7);
    ctx.quadraticCurveTo(pest.x - r + s * 14, pest.y - r * 1.5, pest.x - r - 6 + s * 10, pest.y - r * 1.9);
    ctx.moveTo(pest.x - r * 0.4 + s * 8, pest.y - r * 0.7);
    ctx.quadraticCurveTo(pest.x - r * 0.4 + s * 22, pest.y - r * 1.3, pest.x - r * 0.2 + s * 26, pest.y - r * 1.6);
    ctx.stroke();
  }
  // body
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.ellipse(pest.x, pest.y, r + 8, r - 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.belly;
  ctx.beginPath();
  ctx.ellipse(pest.x - 8, pest.y - 10, r * 0.6, r * 0.45, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // glowing blight eyes
  ctx.fillStyle = '#ff5d73';
  ctx.beginPath();
  ctx.arc(pest.x - r * 0.7, pest.y - 6, 4, 0, Math.PI * 2);
  ctx.arc(pest.x - r * 0.7, pest.y + 8, 3, 0, Math.PI * 2);
  ctx.fill();
  // blight glow
  ctx.fillStyle = 'rgba(255, 93, 115, 0.15)';
  ctx.beginPath();
  ctx.arc(pest.x, pest.y, r + 14 + Math.sin(t * 3) * 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPest(ctx, pest, t) {
  const def = PESTS[pest.type];
  // chill tint
  if (pest.type === 'aphid') drawAphid(ctx, pest, def, t);
  else if (pest.type === 'beetle') drawBeetle(ctx, pest, def, t);
  else if (pest.type === 'wasp') drawWasp(ctx, pest, def, t);
  else if (pest.type === 'moth') drawMoth(ctx, pest, def, t);
  else if (pest.type === 'snail') drawSnail(ctx, pest, def, t);
  else if (pest.type === 'stag') drawStag(ctx, pest, def, t);
  // hit flash
  if (pest.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, pest.flash * 5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pest.x, pest.y, def.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  hpBar(ctx, pest);
}
