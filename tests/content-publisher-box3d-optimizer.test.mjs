import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Content Publisher 3D box optimiser uses the shared image decoder', () => {
  const source = read('admin/js/content-publisher-image-optimizer.js');

  assert.match(
    source,
    /async function optimiseBox3dSelectedImage\(status\)[\s\S]*source = await decodeImage\(original\)/,
    '3D box optimisation must decode the selected file before WebP encoding'
  );
  assert.doesNotMatch(
    source,
    /\bloadImage\s*\(/,
    '3D box optimisation must not call the removed/undefined loadImage helper'
  );
  assert.match(
    source,
    /finally\s*\{\s*closeDecodedImage\(source\);\s*\}/,
    'decoded 3D box images should be released after optimisation'
  );
});
