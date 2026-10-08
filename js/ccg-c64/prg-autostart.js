// C64 BASIC stub inspection for ROM-independent game auto-start.
// An initial single-line SYS program can be launched by its direct SYS
// command on independent replacement BASICs with different RUN parsing.
export function singleLineSysTarget(prg) {
  const bytes = prg instanceof Uint8Array ? prg : null;
  if (!bytes || bytes.length < 16) return null;
  const loadAddress = bytes[0] | (bytes[1] << 8);
  if (loadAddress !== 0x0801) return null;
  const nextAddress = bytes[2] | (bytes[3] << 8);
  if (nextAddress <= loadAddress || nextAddress >= 0x10000) return null;

  let pos = 6; // 2-byte load address, next line pointer, line number
  while (bytes[pos] === 0x20) pos++;
  if (bytes[pos++] !== 0x9e) return null; // Commodore BASIC SYS token
  while (bytes[pos] === 0x20) pos++;
  const enclosed = bytes[pos] === 0x28;
  if (enclosed) pos++;
  while (bytes[pos] === 0x20) pos++;
  const digitsStart = pos;
  while (pos < bytes.length && bytes[pos] >= 0x30 && bytes[pos] <= 0x39) pos++;
  if (pos === digitsStart || pos - digitsStart > 5) return null;
  const target = Number(String.fromCharCode(...bytes.subarray(digitsStart, pos)));
  if (!Number.isInteger(target) || target < 0x0200 || target > 0xffff) return null;
  while (bytes[pos] === 0x20) pos++;
  if (enclosed) {
    if (bytes[pos++] !== 0x29) return null;
    while (bytes[pos] === 0x20) pos++;
  }
  // Only replace the exact single-statement RUN program. Never skip
  // additional BASIC statements or lines that games may depend on.
  if (bytes[pos] !== 0 || nextAddress !== loadAddress + (pos - 1)) return null;
  if (bytes[pos + 1] !== 0 || bytes[pos + 2] !== 0) return null;
  return target;
}
