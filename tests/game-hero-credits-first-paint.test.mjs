import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repoRoot, 'scripts/prefill-canonical-game-boxes.mjs');

function setup(credits = {
  publisher: ['Accolade', 'U.S. Gold'],
  developer: 'Artech Digital Entertainment',
  coder: ['A & B', 'C < D'],
  musician: 'Example musician'
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-hero-credits-'));
  const gameDir = path.join(root, 'games', 'ace-of-aces');
  const boxDir = path.join(root, 'resources', 'images', 'games', 'boxes-3d');
  fs.mkdirSync(gameDir, { recursive: true });
  fs.mkdirSync(boxDir, { recursive: true });
  fs.writeFileSync(path.join(boxDir, 'ace-of-aces.webp'), 'fixture only');
  fs.writeFileSync(path.join(root, 'games', 'games.json'), JSON.stringify([{
    slug: 'ace-of-aces', credits
  }]));
  const file = path.join(gameDir, 'index.html');
  const html = [
    '<!doctype html><html lang="en"><body>',
    '<div class="ccg-page--single-game" data-ccg-prefilled="true">',
    '<section class="game-hero">',
    '  <div class="game-hero__inner">',
    '    <div class="game-hero__media"><img src="/cover.jpg" alt="cover"></div>',
    '    <div class="game-hero__content">',
    '      <h1>Game title</h1>',
    '      <div class="game-hero__actions ccg-share"><button>Share</button></div>',
    '    </div>',
    '    <div class="game-hero__box3d" hidden>',
    '      <img class="game-hero__box3d-img"',
    '           alt=""',
    '           loading="lazy" width="600" height="900">',
    '    </div>',
    '  </div>',
    '</section></div></body></html>'
  ].join('\n');
  fs.writeFileSync(file, html);
  return { root, file, html };
}

function execute(root, check = false) {
  return spawnSync(process.execPath, [script, '--root', root, ...(check ? ['--check'] : [])],
    { cwd: repoRoot, encoding: 'utf8', timeout: 15000 });
}

test('first paint includes source-backed credits before the artwork row, without changing source content', () => {
  const { root, file, html } = setup();
  try {
    const first = execute(root);
    assert.equal(first.status, 0, first.stderr);
    const report = JSON.parse(first.stdout);
    assert.equal(report.eligible, 1);
    assert.equal(report.creditsEligible, 1);
    assert.equal(report.changed, 1);
    const output = fs.readFileSync(file, 'utf8');
    assert.match(output, /game-hero--has-box3d/);
    assert.match(output, /data-ccg-box3d-prefilled="true"/);
    assert.match(output, /src="\/resources\/images\/games\/boxes-3d\/ace-of-aces\.webp"/);
    assert.doesNotMatch(output, /class="game-hero__box3d" hidden/);
    assert.match(output, /data-ccg-credits-prefilled="true"/);
    assert.match(output, /<dt>Publisher<\/dt><dd>Accolade, U\.S\. Gold<\/dd>/);
    assert.match(output, /<dt>Developer<\/dt><dd>Artech Digital Entertainment<\/dd>/);
    assert.match(output, /<dt>Programmer<\/dt><dd>A &amp; B, C &lt; D<\/dd>/);
    assert(output.indexOf('data-ccg-credits-prefilled') <
      output.indexOf('class="game-hero__box3d"'));
    assert.equal(output.includes('<h1>Game title</h1>'), true);
    assert.equal(html.includes('data-ccg-credits-prefilled'), false);
    const check = execute(root, true);
    assert.equal(check.status, 0, check.stderr);
    assert.equal(fs.readFileSync(file, 'utf8'), output, 'check must be read-only and idempotent');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('check mode refuses unreserved credits without rewriting staged HTML', () => {
  const { root, file, html } = setup();
  try {
    const check = execute(root, true);
    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /first-paint/i);
    assert.equal(fs.readFileSync(file, 'utf8'), html);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('duplicate developer and publisher show only publisher, preserving runtime field rules', () => {
  const { root, file } = setup({ publisher: ['Example Studio'], developer: ['Example Studio'] });
  try {
    const run = execute(root);
    assert.equal(run.status, 0, run.stderr);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /<dt>Publisher<\/dt><dd>Example Studio<\/dd>/);
    assert.doesNotMatch(html, /<dt>Developer<\/dt>/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a box-art page without source credits retains its original hero design', () => {
  const { root, file } = setup(null);
  try {
    const run = execute(root);
    assert.equal(run.status, 0, run.stderr);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /game-hero--has-box3d/);
    assert.doesNotMatch(html, /data-ccg-credits-prefilled/);
    assert.equal(execute(root, true).status, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
