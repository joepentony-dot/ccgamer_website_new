#!/usr/bin/env node
/* Reserve verified 3D box art in the FIRST PAINT of published canonical
 * game pages. Runs only against the disposable Pages staging directory.
 * No game source, SEO, ratings, emulator links or editorial text is changed.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
const root = path.resolve(rootIndex >= 0 ? args[rootIndex + 1] : '_site');
const check = args.includes('--check');
const gamesDir = path.join(root, 'games');
const boxDir = path.join(root, 'resources', 'images', 'games', 'boxes-3d');
if (!fs.statSync(gamesDir).isDirectory() || !fs.statSync(boxDir).isDirectory()) {
  throw new Error('Missing staged games or 3D box-art directory');
}
let changed = 0, eligible = 0, skipped = 0;
for (const slug of fs.readdirSync(gamesDir)) {
  if (!/^[a-z0-9-]+$/.test(slug)) continue;
  const file = path.join(gamesDir, slug, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('data-ccg-prefilled="true"') ||
      !content.includes('class="game-hero__box3d" hidden')) { skipped++; continue; }
  const names = [slug, slug[0].toUpperCase() + slug.slice(1), slug.toUpperCase()];
  const found = [...new Set(names)].find(name =>
    fs.existsSync(path.join(boxDir, name + '.webp')));
  if (!found) { skipped++; continue; }
  eligible++;
  const boxPath = '/resources/images/games/boxes-3d/' + found + '.webp';
  const hero = '<section class="game-hero">';
  if (content.split(hero).length !== 2) throw new Error('Ambiguous hero ' + slug);
  if (content.split('class="game-hero__box3d" hidden').length !== 2) {
    throw new Error('Ambiguous box slot ' + slug);
  }
  let next = content.replace(hero,
    '<section class="game-hero game-hero--has-box3d" data-ccg-box3d-prefilled="true">');
  next = next.replace('class="game-hero__box3d" hidden',
    'class="game-hero__box3d"');
  const imgTag = /(<img class="game-hero__box3d-img"\s*)(alt="")/;
  if (!imgTag.test(next)) throw new Error('Missing canonical box image ' + slug);
  next = next.replace(imgTag,
    '$1src="' + boxPath + '" alt="3D box artwork for ' + slug.replaceAll('-', ' ') + '"');
  if (next !== content) {
    if (check) throw new Error('3D box first-paint prefill missing for ' + slug);
    fs.writeFileSync(file, next);
    changed++;
  }
}
if (check && eligible === 0) throw new Error('No 3D box art found for staging verification');
console.log(JSON.stringify({ check, eligible, changed, skipped }));
