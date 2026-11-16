// HEARTWOOD — deterministic random numbers (mulberry32). One clear job:
// every random choice in the game flows through one seeded generator, so a
// screenshot mode can replay the exact same field every time.

// Mulberry32: a tiny, fast, seedable PRNG with a good spread.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element of arr with the given rng.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Shuffle a copy of arr with the given rng (Fisher-Yates).
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Integer in [min, max] inclusive.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Float in [min, max).
export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}
