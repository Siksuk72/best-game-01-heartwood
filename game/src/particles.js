// HEARTWOOD — particles and floating text. One clear job: short-lived
// visual feedback (petal bursts, pollen sparkles, damage numbers, dust)
// with no game logic inside.

export function spawnBurst(particles, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (speed || 90) * (0.4 + Math.random() * 0.8);
    particles.push({
      kind: 'dot',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      size: 2 + Math.random() * 3.5,
      color,
      gravity: 160,
    });
  }
}

export function spawnPetal(particles, x, y, color) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      kind: 'petal',
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 40,
      vy: -20 - Math.random() * 50,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 6,
      life: 0.8 + Math.random() * 0.5,
      maxLife: 1.3,
      size: 4 + Math.random() * 4,
      color,
      gravity: 60,
    });
  }
}

export function spawnFloat(floats, x, y, text, color) {
  floats.push({ x, y, text, color: color || '#ffe9a3', life: 1.1, maxLife: 1.1 });
}

export function updateParticles(particles, floats, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += (p.gravity || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.vr !== undefined) p.rot += p.vr * dt;
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
}

// Draw every particle and floating text. Called by render.js.
export function drawParticles(ctx, particles, floats) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.kind === 'petal') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const f of floats) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
