// CCG C64 game catalogue: bounded, same-origin media packs and local-only filters.
// The data packs are optional until the site owner uploads the approved games.
export const PACK_ROOT = "/emulator/c64/media/blast/";
export const PACK_CATALOG_URL = PACK_ROOT + "catalog.json";
export const GAME_PAGE_SIZE = 36;

const FORMATS = new Set(["prg", "d64", "d71", "d81", "g64", "crt", "tap", "t64"]);
const HEX_64 = /^[a-f0-9]{64}$/i;
const PACK_FILENAME = /^pack-\d{2}\.bin$/;

export function parsePackedCatalog(data) {
  if (!data || data.version !== 2 || !Array.isArray(data.packs) ||
      !Array.isArray(data.games) || data.packs.length > 128 ||
      data.games.length > 5000 || data.recordCount !== data.games.length) {
    throw new Error("Invalid CCG packed game catalogue.");
  }
  const packs = data.packs.map((row) => {
    if (!row || !PACK_FILENAME.test(row.file) ||
        !Number.isSafeInteger(row.bytes) || row.bytes < 1 ||
        row.bytes > 8 * 1024 * 1024 || !HEX_64.test(row.sha256)) {
      throw new Error("Invalid CCG game-pack metadata.");
    }
    return Object.freeze({ file: row.file, bytes: row.bytes, sha256: row.sha256.toLowerCase() });
  });
  const ids = new Set();
  const entries = data.games.map((row) => {
    if (!Array.isArray(row) || row.length !== 7) {
      throw new Error("Invalid game entry in CCG catalogue.");
    }
    const [id, title, format, packIndex, offset, length, sha256] = row;
    const pack = packs[packIndex];
    if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id) || ids.has(id) ||
        typeof title !== "string" || !title.trim() || title.length > 150 ||
        !FORMATS.has(format) || !pack || !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(length) || offset < 0 || length < 3 ||
        offset + length > pack.bytes || !HEX_64.test(sha256)) {
      throw new Error("A game has invalid or duplicate media metadata.");
    }
    ids.add(id);
    return Object.freeze({
      id, title, format, packed: true, approved: true,
      packFile: pack.file, packBytes: pack.bytes, packSHA256: pack.sha256,
      byteOffset: offset, byteLength: length, sha256: sha256.toLowerCase(),
      filename: title.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") + "." + format,
      license: "Owner-authorised hosted C64 game",
    });
  });
  return { packs, entries };
}

export function filterCatalog(entries, { query = "", format = "all", letter = "all", page = 0 } = {}) {
  const search = String(query).trim().toLocaleLowerCase();
  const wantedFormat = String(format).toLowerCase();
  const wantedLetter = String(letter).toUpperCase();
  const matching = entries.filter((entry) => {
    if (wantedFormat !== "all" && entry.format !== wantedFormat) return false;
    const title = entry.title || "";
    const first = title.trim().charAt(0).toUpperCase();
    if (wantedLetter !== "ALL" && (wantedLetter === "0-9"
      ? !/^[0-9]/.test(first) : first !== wantedLetter)) return false;
    return !search || title.toLocaleLowerCase().includes(search);
  });
  matching.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true }));
  const pages = Math.max(1, Math.ceil(matching.length / GAME_PAGE_SIZE));
  const selectedPage = Math.min(pages - 1, Math.max(0, Number.isInteger(page) ? page : 0));
  return {
    total: matching.length, page: selectedPage, pages,
    games: matching.slice(selectedPage * GAME_PAGE_SIZE, (selectedPage + 1) * GAME_PAGE_SIZE),
  };
}

async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser hashing is required to verify game files.");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export async function loadPackedGameBytes(entry, packCache = new Map()) {
  if (!entry?.packed || !PACK_FILENAME.test(entry.packFile) ||
      !Number.isSafeInteger(entry.byteOffset) || !Number.isSafeInteger(entry.byteLength)) {
    throw new Error("This is not a valid hosted C64 game.");
  }
  const name = entry.packFile;
  let bytesPromise = packCache.get(name);
  if (!bytesPromise) {
    bytesPromise = (async () => {
      const response = await fetch(PACK_ROOT + name, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Game data is not yet available (HTTP " + response.status + ").");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== entry.packBytes ||
          await sha256Hex(bytes) !== entry.packSHA256) {
        throw new Error("Downloaded C64 game pack failed its integrity check.");
      }
      return bytes;
    })();
    packCache.set(name, bytesPromise);
    bytesPromise.catch(() => { if (packCache.get(name) === bytesPromise) packCache.delete(name); });
  }
  const pack = await bytesPromise;
  const end = entry.byteOffset + entry.byteLength;
  if (end > pack.length) throw new Error("C64 game file exceeds its pack bounds.");
  const bytes = pack.slice(entry.byteOffset, end);
  if (await sha256Hex(bytes) !== entry.sha256) {
    throw new Error("C64 game file failed its integrity check.");
  }
  return bytes;
}
