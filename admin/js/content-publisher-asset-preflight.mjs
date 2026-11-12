// Shared between the browser publisher and Node regression tests.
// Decode image dimensions before committing a new game: the generated
// game pages require intrinsic artwork dimensions and fail closed otherwise.
const WEBP_SIGNATURE = [82, 73, 70, 70]; // RIFF
const WEBP_FORMAT = [87, 69, 66, 80]; // WEBP
const MAX_DIMENSION = 16384;

function matches(bytes, offset, signature) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function little16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function little24(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function chunkName(bytes) {
  return String.fromCharCode(...bytes.slice(12, 16));
}

export function readWebpDimensions(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  if (bytes.length < 30 || !matches(bytes, 0, WEBP_SIGNATURE) || !matches(bytes, 8, WEBP_FORMAT)) {
    return null;
  }

  const chunk = chunkName(bytes);
  let width = 0;
  let height = 0;
  if (chunk === 'VP8X') {
    width = 1 + little24(bytes, 24);
    height = 1 + little24(bytes, 27);
  } else if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    width = little16(bytes, 26) & 0x3fff;
    height = little16(bytes, 28) & 0x3fff;
  } else if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const packed = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
    width = 1 + (packed & 0x3fff);
    height = 1 + ((packed >>> 14) & 0x3fff);
  } else {
    return null;
  }

  return width > 0 && height > 0 && width <= MAX_DIMENSION && height <= MAX_DIMENSION
    ? { width, height, encoding: chunk.trim() } : null;
}

export function validateGameArtwork(input, { path, maxBytes = 500 * 1024 } = {}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  const errors = [];
  if (!/\.webp$/i.test(String(path || ''))) errors.push('New game artwork must use a .webp path.');
  if (!bytes.length) errors.push('Image data is empty.');
  if (bytes.length > maxBytes) errors.push(`Image exceeds the ${Math.ceil(maxBytes / 1024)} KB limit.`);
  const dimensions = readWebpDimensions(bytes);
  if (!dimensions) errors.push('Image has no readable VP8, VP8L or VP8X WebP dimensions.');
  return { ok: errors.length === 0, errors, byteLength: bytes.length, ...dimensions };
}
