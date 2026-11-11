import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getImageMetadata, validateForGeneration } = require('../scripts/generate-slug-pages.js');
const ROOT = path.resolve(import.meta.dirname, '..');

function webpChunk(kind, width, height) {
  const bytes = Buffer.alloc(32);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WEBP', 8, 'ascii');
  bytes.write(kind, 12, 'ascii');
  bytes.writeUInt32LE(bytes.length - 20, 16);

  if (kind === 'VP8X') {
    bytes.writeUIntLE(width - 1, 24, 3);
    bytes.writeUIntLE(height - 1, 27, 3);
  } else if (kind === 'VP8 ') {
    bytes[23] = 0x9d;
    bytes[24] = 0x01;
    bytes[25] = 0x2a;
    bytes.writeUInt16LE(width, 26);
    bytes.writeUInt16LE(height, 28);
  } else if (kind === 'VP8L') {
    bytes[20] = 0x2f;
    const packed = ((width - 1) & 0x3fff) |
      (((height - 1) & 0x3fff) << 14);
    bytes.writeUInt32LE(packed >>> 0, 21);
  }
  return bytes;
}

test('new game thumbnails support VP8, VP8L and VP8X WebP dimensions', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-webp-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const kind of ['VP8 ', 'VP8L', 'VP8X']) {
    const file = path.join(directory, kind.trim() + '.webp');
    fs.writeFileSync(file, webpChunk(kind, 460, 215));
    const metadata = getImageMetadata(file);
    assert.equal(metadata.mimeType, 'image/webp', kind);
    assert.equal(metadata.width, 460, kind);
    assert.equal(metadata.height, 215, kind);
  }
});

test('malformed WebP images are rejected instead of inventing dimensions', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-webp-invalid-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'invalid.webp');
  fs.writeFileSync(file, Buffer.alloc(32));
  const metadata = getImageMetadata(file);
  assert.equal(metadata.width, 0);
  assert.equal(metadata.height, 0);
});

test('Gloom existing WebP thumbnail is usable by the canonical page generator', () => {
  const filename = path.join(ROOT, 'resources/images/thumbnails/all/gloom.webp');
  assert.ok(fs.existsSync(filename), 'Gloom thumbnail must remain in GitHub');
  const metadata = getImageMetadata(filename);
  assert.equal(metadata.mimeType, 'image/webp');
  assert.ok(metadata.width > 0 && metadata.height > 0,
    'Do not regress standard WebP thumbnail parsing');
  const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/games.json'), 'utf8'))
    .find((item) => item.slug === 'gloom' && item.system === 'AMIGA');
  assert.ok(game, 'Gloom must remain present once in the source catalogue');
  const validation = validateForGeneration(game, game.slug, new Map([[game.slug, game]]));
  assert.deepEqual(validation.issues, [], 'Gloom must pass canonical page preflight');
});
