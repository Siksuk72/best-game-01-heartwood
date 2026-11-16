// HEARTWOOD — static configuration: layout, plants, pests, seasons, grafts.
// One clear job: every number the rest of the game reads lives here, so tuning
// never touches logic.

export const VIEW = { width: 1280, height: 720 };

// Playfield: 5 lanes x 8 columns of soil. The Heart Tree stands at the left.
export const GRID = {
  x: 208, // left edge of column 0
  y: 118, // top edge of lane 0
  cols: 8,
  rows: 5,
  cellW: 122,
  cellH: 104,
};

export const HEART_TREE = { x: 118, y: 372, radius: 62 };

export const HUD = { height: 96 };

// Palette — one coherent dusk-grove look: deep greens, warm amber pollen,
// teal frost, coral pests. Every drawing file reads these, never literals.
export const PALETTE = {
  skyTop: '#0e2418',
  skyMid: '#1d3a24',
  skyBot: '#2c4a26',
  soilA: '#4a3520',
  soilB: '#3e2d1b',
  soilEdge: '#6b4e2e',
  grass: '#5d7a3a',
  leaf: '#7fae4e',
  leafDark: '#4c7a34',
  amber: '#ffc94d',
  amberDeep: '#e8a020',
  pollen: '#ffe9a3',
  teal: '#7fe3d0',
  frost: '#bfe9ff',
  coral: '#ff7a5c',
  bark: '#5a3d24',
  heart: '#ff5d73',
  cream: '#f4ecd8',
  ink: '#1c2417',
  panel: 'rgba(12, 26, 16, 0.82)',
  panelEdge: 'rgba(255, 201, 77, 0.35)',
};

// Plants the player can grow. cost is pollen. cooldown is seconds between
// attacks. range is pixels. hp is hit points.
export const PLANTS = {
  thorn: {
    id: 'thorn', name: 'Thornspike', key: '1', cost: 55, hp: 120,
    cooldown: 0.9, damage: 12, range: 460, color: '#8fce5e',
    desc: 'Shoots thorns down its lane. Your workhorse.',
  },
  sunpetal: {
    id: 'sunpetal', name: 'Sunpetal', key: '2', cost: 55, hp: 90,
    cooldown: 6, damage: 0, range: 0, color: '#ffc94d',
    desc: 'Grows +15 pollen every few seconds. Plant early.',
  },
  bramble: {
    id: 'bramble', name: 'Bramble', key: '3', cost: 30, hp: 300,
    cooldown: 0, damage: 0, range: 0, color: '#6a8f4f',
    desc: 'A thorny wall. Pests stop and chew it — flying pests ignore it.',
  },
  spore: {
    id: 'spore', name: 'Sporecap', key: '4', cost: 85, hp: 100,
    cooldown: 2.1, damage: 20, range: 520, splash: 78, color: '#c78bfa',
    desc: 'Lobs bursting spores. Splash damage, slow but wide.',
  },
  frost: {
    id: 'frost', name: 'Frostfern', key: '5', cost: 110, hp: 100,
    cooldown: 0, damage: 3, range: 170, color: '#7fe3d0',
    desc: 'Chills every pest nearby, slowing them. A little bite, too.',
  },
};

export const PLANT_ORDER = ['thorn', 'sunpetal', 'bramble', 'spore', 'frost'];

// Pests. speed is px per second. bite is damage per chew on a plant or the
// Heart Tree. flies means it ignores Bramble walls. armored halves thorn
// damage (spores still burst through).
export const PESTS = {
  aphid: {
    id: 'aphid', name: 'Aphid', hp: 52, speed: 28, bite: 5, biteEvery: 0.8,
    flies: false, armored: false, pollen: 9, score: 10, radius: 15,
    color: '#9ed06a', belly: '#c9ec9a',
  },
  beetle: {
    id: 'beetle', name: 'Beetle', hp: 175, speed: 17, bite: 12, biteEvery: 1.1,
    flies: false, armored: false, pollen: 16, score: 20, radius: 21,
    color: '#4a3b52', belly: '#7a6a8a',
  },
  wasp: {
    id: 'wasp', name: 'Wasp', hp: 68, speed: 40, bite: 9, biteEvery: 0.7,
    flies: true, armored: false, pollen: 13, score: 25, radius: 14,
    color: '#f2c230', belly: '#2b2b2b',
  },
  moth: {
    id: 'moth', name: 'Dusk Moth', hp: 105, speed: 30, bite: 10, biteEvery: 0.9,
    flies: true, armored: false, pollen: 15, score: 30, radius: 18,
    color: '#d9c9f2', belly: '#8f7fb8',
  },
  snail: {
    id: 'snail', name: 'Snail', hp: 400, speed: 10, bite: 18, biteEvery: 1.4,
    flies: false, armored: true, pollen: 25, score: 40, radius: 24,
    color: '#c98f5f', belly: '#8a5a3b',
  },
  stag: {
    id: 'stag', name: 'Blight Stag', hp: 2200, speed: 12, bite: 30, biteEvery: 1.2,
    flies: false, armored: true, pollen: 150, score: 300, radius: 44,
    color: '#3d2b3d', belly: '#6b4a6b',
  },
};

// Four seasons, three waves each. pool lists [pest, count] per wave; the
// wave builder spreads them out with jitter. The 12th wave carries the boss.
export const SEASONS = [
  {
    name: 'Spring', tint: 'rgba(140, 220, 130, 0.10)', sky: '#2c4a26',
    blurb: 'Aphids ride the first warm wind.',
    waves: [
      [['aphid', 8]],
      [['aphid', 12], ['beetle', 3]],
      [['aphid', 13], ['beetle', 6]],
    ],
  },
  {
    name: 'Summer', tint: 'rgba(255, 200, 80, 0.10)', sky: '#3a4423',
    blurb: 'Beetles march. Wasps hum overhead.',
    waves: [
      [['aphid', 10], ['beetle', 7], ['wasp', 3]],
      [['beetle', 11], ['wasp', 7], ['aphid', 8]],
      [['beetle', 13], ['wasp', 9], ['aphid', 10]],
    ],
  },
  {
    name: 'Autumn', tint: 'rgba(230, 140, 60, 0.12)', sky: '#402a1c',
    blurb: 'Snails grind forward. Moths own the dusk.',
    waves: [
      [['snail', 4], ['moth', 7], ['beetle', 7]],
      [['snail', 7], ['moth', 10], ['wasp', 6]],
      [['snail', 8], ['moth', 12], ['beetle', 8]],
    ],
  },
  {
    name: 'Winter', tint: 'rgba(150, 200, 255, 0.12)', sky: '#1d2a3a',
    blurb: 'Everything hungry comes at once. Then the Stag.',
    waves: [
      [['aphid', 16], ['beetle', 11], ['wasp', 10], ['moth', 9]],
      [['snail', 10], ['moth', 12], ['beetle', 12], ['wasp', 10]],
      [['stag', 1], ['snail', 9], ['moth', 10], ['beetle', 10]],
    ],
  },
];

// Grafts offered between seasons — pick one of three. Each changes the run.
export const GRAFTS = [
  {
    id: 'roots', name: 'Deep Roots', icon: '🌱',
    desc: 'Every plant gains +30% max health, and heals 30 now.',
  },
  {
    id: 'thorns', name: 'Sharp Thorns', icon: '🌹',
    desc: 'All plant damage +25%.',
  },
  {
    id: 'gold', name: 'Golden Pollen', icon: '✨',
    desc: 'All pollen income +50%.',
  },
  {
    id: 'sap', name: 'Swift Sap', icon: '💧',
    desc: 'All plants attack 20% faster.',
  },
  {
    id: 'frostbite', name: 'Frostbite', icon: '❄️',
    desc: 'Frost slows 65% instead of 50%, and bites twice as hard.',
  },
  {
    id: 'wind', name: 'Second Wind', icon: '💚',
    desc: 'The Heart Tree gains +20 max health and heals 20.',
  },
];

export const HEART_MAX = 100;
export const START_POLLEN = 150;
export const WAVE_CLEAR_BONUS = 100;
export const SEASON_CLEAR_BONUS = 250;
export const EARLY_START_BONUS = 25;
export const POLLEN_PER_KILL_BONUS = 0; // kills already drop their own pollen

// How far right of the grid pests appear, and where the tree line is.
export const SPAWN_X = 1300;
export const TREE_LINE_X = 176;
