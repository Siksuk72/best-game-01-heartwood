// HEARTWOOD — all sound is synthesized with WebAudio, no audio files.
// One clear job: tiny bleeps, pops and jingles, with a mute that persists.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) {
  muted = m;
}

export function isMuted() {
  return muted;
}

// A short oscillator blip: freq slides from f0 to f1 over dur seconds.
function blip(f0, f1, dur, type, vol) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// A soft noise burst (for pops and splats).
function noise(dur, vol, lowpass) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass || 1200;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol || 0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(t);
}

export const sfx = {
  shoot() { blip(620, 340, 0.08, 'square', 0.05); },
  spore() { blip(300, 140, 0.16, 'triangle', 0.09); },
  pop() { noise(0.09, 0.14, 900); blip(220, 60, 0.1, 'sine', 0.1); },
  plant() { blip(420, 700, 0.12, 'sine', 0.12); noise(0.05, 0.06, 2000); },
  coin() { blip(880, 1320, 0.1, 'sine', 0.09); },
  error() { blip(180, 120, 0.15, 'sawtooth', 0.08); },
  hurt() { blip(140, 70, 0.25, 'sawtooth', 0.14); noise(0.15, 0.1, 500); },
  horn() { blip(220, 330, 0.35, 'triangle', 0.12); blip(330, 440, 0.3, 'triangle', 0.08); },
  graft() { blip(523, 523, 0.1, 'sine', 0.1); setTimeout(() => blip(659, 659, 0.1, 'sine', 0.1), 90); setTimeout(() => blip(784, 784, 0.18, 'sine', 0.1), 180); },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, f, 0.28, 'triangle', 0.12), i * 130));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, f * 0.94, 0.3, 'triangle', 0.11), i * 160));
  },
  click() { blip(700, 900, 0.05, 'sine', 0.07); },
};
