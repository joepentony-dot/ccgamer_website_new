#!/usr/bin/env node

import fs from 'node:fs';

const SLUG = 'legacy-of-the-ancients';
const LEMON_URL = 'https://www.lemon64.com/game/legacy-of-the-ancients';
const GAMES_PATH = 'games/games.json';
const PENDING_PATH = 'data/lemon-source-pending.json';
const OLD_THUMBNAIL = 'resources/images/thumbnails/all/legacy-of-the-ancient.webp';
const CANONICAL_THUMBNAIL = 'resources/images/thumbnails/all/legacy-of-the-ancients.webp';

const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
if (!Array.isArray(games)) throw new Error(`${GAMES_PATH} must contain an array.`);

const game = games.find((item) => item?.slug === SLUG);
if (!game) throw new Error(`Could not find ${SLUG} in ${GAMES_PATH}.`);

let gamesChanged = false;

if (game.thumbnail !== CANONICAL_THUMBNAIL) {
  game.thumbnail = CANONICAL_THUMBNAIL;
  gamesChanged = true;
}

const lemon = Array.isArray(game.lemon) ? game.lemon.filter(Boolean) : [];
if (lemon.length !== 1 || lemon[0] !== LEMON_URL) {
  game.lemon = [LEMON_URL];
  gamesChanged = true;
}

if (gamesChanged) {
  fs.writeFileSync(GAMES_PATH, `${JSON.stringify(games, null, 2)}\n`);
  console.log(`[legacy-repair] Updated ${GAMES_PATH}: canonical thumbnail + verified Lemon source.`);
} else {
  console.log('[legacy-repair] Legacy source fields already repaired.');
}

if (fs.existsSync(OLD_THUMBNAIL) && !fs.existsSync(CANONICAL_THUMBNAIL)) {
  fs.copyFileSync(OLD_THUMBNAIL, CANONICAL_THUMBNAIL);
  console.log(`[legacy-repair] Copied thumbnail to ${CANONICAL_THUMBNAIL}.`);
} else if (fs.existsSync(CANONICAL_THUMBNAIL)) {
  console.log('[legacy-repair] Canonical thumbnail already exists.');
} else {
  throw new Error(`Neither ${OLD_THUMBNAIL} nor ${CANONICAL_THUMBNAIL} exists.`);
}

if (fs.existsSync(PENDING_PATH)) {
  const pending = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'));
  if (!Array.isArray(pending)) throw new Error(`${PENDING_PATH} must contain an array.`);
  const next = pending.filter((slug) => slug !== SLUG);
  if (next.length !== pending.length) {
    fs.writeFileSync(PENDING_PATH, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`[legacy-repair] Removed ${SLUG} from unresolved Lemon source queue.`);
  }
}
