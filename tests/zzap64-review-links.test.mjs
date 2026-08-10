import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const generator = require('../scripts/generate-zzap64-review-links.js');
const root = path.resolve(import.meta.dirname, '..');
const years = generator.awardYears();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function awardEntries() {
  return years.flatMap((year) => {
    const parsed = readJson(`data/zzap64-awards/${year}.json`);
    const records = Array.isArray(parsed) ? parsed : (parsed.entries || parsed.awards || []);
    return records.map((raw) => Array.isArray(raw)
      ? { year, month: raw[0], title: raw[1], system: raw[4] || 'C64' }
      : {
          year: Number(raw.year || year),
          month: raw.month,
          title: raw.title || raw.game,
          system: raw.system || raw.platform || 'C64'
        });
  });
}

function rowsForGameSlug(data, slug) {
  return Object.values(data.entries || {}).filter((row) => row?.gameSlug === slug);
}

test('every Zzap award keeps its safe official magazine destination when all-game reviews are added', () => {
  const data = readJson('data/zzap64-review-links.json');
  const awards = awardEntries();

  assert.equal(data.totals.awards, awards.length);
  assert.ok(Object.keys(data.entries).length >= awards.length, 'The full review index may contain non-award reviews in addition to awards.');
  assert.equal(data.totals.issueFallbacks, 0, 'Every indexed award must resolve to a direct original Zzap!64 scan page.');
  assert.equal(data.totals.exactPages, awards.length);

  awards.forEach((entry) => {
    const key = generator.recordKey(entry);
    const record = data.entries[key];
    assert.ok(record, `Missing magazine link for ${key}`);
    assert.equal(record.issue, generator.issueNumber(entry.year, entry.month), `Wrong issue for ${key}`);

    const url = new URL(record.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'www.zzap64.co.uk');
    assert.equal(record.precision, 'page');
    assert.ok(Number.isInteger(record.page) && record.page > 0, `Invalid page for ${key}`);
    assert.equal(url.pathname, '/cgi-bin/displaypage.pl');
    assert.equal(Number(url.searchParams.get('issue')), record.issue);
    assert.equal(Number(url.searchParams.get('page')), record.page);
  });
});

test('The Eidolon resolves to the known February 1986 review page', () => {
  const data = readJson('data/zzap64-review-links.json');
  const key = '1986|february|c64|The Eidolon';
  const record = data.entries[key];

  assert.ok(record, 'The Eidolon magazine record is missing');
  assert.equal(record.precision, 'page');
  assert.equal(record.issue, 10);
  assert.equal(record.page, 28);
  assert.equal(record.url, 'https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=10&page=28');
});

test('Armalyte resolves to Zzap!64 issue 43 page 24', () => {
  const data = readJson('data/zzap64-review-links.json');
  const record = data.entries['1988|november|c64|Armalyte'];
  assert.ok(record);
  assert.equal(record.precision, 'page');
  assert.equal(record.issue, 43);
  assert.equal(record.page, 24);
  assert.equal(record.url, 'https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=43&page=24');
});

test('Caveman Ugh-Lympics exposes both its full-price and budget Zzap reviews', () => {
  const data = readJson('data/zzap64-review-links.json');
  const rows = rowsForGameSlug(data, 'caveman-ugh-lympics');
  const destinations = new Set(rows.map((row) => `${row.issue}|${row.page}`));

  assert.ok(destinations.has('45|28'), 'Missing Caveman Ugh-Lympics issue 45 page 28 review.');
  assert.ok(destinations.has('70|63'), 'Missing Caveman Ugh-Lympics issue 70 page 63 re-review.');
});

test('Rambo resolves both the original review and the later Silver Medal re-review to the CCG game', () => {
  const data = readJson('data/zzap64-review-links.json');
  const rows = rowsForGameSlug(data, 'rambo-first-blood-part-2');
  const destinations = new Set(rows.map((row) => `${row.issue}|${row.page}`));

  assert.ok(destinations.has('10|23'), 'Missing Rambo issue 10 page 23 original review.');
  assert.ok(destinations.has('53|58'), 'Missing Rambo issue 53 page 58 Silver Medal re-review.');
});

test('archive renderer exposes original-magazine links and conservative verified title aliases', () => {
  const source = fs.readFileSync(path.join(root, 'js/zzap64-awards.js'), 'utf8');
  const linkFix = fs.readFileSync(path.join(root, 'js/zzap64-game-link-fix.js'), 'utf8');
  const browser = fs.readFileSync(path.join(root, 'js/zzap64-review-browser.js'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'zzap64/index.html'), 'utf8');

  assert.match(source, /\/data\/zzap64-review-links\.json/);
  assert.match(source, /zzap-award-card__game-link/);
  assert.match(source, /zzap-award-card__magazine-link/);
  assert.match(source, /Read original Zzap!64 review/);
  assert.doesNotMatch(source, /Browse original Zzap!64 issue/);
  assert.match(source, /Original Zzap!64 scan pending verification/);
  assert.match(source, /noopener noreferrer external/);

  assert.match(linkFix, /gameLinkResolvedByAlias/);
  assert.match(linkFix, /VERIFIED_OVERRIDES/);
  assert.match(linkFix, /rambo\|53\|58/);
  assert.match(linkFix, /rambo-first-blood-part-2/);
  assert.match(linkFix, /issue\/page identity alone must never be used/i);
  assert.doesNotMatch(linkFix, /i ball ii\|35\|97/);
  assert.doesNotMatch(linkFix, /pastfinder\|48\|55/);
  assert.doesNotMatch(linkFix, /tetris\|50\|56/);
  assert.doesNotMatch(linkFix, /wizball\|55\|50/);
  assert.match(browser, /\/data\/zzap64-game-reviews\//);
  assert.match(browser, /All verified Zzap!64 scans linked to CCG game pages/);
  assert.match(page, /All Zzap!64 Reviews for CCG Games/);
  assert.match(page, /zzap64-review-browser\.js/);
});
