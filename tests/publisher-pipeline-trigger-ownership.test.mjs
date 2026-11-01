import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const publisher = readFileSync(new URL('../.github/workflows/publisher-archives.yml', import.meta.url), 'utf8');
const games = readFileSync(new URL('../.github/workflows/games-publishing.yml', import.meta.url), 'utf8');

function triggerPaths(source, event) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${event}:`);
  assert.notEqual(start, -1, `Missing ${event} trigger`);
  const end = lines.findIndex((line, index) => index > start && /^  [a-z_]+:/.test(line));
  const section = lines.slice(start + 1, end < 0 ? lines.length : end);
  assert.ok(section.includes('    paths:'), `Missing ${event} path filter`);
  return section.filter((line) => /^      - "[^"]+"$/.test(line)).map((line) => line.slice(9, -1));
}

test('publisher-only pushes do not duplicate game-publishing file triggers', () => {
  const publisherPush = triggerPaths(publisher, 'push');
  const gamePush = new Set(triggerPaths(games, 'push'));
  assert.deepEqual(publisherPush.filter((path) => gamePush.has(path)), []);
  assert.ok(publisherPush.includes('scripts/mark-rerelease-publishers.js'));
  assert.ok(publisherPush.includes('data/publisher-logo-sources.json'));
  assert.ok(!publisherPush.includes('.github/workflows/publisher-archives.yml'));
});

test('publisher PR and manual validation remain available', () => {
  const publisherPR = triggerPaths(publisher, 'pull_request');
  assert.ok(publisherPR.includes('scripts/generate-publisher-pages.js'));
  assert.ok(publisherPR.includes('.github/workflows/publisher-archives.yml'));
  assert.ok(publisherPR.includes('tests/publisher-pipeline-trigger-ownership.test.mjs'));
  assert.match(publisher, /^  workflow_dispatch:/m);
  assert.match(publisher, /node --test tests\/publisher-pipeline-trigger-ownership\.test\.mjs/);
});

test('generated publisher output is draft-only and cannot push directly to main', () => {
  assert.match(publisher, /github\.ref == 'refs\/heads\/main'/);
  assert.match(publisher, /git push origin "HEAD:refs\/heads\/\$\{GENERATED_BRANCH\}"/);
  assert.match(publisher, /gh pr create \\\n\s+--draft \\/);
  assert.doesNotMatch(publisher, /git push origin "HEAD:\$\{TARGET_BRANCH\}"/);
  assert.doesNotMatch(publisher, /gh pr merge|--admin|--force/);
});
