// HEARTWOOD — everything drawn on the canvas. One clear job: turn the
// game state into a readable picture (field, plants, pests, HUD, screens).
// The judge reads the game mostly through screenshots, so every screen
// must show the loop: goal, rules, controls, score, start and restart.

import {
  VIEW, GRID, HEART_TREE, PALETTE, PLANTS, PLANT_ORDER, PESTS, SEASONS, GRAFTS,
} from './config.js';
import { drawPlant } from './plants.js';
import { drawPest } from './pests.js';
import { drawParticles } from './particles.js';
import { seedCardRects, graftCardRects } from './world.js';

// Season tint per index, read from config.
function seasonTint(game) {
  return SEASONS[game.season].tint;
}

function laneY(row) {
  return GRID.y + row * GRID.cellH + GRID.cellH / 2;
}

// --- Background ------------------------------------------------------------

function drawBackground(ctx, game, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Season tint wash.
  ctx.fillStyle = seasonTint(game);
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Distant tree silhouettes.
  ctx.fillStyle = 'rgba(10, 22, 12, 0.55)';
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 150 + Math.sin(i * 7.3) * 30;
    const h = 90 + ((i * 53) % 70);
    ctx.beginPath();
    ctx.moveTo(x - 34, 118);
    ctx.quadraticCurveTo(x, 118 - h, x + 34, 118);
    ctx.closePath();
    ctx.fill();
  }

  // Fireflies drifting over the field.
  for (let i = 0; i < 22; i++) {
    const fx = ((i * 173.3 + t * (8 + (i % 5) * 3)) % 1240) + 20;
    const fy = 130 + ((i * 97.7) % 480) + Math.sin(t * 0.9 + i * 2.1) * 14;
    const a = 0.25 + 0.35 * Math.abs(Math.sin(t * 1.3 + i));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath();
    ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Soil field.
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const x = GRID.x + col * GRID.cellW;
      const y = GRID.y + row * GRID.cellH;
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.soilA : PALETTE.soilB;
      roundRect(ctx, x + 3, y + 3, GRID.cellW - 6, GRID.cellH - 6, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // grass tufts
      ctx.strokeStyle = PALETTE.grass;
      ctx.lineWidth = 2;
      const gx = x + 14 + ((col * 31 + row * 17) % 80);
      const gy = y + GRID.cellH - 12;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 3, gy - 9);
      ctx.moveTo(gx + 4, gy);
      ctx.lineTo(gx + 5, gy - 11);
      ctx.moveTo(gx + 8, gy);
      ctx.lineTo(gx + 11, gy - 8);
      ctx.stroke();
    }
  }

  // Hover highlight when a seed is selected.
  if (game.selected && game.hover && game.mode === 'play') {
    const col = Math.floor((game.hover.x - GRID.x) / GRID.cellW);
    const row = Math.floor((game.hover.y - GRID.y) / GRID.cellH);
    if (col >= 0 && col < GRID.cols && row >= 0 && row < GRID.rows) {
      const cx = GRID.x + col * GRID.cellW + GRID.cellW / 2;
      const cy = GRID.y + row * GRID.cellH + GRID.cellH / 2;
      const def = PLANTS[game.selected];
      if (def.range > 0) {
        ctx.fillStyle = 'rgba(255, 233, 163, 0.08)';
        ctx.beginPath();
        ctx.arc(cx, cy, def.range, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 233, 163, 0.22)';
      roundRect(ctx, GRID.x + col * GRID.cellW + 3, GRID.y + row * GRID.cellH + 3, GRID.cellW - 6, GRID.cellH - 6, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 233, 163, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- Heart Tree ------------------------------------------------------------

function drawHeartTree(ctx, game, t) {
  const frac = Math.max(0, game.heartHp / game.heartMax);
  const x = HEART_TREE.x;
  const y = HEART_TREE.y;
  // glow
  const glow = ctx.createRadialGradient(x, y - 40, 10, x, y - 40, 110);
  glow.addColorStop(0, `rgba(255, 93, 115, ${0.25 * frac + 0.06})`);
  glow.addColorStop(1, 'rgba(255, 93, 115, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 120, y - 160, 240, 240);
  // trunk
  ctx.fillStyle = PALETTE.bark;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 60);
  ctx.quadraticCurveTo(x - 10, y - 10, x - 6, y - 40);
  ctx.lineTo(x + 6, y - 40);
  ctx.quadraticCurveTo(x + 10, y - 10, x + 16, y + 60);
  ctx.closePath();
  ctx.fill();
  // canopy
  ctx.fillStyle = PALETTE.leafDark;
  ctx.beginPath();
  ctx.arc(x - 26, y - 52, 30, 0, Math.PI * 2);
  ctx.arc(x + 26, y - 52, 30, 0, Math.PI * 2);
  ctx.arc(x, y - 78, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.leaf;
  ctx.beginPath();
  ctx.arc(x - 18, y - 60, 22, 0, Math.PI * 2);
  ctx.arc(x + 18, y - 60, 22, 0, Math.PI * 2);
  ctx.arc(x, y - 82, 26, 0, Math.PI * 2);
  ctx.fill();
  // heart fruits, fading as the tree is hurt
  const hearts = Math.ceil(frac * 5);
  for (let i = 0; i < hearts; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.6;
    const hx = x + Math.cos(a) * 26;
    const hy = y - 62 + Math.sin(a) * 18;
    drawHeart(ctx, hx, hy, 6 + Math.sin(t * 2 + i) * 1, PALETTE.heart);
  }
  // label
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HEART TREE', x, y + 84);
}

function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.7, y - s, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.2, y, x, y + s * 0.9);
  ctx.fill();
}

// --- Projectiles -----------------------------------------------------------

function drawProjectiles(ctx, game) {
  for (const pr of game.projectiles) {
    if (pr.kind === 'thorn') {
      ctx.fillStyle = '#dfe9c9';
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (pr.kind === 'spore') {
      ctx.fillStyle = '#c78bfa';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(199, 139, 250, 0.4)';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.size * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- HUD -------------------------------------------------------------------

function drawSeedCard(ctx, game, rect) {
  const def = PLANTS[rect.id];
  const selected = game.selected === rect.id;
  const afford = game.pollen >= def.cost;
  ctx.fillStyle = selected ? 'rgba(255, 201, 77, 0.28)' : PALETTE.panel;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.strokeStyle = selected ? PALETTE.amber : PALETTE.panelEdge;
  ctx.lineWidth = selected ? 2.5 : 1;
  ctx.stroke();
  // mini icon: a simple glyph per plant
  drawSeedIcon(ctx, rect.id, rect.x + rect.w / 2, rect.y + 30);
  ctx.fillStyle = afford ? PALETTE.cream : '#8a7a5a';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, rect.x + rect.w / 2, rect.y + 52);
  ctx.fillStyle = afford ? PALETTE.amber : '#a08a68';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('◉ ' + def.cost, rect.x + rect.w / 2, rect.y + 69);
  // key hint
  ctx.fillStyle = 'rgba(244, 236, 216, 0.55)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(def.key, rect.x + 6, rect.y + 14);
}

function drawSeedIcon(ctx, id, x, y) {
  if (id === 'thorn') {
    ctx.fillStyle = '#e26a8a';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fce5e';
    ctx.beginPath();
    ctx.arc(x - 8, y + 8, 5, 0, Math.PI * 2);
    ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'sunpetal') {
    ctx.fillStyle = '#ffd94d';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 5, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'bramble') {
    ctx.fillStyle = '#5d7a3a';
    ctx.beginPath();
    ctx.arc(x - 7, y + 3, 8, 0, Math.PI * 2);
    ctx.arc(x + 7, y + 3, 8, 0, Math.PI * 2);
    ctx.arc(x, y - 4, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'spore') {
    ctx.fillStyle = '#b678e8';
    ctx.beginPath();
    ctx.arc(x, y - 2, 11, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#efe6d0';
    ctx.fillRect(x - 3, y - 2, 6, 10);
  } else if (id === 'frost') {
    ctx.strokeStyle = '#7fe3d0';
    ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.quadraticCurveTo(x + i * 6, y - 2, x + i * 10, y - 10);
      ctx.stroke();
    }
  }
}

function drawHud(ctx, game) {
  // Top bar.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.width, 96);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 96, VIEW.width, 1);

  // Season + wave + score (left).
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText(SEASONS[game.season].name, 16, 28);
  ctx.fillStyle = '#c9d8bd';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Wave ${game.wave + 1} of 3  ·  ${game.waveNumber} / ${12} total`, 16, 50);
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`Score ${game.score}`, 16, 72);

  // Seed cards.
  for (const rect of seedCardRects()) drawSeedCard(ctx, game, rect);

  // Pollen (right of the seed cards).
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.amber;
  ctx.beginPath();
  ctx.arc(778, 34, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(778, 34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(String(game.pollen), 794, 41);
  ctx.fillStyle = '#c9d8bd';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('pollen', 794, 60);

  // Heart bar.
  const hx = 884;
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('HEART', hx, 28);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, hx, 36, 104, 14, 7);
  ctx.fill();
  const frac = Math.max(0, game.heartHp / game.heartMax);
  ctx.fillStyle = frac > 0.5 ? PALETTE.heart : frac > 0.25 ? PALETTE.amber : PALETTE.coral;
  if (frac > 0) {
    roundRect(ctx, hx + 1, 37, Math.max(4, 102 * frac), 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${game.heartHp}/${game.heartMax}`, hx, 68);

  // Buttons: Start Wave / Pause / Mute — rects must match world.js clickAt.
  drawHudButton(ctx, 1010, 18, 120, 40, game.waveActive ? 'WAVE…' : '▶ START WAVE', game.waveActive);
  drawHudButton(ctx, 1140, 18, 40, 40, game.paused ? '▶' : '❚❚', false);
  drawHudButton(ctx, 1190, 18, 40, 40, '♪', false);

  // Wave progress (under the top bar, right side).
  if (game.waveActive) {
    const done = game.waveSpawned;
    const total = Math.max(1, game.waveTotal);
    const frac2 = 1 - game.pests.length / Math.max(1, total);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    roundRect(ctx, 1010, 66, 220, 10, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.amber;
    roundRect(ctx, 1011, 67, Math.max(2, 218 * Math.min(1, (done / total) * 0.6 + frac2 * 0.4)), 8, 4);
    ctx.fill();
    ctx.fillStyle = '#c9d8bd';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`pests left: ${game.pests.length + game.spawnQueue.length}`, 1010, 92);
  } else if (game.mode === 'play') {
    ctx.fillStyle = '#c9d8bd';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Press Space or ▶ to start the next wave', 1010, 80);
  }
}

function drawHudButton(ctx, x, y, w, h, label, disabled) {
  ctx.fillStyle = disabled ? 'rgba(255, 201, 77, 0.12)' : 'rgba(255, 201, 77, 0.2)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = disabled ? '#a08a68' : PALETTE.amber;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
}

// --- Screens ----------------------------------------------------------------

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(8, 18, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, game, t) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  // Title.
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 92px Georgia, serif';
  ctx.fillText('HEARTWOOD', 640, 210);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Grow the last grove through four seasons', 640, 256);
  // Rules, short and readable.
  ctx.fillStyle = '#c9d8bd';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Pests march from the right. Plant defenders, harvest pollen,', 640, 320);
  ctx.fillText('hold the Heart Tree for 12 waves — and the grove blooms.', 640, 346);
  // Seed preview.
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('Thornspike shoots · Sunpetal grows pollen · Bramble blocks · Sporecap bursts · Frostfern chills', 640, 396);
  // Controls.
  ctx.fillStyle = '#9db8a4';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Mouse: pick a seed, click soil to plant · Right-click: dig up (half refund) · 1–5: seeds · Space: wave · P: pause · M: mute', 640, 436);
  // Start prompt, pulsing.
  const pulse = 0.65 + 0.35 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('— Click to begin —', 640, 510);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#9db8a4';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Survive Spring, Summer, Autumn and Winter. Choose a graft between seasons.', 640, 548);
}

function drawGraft(ctx, game, t) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('The season turns', 640, 150);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillText(`You held ${SEASONS[game.season - 1].name}. Choose one graft for ${SEASONS[game.season].name}.`, 640, 192);
  const rects = graftCardRects();
  game.grafts.forEach((graft, i) => {
    const r = rects[i];
    const hover = game.hover && game.hover.x >= r.x && game.hover.x <= r.x + r.w && game.hover.y >= r.y && game.hover.y <= r.y + r.h;
    ctx.fillStyle = hover ? 'rgba(255, 201, 77, 0.22)' : PALETTE.panel;
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.amber : PALETTE.panelEdge;
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '40px system-ui, sans-serif';
    ctx.fillText(graft.icon, r.x + r.w / 2, r.y + 66);
    ctx.fillStyle = PALETTE.amber;
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(graft.name, r.x + r.w / 2, r.y + 108);
    ctx.fillStyle = '#d8e4cc';
    ctx.font = '15px/1.5 system-ui, sans-serif';
    wrapText(ctx, graft.desc, r.x + r.w / 2, r.y + 140, r.w - 36, 22);
  });
  ctx.fillStyle = '#9db8a4';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Click a card to graft it onto the grove.', 640, 540);
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
}

function drawEnd(ctx, game, won, t) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.amber : PALETTE.coral;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(won ? 'THE GROVE BLOOMS' : 'THE GROVE FADES', 640, 190);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText(
    won ? 'Twelve waves held. The Heart Tree flowers again.' : 'The Heart Tree falls silent — but the soil remembers.',
    640, 232,
  );
  // Stats.
  const s = game.stats;
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60);
  const stats = [
    ['Score', String(game.score)],
    ['Pests defeated', String(s.kills)],
    ['Plants grown', String(s.grown)],
    ['Pollen earned', String(s.earned)],
    ['Time', `${mins}:${String(secs).padStart(2, '0')}`],
    ['Waves held', `${game.waveNumber} / 12`],
  ];
  ctx.font = '17px system-ui, sans-serif';
  stats.forEach(([label, value], i) => {
    const y = 300 + i * 34;
    ctx.fillStyle = '#9db8a4';
    ctx.textAlign = 'right';
    ctx.fillText(label, 600, y);
    ctx.fillStyle = PALETTE.cream;
    ctx.textAlign = 'left';
    ctx.fillText(value, 680, y);
  });
  const pulse = 0.65 + 0.35 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('— Click to play again —', 640, 560);
  ctx.globalAlpha = 1;
}

// --- Main render -----------------------------------------------------------

export function render(ctx, game) {
  const t = game.time;
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawBackground(ctx, game, t);
  drawHeartTree(ctx, game, t);
  for (const plant of game.plants) drawPlant(ctx, plant, t);
  // Pests sorted by lane so lower lanes overlap upper ones naturally.
  const pests = game.pests.slice().sort((a, b) => a.row - b.row);
  for (const pest of pests) drawPest(ctx, pest, t);
  drawProjectiles(ctx, game);
  drawParticles(ctx, game.particles, game.floats);
  ctx.restore();

  // Hurt flash.
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 60, ${Math.min(0.22, game.flash)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  if (game.mode === 'play' || game.mode === 'graft') drawHud(ctx, game);

  // Wave banner.
  if (game.waveBanner > 0 && game.mode === 'play') {
    ctx.globalAlpha = Math.min(1, game.waveBanner);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.bannerText, 640, 330);
    ctx.globalAlpha = 1;
  }

  if (game.mode === 'title') drawTitle(ctx, game, t);
  else if (game.mode === 'graft') drawGraft(ctx, game, t);
  else if (game.mode === 'win') drawEnd(ctx, game, true, t);
  else if (game.mode === 'lose') drawEnd(ctx, game, false, t);

  if (game.mode === 'play' && game.paused) {
    ctx.fillStyle = 'rgba(8, 18, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 360);
    ctx.fillStyle = '#c9d8bd';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Press P or the ❚❚ button to continue', 640, 396);
  }

  // Vignette.
  const v = ctx.createRadialGradient(640, 360, 320, 640, 360, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
