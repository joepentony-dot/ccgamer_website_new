import assert from 'node:assert/strict';
import test from 'node:test';
import { readWebpDimensions, validateGameArtwork } from '../admin/js/content-publisher-asset-preflight.mjs';

function riff(chunk, length = 64) {
  const bytes = new Uint8Array(length);
  bytes.set([82, 73, 70, 70], 0); // RIFF
  bytes.set([87, 69, 66, 80], 8); // WEBP
  bytes.set([...chunk].map((ch) => ch.charCodeAt(0)), 12);
  return bytes;
}

test('preflight accepts standard VP8 thumbnail (the Gloom regression)', () => {
  const image = riff('VP8 ');
  image.set([0x9d, 0x01, 0x2a], 23);
  image.set([0xcc, 0x01, 0xd7, 0x00], 26); // 460 by 215
  assert.deepEqual(readWebpDimensions(image), { width: 460, height: 215, encoding: 'VP8' });
  assert.equal(validateGameArtwork(image, { path: 'resources/images/thumbnails/all/gloom.webp' }).ok, true);
});

test('preflight accepts extended VP8X artwork and lossless VP8L thumbnails', () => {
  const box = riff('VP8X');
  box.set([0x51, 0x03, 0x00, 0xdb, 0x04, 0x00], 24); // 850 by 1244
  assert.deepEqual(readWebpDimensions(box), { width: 850, height: 1244, encoding: 'VP8X' });
  const lossless = riff('VP8L');
  lossless[20] = 0x2f;
  const encoded = ((100 - 1) | ((250 - 1) << 14)) >>> 0;
  lossless[21] = encoded & 255;
  lossless[22] = (encoded >>> 8) & 255;
  lossless[23] = (encoded >>> 16) & 255;
  lossless[24] = (encoded >>> 24) & 255;
  assert.deepEqual(readWebpDimensions(lossless), { width: 100, height: 250, encoding: 'VP8L' });
});

test('preflight refuses empty, invalid, wrong-extension and oversized images', () => {
  const image = riff('VP8 ');
  image.set([0x9d, 0x01, 0x2a], 23);
  image.set([0x20, 0x03, 0x58, 0x02], 26); // 800 by 600
  assert.equal(validateGameArtwork(new Uint8Array(), { path: 'gloom.webp' }).ok, false);
  assert.equal(validateGameArtwork(image, { path: 'gloom.jpg' }).ok, false);
  assert.equal(validateGameArtwork(image, { path: 'gloom.webp', maxBytes: 40 }).ok, false);
  assert.equal(validateGameArtwork(new Uint8Array(64), { path: 'gloom.webp' }).ok, false);
  const broken = image.slice();
  broken.set([0, 0, 0], 23);
  assert.equal(readWebpDimensions(broken), null);
});
