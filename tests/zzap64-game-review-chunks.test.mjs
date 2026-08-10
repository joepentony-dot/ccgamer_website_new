import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'data', 'zzap64-game-reviews');
const additionalDir = path.join(root, 'data', 'zzap64-additional-reviews');
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));
const additionalManifest = JSON.parse(fs.readFileSync(path.join(additionalDir, 'manifest.json'), 'utf8'));

function loadGames(directory, dataManifest) {
  const games = {};
  dataManifest.chunks.forEach((chunk) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(directory, chunk), 'utf8'));
    Object.assign(games, parsed.games || {});
  });
  return games;
}

const games = loadGames(dataDir, manifest);
const additionalGames = loadGames(additionalDir, additionalManifest);

function scans(collection, slug) {
  return (collection[slug] || []).map((row) => `${row[0]}|${row[1]}`);
}

test('compact review manifest matches the verified CCG-linked review set', () => {
  const recordCount = Object.values(games).reduce((total, rows) => total + rows.length, 0);
  assert.equal(manifest.totals.records, recordCount);
  assert.equal(manifest.totals.games, Object.keys(games).length);
  assert.equal(manifest.totals.records, 654);
  assert.equal(manifest.totals.games, 376);
  assert.equal(manifest.totals.sourceRecords, 871);
  assert.equal(manifest.totals.unmatched, 0);
});

test('Caveman Ugh-Lympics retains both Zzap reviews in the full game-page dataset', () => {
  assert.deepEqual(scans(games, 'caveman-ugh-lympics'), ['45|28', '70|63']);
});

test('Rambo title mismatch resolves to the CCG slug with both reviews in the full dataset', () => {
  assert.deepEqual(scans(games, 'rambo-first-blood-part-2'), ['10|23', '53|58']);
  assert.ok(games['rambo-first-blood-part-2'].every((row) => row[3] === 'Rambo: First Blood Part II'));
});

test('every compact review row is a unique direct issue/page scan for its CCG game', () => {
  Object.entries(games).forEach(([slug, rows]) => {
    assert.match(slug, /^[a-z0-9-]+$/);
    const unique = new Set();
    rows.forEach((row) => {
      assert.ok(Array.isArray(row) && row.length === 4, `${slug} contains an invalid compact row`);
      const [issue, page, system, title] = row;
      assert.ok(Number.isInteger(issue) && issue > 0, `${slug} has invalid issue`);
      assert.ok(Number.isInteger(page) && page > 0, `${slug} has invalid page`);
      assert.ok(system === 'c' || system === 'a', `${slug} has invalid platform code`);
      assert.ok(String(title).trim(), `${slug} has no display title`);
      const identity = `${issue}|${page}`;
      assert.ok(!unique.has(identity), `${slug} repeats ${identity}`);
      unique.add(identity);
    });
  });
});

test('additional browser dataset removes award-index duplication and same-issue scan-page duplication', () => {
  const recordCount = Object.values(additionalGames).reduce((total, rows) => total + rows.length, 0);
  assert.equal(additionalManifest.totals.records, recordCount);
  assert.equal(additionalManifest.totals.games, Object.keys(additionalGames).length);
  assert.ok(additionalManifest.totals.records < manifest.totals.records, 'Browser dataset should be smaller than the full linked-scan dataset.');
  assert.ok(additionalManifest.totals.excludedAwardIssueScans > 0, 'Award review scans should be excluded from the lower browser.');
  assert.ok(additionalManifest.totals.collapsedSameIssuePages > 0, 'Multi-page reviews should collapse to a single browser card per issue.');

  Object.entries(additionalGames).forEach(([slug, rows]) => {
    const issueKeys = new Set();
    rows.forEach((row) => {
      const key = `${row[2]}|${row[0]}`;
      assert.ok(!issueKeys.has(key), `${slug} repeats the same platform/issue in the browser dataset`);
      issueKeys.add(key);
    });
  });
});

test('award reviews stay above while genuine non-award reviews remain below', () => {
  assert.ok(!scans(additionalGames, 'elite').includes('1|16'), 'Elite award review must not be repeated below the award index.');
  assert.ok(scans(additionalGames, 'rambo-first-blood-part-2').includes('10|23'), 'Rambo original non-award review should remain in additional reviews.');
  assert.ok(!scans(additionalGames, 'rambo-first-blood-part-2').includes('53|58'), 'Rambo Silver Medal review must not be repeated below the award index.');
});

test('front-end review features use the correct compact datasets', () => {
  const browser = fs.readFileSync(path.join(root, 'js/zzap64-review-browser.js'), 'utf8');
  const linkFix = fs.readFileSync(path.join(root, 'js/zzap64-game-link-fix.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'js/zzap64-game-reviews-runtime.js'), 'utf8');
  const schema = fs.readFileSync(path.join(root, 'js/ccg-schema.js'), 'utf8');

  assert.match(browser, /\/data\/zzap64-additional-reviews\//);
  assert.match(linkFix, /\/data\/zzap64-game-reviews\//);
  assert.match(runtime, /\/data\/zzap64-game-reviews\//);
  assert.match(runtime, /gameLemonLinks/);
  assert.match(schema, /zzap64-game-reviews-runtime\.js/);
});
