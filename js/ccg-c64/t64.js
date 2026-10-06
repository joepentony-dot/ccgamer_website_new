function readAscii(bytes, start, length) {
  let text = "";
  for (let i = 0; i < length && start + i < bytes.length; i++) {
    const value = bytes[start + i];
    if (value === 0) break;
    text += String.fromCharCode(value);
  }
  return text;
}

function readName(bytes, start, length) {
  let end = length;
  while (end > 0) {
    const value = bytes[start + end - 1];
    if (value !== 0x00 && value !== 0x20 && value !== 0xA0) break;
    end--;
  }
  let name = "";
  for (let i = 0; i < end; i++) {
    const value = bytes[start + i];
    name += value >= 0x20 && value <= 0x7E ? String.fromCharCode(value) : " ";
  }
  return name.trim() || "T64 PROGRAM";
}

function u16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

export function extractFirstT64Program(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 0x60) throw new Error("That T64 image is too small.");

  const signature = readAscii(bytes, 0, 32).toLowerCase();
  if (!signature.includes("c64") || !signature.includes("tape image file")) {
    throw new Error("That file does not contain a recognised T64 header.");
  }

  const declaredEntries = u16(bytes, 0x22);
  const availableEntries = Math.floor((bytes.length - 0x40) / 32);
  const entryCount = Math.min(declaredEntries || availableEntries, availableEntries, 512);

  for (let index = 0; index < entryCount; index++) {
    const base = 0x40 + index * 32;
    const entryType = bytes[base];
    const fileType = bytes[base + 1];
    if (!entryType || (fileType & 0x07) !== 0x02) continue;

    const start = u16(bytes, base + 2);
    const end = u16(bytes, base + 4);
    const dataOffset = u32(bytes, base + 8);
    if (dataOffset < 0x40 || dataOffset >= bytes.length) continue;

    let length = end > start ? end - start : 0;
    if (!length) {
      let nextOffset = bytes.length;
      for (let j = index + 1; j < entryCount; j++) {
        const candidate = u32(bytes, 0x40 + j * 32 + 8);
        if (candidate > dataOffset && candidate < nextOffset) nextOffset = candidate;
      }
      length = nextOffset - dataOffset;
    }
    length = Math.min(length, bytes.length - dataOffset);
    if (length <= 0) continue;

    const prg = new Uint8Array(length + 2);
    prg[0] = start & 0xFF;
    prg[1] = (start >> 8) & 0xFF;
    prg.set(bytes.subarray(dataOffset, dataOffset + length), 2);
    return {
      name: readName(bytes, base + 16, 16),
      start,
      prg,
    };
  }

  throw new Error("No runnable PRG entry was found in that T64 image.");
}
