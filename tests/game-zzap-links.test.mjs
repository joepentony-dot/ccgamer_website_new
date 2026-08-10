import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const matcher = require('../js/ccg-zzap64-matcher.js');
const games = JSON.parse(fs.readFileSync('games/games.json', 'utf8'));
const reviewIndex = JSON.parse(fs.readFileSync('data/zzap64-review-links.json', 'utf8'));
const gameJs = fs.readFileSync('js/load-single-game.js', 'utf8');
const publisherHtml = fs.readFileSync('admin/content-publisher.html', 'utf8');
const publisherJs = fs.readFileSync('admin/js/content-publisher.js', 'utf8');

function reviewEntries() {
  return Object.entries(reviewIndex.entries || {}).map(([key, row]) => {
    const [year, month, system, ...titleParts] = key.split('|');
    return {
      year: Number(year),
      month,
      system: system === 'amiga' ? 'Amiga' : 'C64',
      title: titleParts.join('|'),
      ...row
    };
  });
}

test('current Zzap review index contains direct page links only', () => {
  const rows = Object.values(reviewIndex.entries || {});
  assert.ok(rows.length > 0);
  assert.equal(reviewIndex.totals?.issueFallbacks, 0);
  rows.forEach((row) => {
    assert.equal(row.precision, 'page');
    assert.match(String(row.url || ''), /^https:\/\/www\.zzap64\.co\.uk\/cgi-bin\/displaypage\.pl\?issue=\d+&page=\d+$/);
  });
});

test('Barry McGuigan game can resolve its Zzap review through the shared matcher', () => {
  const barry = games.find((game) => String(game?.slug || '') === 'barry-mcguigan-world-championship-boxing')
    || games.find((game) => /barry mcguigan/i.test(String(game?.title || '')));
  assert.ok(barry, 'Barry McGuigan game is present in games.json');

  const matches = matcher.findAwardsForGame(barry, reviewEntries(), [barry])
    .filter((row) => row.precision === 'page' && row.url);
  assert.ok(matches.length > 0, 'Barry McGuigan has at least one direct Zzap review page');
});

test('game runtime supports automatic, lightweight and optional Zzap review links', () => {
  assert.match(gameJs, /\/data\/zzap64-review-links\.json/);
  assert.match(gameJs, /ccg-zzap64-matcher\.js/);
  assert.match(gameJs, /findAwardsForGame\(game, entries, \[game\]\)/);
  assert.match(gameJs, /resolveZzapLinks/);
  assert.match(gameJs, /ZZAP!64 REVIEW/);
  assert.match(gameJs, /game-reading-card/);
});

test('Content Publisher offers an optional direct Zzap review URL', () => {
  assert.match(publisherHtml, /data-game-field="zzapUrl"/);
  assert.match(publisherHtml, /Zzap!64 review URL \(optional\)/i);
  assert.match(publisherHtml, /Leave blank if Zzap!64 did not review the game/i);
  assert.match(publisherJs, /zzap:\s*gameValue\('zzapUrl'\)/);
  assert.match(publisherJs, /isValidZzapReviewUrl/);
});
