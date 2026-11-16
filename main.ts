// HEARTWOOD — a best-game-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library,
// no network request). This program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// The game: a grove-defense game. Pests march from the right across five
// lanes; the player plants Thornspikes, Sunpetals, Brambles, Sporecups and
// Frostferns, harvests pollen, picks a graft between seasons, and holds the
// Heart Tree for 12 waves across Spring, Summer, Autumn and Winter.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Safety note learned the hard way: /output may be a bind-mounted directory
// the grader owns, so this program never deletes /output itself. It empties
// the contents of the game/ and screenshots/ folders inside it instead
// (emptyDirContents below), then copies fresh files in. Both runs of the
// program therefore write the same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Empty a directory's contents without removing the directory itself, so a
// bind-mounted /output (or a game/ folder inside it) is never deleted.
function emptyDirContents(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

mkdirSync(out, { recursive: true });
const outGame = join(out, 'game');
const outShots = join(out, 'screenshots');
mkdirSync(outGame, { recursive: true });
mkdirSync(outShots, { recursive: true });
emptyDirContents(outGame);
emptyDirContents(outShots);
cpSync(join(here, 'game'), outGame, { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), outShots, { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
