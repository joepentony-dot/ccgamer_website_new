import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const matcher = require('../js/ccg-zzap64-matcher.js');
const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url)));

test('all 286 actual award lookups preserve the independently compared 80 matches and 206 non-matches', () => {
  const games = read('games/games.json');
  const entries = [1985, 1986, 1987, 1988, 1989].flatMap(year => read(`data/zzap64-awards/${year}.json`));
  const start = performance.now();
  const index = matcher.buildGameIndex(games);
  const results = entries.map(entry => matcher.findGame(entry, index)?.slug || null);
  assert.equal(entries.length, 286);
  assert.equal(results.filter(Boolean).length, 80);
  // Recorded from the unmodified 3dea3c0532 matcher, including every null.
  assert.equal(createHash('sha256').update(JSON.stringify(results)).digest('hex'),
    'f17f00e95f5465aea9aaea31bf34c37cb9329a31c5f34f89cdf84f247949af66');
  // The browser converts tuple records before matching. Cover that real
  // path as well as the original offline comparison's raw-record input.
  const normalized = entries.map(raw => Array.isArray(raw)
    ? { title: raw[1], system: raw[4] || 'C64' }
    : { ...raw, title: raw.title || raw.game, system: raw.system || raw.platform || 'C64' });
  const browserResults = normalized.map(entry => matcher.findGame(entry, index)?.slug || null);
  assert.equal(browserResults.filter(Boolean).length, 138);
  assert.equal(createHash('sha256').update(JSON.stringify(browserResults)).digest('hex'),
    'ad0e47c9562e223edb1ccec5f701172a398f851fac3f45d6ca41c7acdaf9cf8e');
  console.log(`Actual catalogue index + 286 lookups: ${(performance.now() - start).toFixed(1)}ms`);
});

test('fuzzy cutoff retains original scoring, system penalties, ambiguity and legacy indexes', () => {
  const games = [
    { title: 'Alpha Galactic Defender', slug: 'alpha', system: 'C64' },
    { title: 'Alpha Galactic Defenders', slug: 'alphas', system: 'Amiga' },
    { title: 'Galactic Defender', slug: 'defender', system: 'C64' },
    { title: 'Nebular Warrior', slug: 'nebular', system: 'C64' },
    { title: 'Nebular Warriors', slug: 'nebulars', system: 'C64' },
  ];
  const index = matcher.buildGameIndex(games);
  const legacy = { games, byTitle: index.byTitle, byToken: index.byToken };
  for (const title of ['Alpha Galactic Defendr', 'Nebular Warior', 'Nebular Warriorr', 'Unrelated Game', 'Galactic Defender']) {
    for (const system of ['C64', 'Amiga', '']) {
      const entry = { title, system };
      // No exact variant in these typo fixtures: original exported scorer is
      // an independent oracle for the unchanged ranking/ambiguity contract.
      if (matcher.titleVariants(title).some(key => index.byTitle.has(key))) continue;
      const tokens = new Set(matcher.canonicalTitle(title).split(' ').filter(Boolean));
      const pool = new Set([...tokens].flatMap(token => index.byToken.get(token) || []));
      const ranked = (pool.size ? [...pool] : games)
        .map(game => ({ game, score: matcher.scoreGame(entry, game) }))
        .filter(item => item.score >= 92)
        .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title, 'en-GB'));
      const expected = !ranked.length || (ranked[0].score < 108 && ranked[1] && ranked[0].score - ranked[1].score < 7)
        ? null : ranked[0].game;
      assert.equal(matcher.findGame(entry, index), expected, `${title}/${system}`);
      assert.equal(matcher.findGame(entry, legacy), expected);
      assert.equal(matcher.findGame(entry, games), expected);
    }
  }
});
