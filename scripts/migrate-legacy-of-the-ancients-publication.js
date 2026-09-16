const fs = require('node:fs');
const path = require('node:path');

const gamesPath = path.join(process.cwd(), 'games', 'games.json');
const oldThumb = path.join(process.cwd(), 'resources', 'images', 'thumbnails', 'all', 'legacy-of-the-ancient.webp');
const newThumb = path.join(process.cwd(), 'resources', 'images', 'thumbnails', 'all', 'legacy-of-the-ancients.webp');
const lemonUrl = 'https://www.lemon64.com/game/legacy-of-the-ancients';

const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
const game = games.find((entry) => String(entry?.slug || '').toLowerCase() === 'legacy-of-the-ancients');

if (!game) {
  console.log('[legacy-publication-repair] Legacy of the Ancients is not present; nothing to migrate.');
  process.exit(0);
}

let changed = false;
const canonicalThumbnail = 'resources/images/thumbnails/all/legacy-of-the-ancients.webp';
if (game.thumbnail !== canonicalThumbnail) {
  game.thumbnail = canonicalThumbnail;
  changed = true;
}

if (!Array.isArray(game.lemon) || game.lemon.length !== 1 || game.lemon[0] !== lemonUrl) {
  game.lemon = [lemonUrl];
  changed = true;
}

if (fs.existsSync(oldThumb) && !fs.existsSync(newThumb)) {
  fs.renameSync(oldThumb, newThumb);
  console.log('[legacy-publication-repair] Renamed thumbnail to canonical plural slug.');
} else if (!fs.existsSync(newThumb)) {
  throw new Error('Neither the legacy thumbnail nor the canonical replacement exists. Refusing to leave a broken thumbnail path.');
}

if (changed) {
  fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`);
  console.log('[legacy-publication-repair] Source repaired with canonical thumbnail and verified Lemon64 source.');
} else {
  console.log('[legacy-publication-repair] Source already has the canonical thumbnail and verified Lemon64 source.');
}
