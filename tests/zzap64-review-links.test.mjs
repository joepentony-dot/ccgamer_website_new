import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const generator = require('../scripts/generate-zzap64-review-links.js');
const root = path.resolve(import.meta.dirname, '..');
const years = [1985, 1986, 1987, 1988, 1989];

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

test('every Zzap award has a safe official magazine destination', () => {
  const data = readJson('data/zzap64-review-links.json');
  const awards = awardEntries();

  assert.equal(data.totals.awards, awards.length);
  assert.equal(Object.keys(data.entries).length, awards.length);
  assert.equal(data.totals.exactPages + data.totals.issueFallbacks, awards.length);

  awards.forEach((entry) => {
    const key = generator.recordKey(entry);
    const record = data.entries[key];
    assert.ok(record, `Missing magazine link for ${key}`);
    assert.equal(record.issue, generator.issueNumber(entry.year, entry.month), `Wrong issue for ${key}`);

    const url = new URL(record.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'www.zzap64.co.uk');
    assert.ok(record.precision === 'page' || record.precision === 'issue');

    if (record.precision === 'page') {
      assert.ok(Number.isInteger(record.page) && record.page > 0, `Invalid page for ${key}`);
      assert.equal(url.pathname, '/cgi-bin/displaypage.pl');
      assert.equal(Number(url.searchParams.get('issue')), record.issue);
      assert.equal(Number(url.searchParams.get('page')), record.page);
    } else {
      assert.equal(record.page, null);
      assert.equal(record.url, generator.officialIssueUrl(record.issue));
    }
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

test('archive renderer exposes original-magazine links without replacing CCG game links', () => {
  const source = fs.readFileSync(path.join(root, 'js/zzap64-awards.js'), 'utf8');
  assert.match(source, /\/data\/zzap64-review-links\.json/);
  assert.match(source, /zzap-award-card__game-link/);
  assert.match(source, /zzap-award-card__magazine-link/);
  assert.match(source, /Read original Zzap!64 review/);
  assert.match(source, /Browse original Zzap!64 issue/);
  assert.match(source, /noopener noreferrer external/);
});
