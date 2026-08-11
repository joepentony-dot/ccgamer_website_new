import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'data', 'zzap64-game-reviews');
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));
const reviewIndex = JSON.parse(fs.readFileSync(path.join(root, 'data', 'zzap64-review-links.json'), 'utf8'));

function loadGames() {
  const games = {};
  manifest.chunks.forEach((chunk) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, chunk), 'utf8'));
    Object.assign(games, parsed.games || {});
  });
  return games;
}

const games = loadGames();

function scans(slug) {
  return (games[slug] || []).map((row) => `${row[0]}|${row[1]}`);
}

function systemKey(value) {
  return String(value || '').toLowerCase().includes('amiga') ? 'amiga' : 'c64';
}

function awardIssueKeys() {
  const keys = new Set();
  Object.entries(reviewIndex.entries || {}).forEach(([key, row]) => {
    if (!row || row.scope === 'game-review' || !row.gameSlug) return;
    const issue = Number(row.issue);
    if (!Number.isInteger(issue) || issue < 1) return;
    const parts = key.split('|');
    keys.add(`${row.gameSlug}|${systemKey(row.gameSystem || parts[2])}|${issue}`);
  });
  return keys;
}

const excludedAwards = awardIssueKeys();

function browserScans(slug) {
  const byIssue = new Map();
  (games[slug] || []).forEach((row) => {
    const [issue, page, code] = row;
    const system = code === 'a' ? 'amiga' : 'c64';
    if (excludedAwards.has(`${slug}|${system}|${issue}`)) return;
    const key = `${system}|${issue}`;
    const existing = byIssue.get(key);
    if (!existing || page < existing[1]) byIssue.set(key, row);
  });
  return Array.from(byIssue.values())
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((row) => `${row[0]}|${row[1]}`);
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
  assert.deepEqual(scans('caveman-ugh-lympics'), ['45|28', '70|63']);
});

test('Rambo title mismatch resolves to the CCG slug with both reviews in the full dataset', () => {
  assert.deepEqual(scans('rambo-first-blood-part-2'), ['10|23', '53|58']);
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

test('browser projection removes award-index duplication but preserves genuine re-reviews', () => {
  assert.ok(excludedAwards.size > 0, 'Expected linked award issues to be available for browser filtering.');
  assert.ok(!browserScans('elite').includes('1|16'), 'Elite award review must not be repeated below the award index.');
  assert.ok(browserScans('rambo-first-blood-part-2').includes('10|23'), 'Rambo original non-award review should remain in additional reviews.');
  assert.ok(!browserScans('rambo-first-blood-part-2').includes('53|58'), 'Rambo Silver Medal review must not be repeated below the award index.');
});

test('browser projection collapses same-game same-platform same-issue scan pages to one review card', () => {
  Object.entries(games).forEach(([slug, rows]) => {
    const projected = browserScans(slug);
    const issueKeys = new Set();
    projected.forEach((scan) => {
      const [issueText] = scan.split('|');
      const matchingRows = rows.filter((row) => String(row[0]) === issueText && !excludedAwards.has(`${slug}|${row[2] === 'a' ? 'amiga' : 'c64'}|${row[0]}`));
      if (!matchingRows.length) return;
      const system = matchingRows[0][2] === 'a' ? 'amiga' : 'c64';
      const key = `${system}|${issueText}`;
      assert.ok(!issueKeys.has(key), `${slug} repeats ${key} in browser projection`);
      issueKeys.add(key);
    });
  });
});

test('front-end review features reuse the full compact dataset and filter awards lazily', () => {
  const browser = fs.readFileSync(path.join(root, 'js/zzap64-review-browser.js'), 'utf8');
  const linkFix = fs.readFileSync(path.join(root, 'js/zzap64-game-link-fix.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'js/magazine-game-reviews-runtime.js'), 'utf8');
  const schema = fs.readFileSync(path.join(root, 'js/ccg-schema.js'), 'utf8');

  assert.match(browser, /\/data\/zzap64-game-reviews\//);
  assert.match(browser, /\/data\/zzap64-review-links\.json/);
  assert.match(browser, /row\.scope === "game-review"/);
  assert.match(browser, /function awardIssueKey\(/);
  assert.match(browser, /recordsByReview/);
  assert.match(linkFix, /\/data\/zzap64-game-reviews\//);
  assert.match(runtime, /\/data\/zzap64-game-reviews\//);
  assert.match(runtime, /gameLemonLinks/);
  assert.match(schema, /magazine-game-reviews-runtime\.js/);
});
