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
// The page runtime inserts the Game Credits panel after fetching games.json.
// At tablet widths, that grows the first hero grid row and pushes down both
// artwork tiles. Publish the same source-owned credits before first paint.
const sourceGames = JSON.parse(fs.readFileSync(path.join(gamesDir, 'games.json'), 'utf8'));
if (!Array.isArray(sourceGames)) throw new Error('Expected an array of source games');
const gamesBySlug = new Map(sourceGames.map(game => [String(game?.slug || ''), game]));
function normaliseCreditValue(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    const cleaned = value.map(item => String(item || '').trim()).filter(Boolean);
    return cleaned.length ? cleaned.join(', ') : '';
  }
  return String(value || '').trim();
}
function normaliseCreditTokens(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .map(item => item.replace(/\s+/g, ' ').toLowerCase());
}
function tokensMatch(source, target) {
  if (!source.length || !target.length || source.length !== target.length) return false;
  const sourceSet = new Set(source);
  const targetSet = new Set(target);
  return sourceSet.size === targetSet.size &&
    Array.from(sourceSet).every(token => targetSet.has(token));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
function creditsMarkup(game) {
  if (!game) return '';
  const credits = (game.credits && typeof game.credits === 'object') ? game.credits : null;
  const publisherTokens = normaliseCreditTokens(credits?.publisher);
  const developerTokens = normaliseCreditTokens(credits?.developer ?? game.developer);
  const entries = [
    ['Publisher', publisherTokens.length ? normaliseCreditValue(credits?.publisher) : ''],
    ['Developer', developerTokens.length && !tokensMatch(publisherTokens, developerTokens)
      ? normaliseCreditValue(credits?.developer ?? game.developer) : ''],
    ['Producer', normaliseCreditValue(credits?.producer)],
    ['Programmer', normaliseCreditValue(credits?.coder)],
    ['Graphics', normaliseCreditValue(credits?.graphics)],
    ['Music', normaliseCreditValue(credits?.musician)],
    ['Re-release', normaliseCreditValue(credits?.re_releaser)]
  ].filter(([, value]) => value);
  if (!entries.length) return '';
  return [
    '<section class="ccg-behind-pixels-inline" data-ccg-credits-prefilled="true">',
    '    <h2 class="ccg-behind-pixels-inline__title">Game Credits</h2>',
    '    <dl class="ccg-behind-pixels-inline__list">',
    ...entries.map(([label, value]) =>
      '        <div class="ccg-behind-pixels-inline__item"><dt>' + escapeHtml(label) +
      '</dt><dd>' + escapeHtml(value) + '</dd></div>'),
    '    </dl>',
    '</section>'
  ].join('\n');
}

let changed = 0, eligible = 0, creditsEligible = 0, skipped = 0;
for (const slug of fs.readdirSync(gamesDir)) {
  if (!/^[a-z0-9-]+$/.test(slug)) continue;
  const file = path.join(gamesDir, slug, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('data-ccg-prefilled="true"') ||
      !content.includes('game-hero__box3d')) { skipped++; continue; }
  const names = [slug, slug[0].toUpperCase() + slug.slice(1), slug.toUpperCase()];
  const found = [...new Set(names)].find(name =>
    fs.existsSync(path.join(boxDir, name + '.webp')));
  if (!found) { skipped++; continue; }
  eligible++;
  const boxPath = '/resources/images/games/boxes-3d/' + found + '.webp';
  let next = content;
  const boxAlreadyPrefilled = content.includes('data-ccg-box3d-prefilled="true"');
  if (boxAlreadyPrefilled) {
    if (!content.includes('game-hero--has-box3d') ||
        !content.includes('src="' + boxPath + '"') ||
        content.includes('class="game-hero__box3d" hidden')) {
      throw new Error('Invalid existing first-paint 3D box prefill for ' + slug);
    }
  } else {
    const hero = '<section class="game-hero">';
    if (content.split(hero).length !== 2) throw new Error('Ambiguous hero ' + slug);
    if (content.split('class="game-hero__box3d" hidden').length !== 2) {
      throw new Error('Ambiguous box slot ' + slug);
    }
    next = next.replace(hero,
      '<section class="game-hero game-hero--has-box3d" data-ccg-box3d-prefilled="true">');
    next = next.replace('class="game-hero__box3d" hidden',
      'class="game-hero__box3d"');
    const imgTag = /(<img class="game-hero__box3d-img"\s*)(alt="")/;
    if (!imgTag.test(next)) throw new Error('Missing canonical box image ' + slug);
    next = next.replace(imgTag,
      '$1src="' + boxPath + '" alt="3D box artwork for ' + slug.replaceAll('-', ' ') + '"');
  }

  const credits = creditsMarkup(gamesBySlug.get(slug));
  const creditsAlreadyPrefilled = next.includes('data-ccg-credits-prefilled="true"');
  if (credits) {
    creditsEligible++;
    if (creditsAlreadyPrefilled) {
      if (!next.includes(credits)) throw new Error('Stale first-paint credits for ' + slug);
    } else {
      const actions = /<div class="game-hero__actions ccg-share"[^>]*>[\s\S]*?<\/div>/g;
      const matches = [...next.matchAll(actions)];
      if (matches.length !== 1) throw new Error('Ambiguous hero actions for ' + slug);
      next = next.replace(actions, match => match + '\n\n                    ' + credits);
    }
  } else if (creditsAlreadyPrefilled) {
    throw new Error('Stale credits found without source credits for ' + slug);
  }

  if (next !== content) {
    if (check) throw new Error('First-paint hero prefill missing for ' + slug);
    fs.writeFileSync(file, next);
    changed++;
  }
}
if (check && eligible === 0) throw new Error('No 3D box art found for staging verification');
console.log(JSON.stringify({ check, eligible, creditsEligible, changed, skipped }));
