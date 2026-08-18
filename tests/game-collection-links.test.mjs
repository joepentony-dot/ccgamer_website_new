import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('js/load-single-game.js', 'utf8');

test('runtime collection links use the real collection archive filenames', () => {
  assert.match(source, /bpjs:\s*["']bpjs-indexed-games["']/);
  assert.match(source, /cartridge:\s*["']cartridge-games["']/);
  assert.match(source, /licensed:\s*["']licensed-games["']/);
  assert.match(
    source,
    /games\/collections\/\$\{collectionArchiveSlug\(collection\)\}\.html/
  );
  assert.doesNotMatch(
    source,
    /games\/collections\/\$\{slugifyBrowseToken\(collection\)\}\.html/
  );
});

test('every collection alias destination exists', () => {
  [
    'games/collections/bpjs-indexed-games.html',
    'games/collections/cartridge-games.html',
    'games/collections/licensed-games.html',
  ].forEach((path) => assert.equal(fs.existsSync(path), true, `${path} is missing`));
});

test('obsolete collection routes forward to their canonical archives', () => {
  const redirects = new Map([
    ['games/collections/bpjs.html', '/games/collections/bpjs-indexed-games.html'],
    ['games/collections/cartridge.html', '/games/collections/cartridge-games.html'],
    ['games/collections/licensed.html', '/games/collections/licensed-games.html'],
  ]);

  redirects.forEach((destination, path) => {
    const html = fs.readFileSync(path, 'utf8');
    assert.match(html, new RegExp(`rel="canonical" href="https://www\\.cheekycommodoregamer\\.co\\.uk${destination.replaceAll('.', '\\.')}`));
    assert.match(html, new RegExp(`window\\.location\\.replace\\('${destination.replaceAll('.', '\\.')}\\'\\)`));
  });
});
