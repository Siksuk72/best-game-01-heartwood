// HEARTWOOD — seasons and waves: what spawns, when, and the graft
// choices between seasons. One clear job: turn the season tables in
// config.js into a timed spawn queue, and roll graft offers.

import { SEASONS, GRAFTS, GRID } from './config.js';
import { shuffle, randFloat } from './random.js';

// Build the spawn queue for (seasonIdx, waveIdx): a list of
// { at (seconds after wave start), type, row }.
export function buildWave(seasonIdx, waveIdx, rng) {
  const season = SEASONS[seasonIdx];
  const spec = season.waves[waveIdx];
  const queue = [];
  let t = 1.0;
  for (const [type, count] of spec) {
    for (let i = 0; i < count; i++) {
      const row = Math.floor(rng() * GRID.rows);
      queue.push({ at: t, type, row });
      // Pests of one kind arrive in a loose pack, then a breather.
      t += randFloat(rng, 0.7, 1.6);
    }
    t += randFloat(rng, 1.5, 3.0);
  }
  // Shuffle the order a little so waves never feel identical, but keep the
  // first spawn early so the wave starts with action.
  const first = queue[0];
  const rest = shuffle(rng, queue.slice(1));
  rest.sort((a, b) => a.at - b.at);
  return first ? [first, ...rest] : rest;
}

// How many pests a wave contains (for the progress bar).
export function waveSize(seasonIdx, waveIdx) {
  return SEASONS[seasonIdx].waves[waveIdx].reduce((n, [, c]) => n + c, 0);
}

// Roll three distinct graft offers for the between-season screen.
export function rollGrafts(rng) {
  return shuffle(rng, GRAFTS).slice(0, 3);
}

export function seasonName(idx) {
  return SEASONS[idx].name;
}

export function seasonBlurb(idx) {
  return SEASONS[idx].blurb;
}

// Total waves in the whole run (4 seasons x 3 waves).
export const TOTAL_WAVES = SEASONS.length * 3;
