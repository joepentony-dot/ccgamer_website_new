// Identical original C64 firmware for desktop and mobile visitors.
// The website owner has confirmed permission to distribute this ROM set.
// Source: VICE project original C64 ROM files, mirrored unchanged.
// Never substitute experimental replacement ROMs or hosted firmware from an
// unknown third-party endpoint. Only our same-origin files are used.
export const HOSTED_C64_ROMS = Object.freeze([
  Object.freeze({
    key: "kernal", file: "kernal-901227-03.bin", bytes: 8192,
    sha256: "83c60d47047d7beab8e5b7bf6f67f80daa088b7a6a27de0d7e016f6484042721",
  }),
  Object.freeze({
    key: "basic", file: "basic-901226-01.bin", bytes: 8192,
    sha256: "89878cea0a268734696de11c4bae593eaaa506465d2029d619c0e0cbccdfa62d",
  }),
  Object.freeze({
    key: "charRom", file: "chargen-901225-01.bin", bytes: 4096,
    sha256: "fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420",
  }),
]);
export const HOSTED_ROM_ROOT = "/emulator/c64/firmware/";
export const HOSTED_ROM_VERSION = "C64 BASIC V2 + KERNAL 901227-03 + CHARGEN 901225-01";

function encodeBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  }
  return btoa(binary);
}

export async function fetchVerifiedHostedROMs({
  fetchImpl = fetch,
  digestImpl = (bytes) => crypto.subtle.digest("SHA-256", bytes),
} = {}) {
  const files = {};
  // Validate ALL three files before allowing even one to reach the emulator.
  for (const spec of HOSTED_C64_ROMS) {
    const url = HOSTED_ROM_ROOT + spec.file;
    const response = await fetchImpl(url, {
      credentials: "same-origin", cache: "force-cache",
    });
    if (!response.ok) throw new Error(`Original C64 ${spec.key} firmware HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== spec.bytes) {
      throw new Error(`Unexpected ${spec.key} firmware size: ${bytes.length}`);
    }
    const hashBytes = new Uint8Array(await digestImpl(bytes));
    const hash = Array.from(hashBytes, byte => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== spec.sha256) {
      throw new Error(`The hosted ${spec.key} ROM did not pass SHA-256 verification.`);
    }
    files[spec.key] = bytes;
  }
  return files;
}

export function installHostedROMs(vault, files) {
  const entries = {};
  for (const spec of HOSTED_C64_ROMS) {
    const bytes = files[spec.key];
    if (!(bytes instanceof Uint8Array) || bytes.length !== spec.bytes) {
      throw new Error(`Verified ${spec.key} ROM data is unavailable.`);
    }
    entries[spec.key] = { name: spec.file, data: encodeBytes(bytes) };
  }
  // ROMVault.importBundle validates and atomically installs all three. It
  // preserves optional 1541 DOS and rolls back if local storage is unavailable.
  return vault.importBundle({
    format: "ccg-c64-local-rom-transfer", version: 1, entries,
  });
}
