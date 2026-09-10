import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, 'arcade/lost-sizzler/js/v10-4-patch.js'), 'utf8');

function extractFunction(name, nextName) {
  const marker = `  function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}() in v10-4-patch.js`);
  const endMarker = `\n  function ${nextName}(`;
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Could not isolate ${name}() before ${nextName}()`);
  return source.slice(start, end);
}

const safeTextSource = extractFunction('safeText', 'hashText');
const catalogueTitlesSource = extractFunction('catalogueTitles', 'setStartButtonsDisabled');
const sandbox = {};
vm.runInNewContext(`${safeTextSource}\n${catalogueTitlesSource}\nglobalThis.catalogueTitles = catalogueTitles;`, sandbox, {
  filename: 'v10-4-c64-catalogue-contract.vm.js',
  timeout: 1000,
});

const catalogueTitles = sandbox.catalogueTitles;
if (typeof catalogueTitles !== 'function') throw new Error('catalogueTitles() extraction failed.');

const mixed = [
  { system: 'C64', title: 'Paradroid' },
  { system: 'AMIGA', title: 'Lemmings' },
  { system: ' c64 ', title: 'IK+' },
  { system: 'C64', title: 'paradroid' },
  { system: 'ZX', title: 'Head Over Heels' },
  { title: 'Derivative Title' },
  { system: 'C64', title: ' ' },
];

const titles = catalogueTitles(mixed);
const expected = ['Paradroid', 'IK+', 'Derivative Title'];
if (JSON.stringify(titles) !== JSON.stringify(expected)) {
  throw new Error(`C64 collectible catalogue filter mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(titles)}`);
}
if (titles.includes('Lemmings') || titles.includes('Head Over Heels')) {
  throw new Error('Non-C64 website catalogue rows leaked into the Lost Sizzler collectible pool.');
}

const wrapped = catalogueTitles({ games: [
  { system: 'C64', title: 'Uridium' },
  { system: 'AMIGA', title: 'Sensible Soccer' },
] });
if (JSON.stringify(wrapped) !== JSON.stringify(['Uridium'])) {
  throw new Error(`Wrapped catalogue payload must remain C64-only; got ${JSON.stringify(wrapped)}`);
}

console.log('Lost Sizzler C64 collectible catalogue contract: PASS');
