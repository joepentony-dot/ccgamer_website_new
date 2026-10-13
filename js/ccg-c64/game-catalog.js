// CCG C64 game catalogue: bounded, same-origin media packs and local-only filters.
// The data packs are optional until the site owner uploads the approved games.
export const PACK_ROOT = "/emulator/c64/media/blast/";
export const PACK_CATALOG_URL = PACK_ROOT + "catalog.json";
export const ARCHIVE_PACK_ROOT = "/emulator/c64/media/prg-archive/";
export const ARCHIVE_CATALOG_URL = ARCHIVE_PACK_ROOT + "catalog.json";
export const ARCHIVE_READY_URL = ARCHIVE_PACK_ROOT + "ready.json";
export const GAME_PAGE_SIZE = 36;

const FORMATS = new Set(["prg", "d64", "d71", "d81", "g64", "crt", "tap", "t64"]);
const HEX_64 = /^[a-f0-9]{64}$/i;
const PACK_FILENAME = /^pack-\d{2}\.bin$/;

export function parsePackedCatalog(data, { packRoot = PACK_ROOT } = {}) {
  if (packRoot !== PACK_ROOT && packRoot !== ARCHIVE_PACK_ROOT) {
    throw new Error("Untrusted CCG game-pack location.");
  }
  if (!data || data.version !== 2 || !Array.isArray(data.packs) ||
      !Array.isArray(data.games) || data.packs.length > 128 ||
      data.games.length > 12000 || data.recordCount !== data.games.length) {
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
      packRoot, packFile: pack.file, packBytes: pack.bytes, packSHA256: pack.sha256,
      byteOffset: offset, byteLength: length, sha256: sha256.toLowerCase(),
      filename: title.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") + "." + format,
      license: "Owner-authorised hosted C64 game",
    });
  });
  return { packs, entries };
}

// Only explicitly promoted cartridge images replace other formats. A title alone
// never grants an untested CRT priority: pack contents and the owner's original
// media stay untouched until a reviewed, verified, owner-approved CRT is listed.
// Matching is punctuation-insensitive but never substring-based ("Pitfall" must
// not hide "Pitfall II", nor a compilation hide its individual games).
export function preferSelectedCartridges(entries) {
  if (!Array.isArray(entries)) return [];
  const preferred = new Map();
  for (const entry of entries) {
    if (entry?.preferOverOtherFormats !== true ||
        String(entry.format || "").toLowerCase() !== "crt" ||
        typeof entry.title !== "string") continue;
    const key = normaliseCatalogSearch(entry.title);
    if (key && !preferred.has(key)) preferred.set(key, entry);
  }
  if (!preferred.size) return entries;
  return entries.filter(entry => {
    const key = typeof entry?.title === "string" ? normaliseCatalogSearch(entry.title) : "";
    return !preferred.has(key) || preferred.get(key) === entry;
  });
}

// Indexing punctuation as optional lets "Daley Thompsons" find "Daley Thompson's".
const searchTitleCache = new WeakMap();
export function normaliseCatalogSearch(value) {
  return String(value ?? "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2018\u2019\u0060]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
function searchableTitle(entry) {
  if (searchTitleCache.has(entry)) return searchTitleCache.get(entry);
  const title = normaliseCatalogSearch(entry.title);
  searchTitleCache.set(entry, title);
  return title;
}

export function filterCatalog(entries, { query = "", format = "all", letter = "all", page = 0 } = {}) {
  const search = normaliseCatalogSearch(query);
  const wantedFormat = String(format).toLowerCase();
  const wantedLetter = String(letter).toUpperCase();
  const matching = entries.filter((entry) => {
    if (wantedFormat !== "all" && entry.format !== wantedFormat) return false;
    const title = entry.title || "";
    const first = title.trim().charAt(0).toUpperCase();
    if (wantedLetter !== "ALL" && (wantedLetter === "0-9"
      ? !/^[0-9]/.test(first) : first !== wantedLetter)) return false;
    return !search || searchableTitle(entry).includes(search);
  });
  matching.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true }));
  const pages = Math.max(1, Math.ceil(matching.length / GAME_PAGE_SIZE));
  const selectedPage = Math.min(pages - 1, Math.max(0, Number.isInteger(page) ? page : 0));
  return {
    total: matching.length, page: selectedPage, pages,
    games: matching.slice(selectedPage * GAME_PAGE_SIZE, (selectedPage + 1) * GAME_PAGE_SIZE),
  };
}

// Compact keyboard-friendly suggestions. No catalogue results are shown for
// an empty query, and only a few options are rendered regardless of catalogue
// size. Exact title prefixes rank ahead of word starts, then other matches.
export function suggestCatalogGames(entries, query, limit = 8) {
  const text = normaliseCatalogSearch(query);
  if (!text) return { games: [], total: 0 };
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(20, limit)) : 8;
  const ranked = [];
  for (const entry of entries) {
    if (!entry || typeof entry.title !== "string") continue;
    const title = searchableTitle(entry);
    const index = title.indexOf(text);
    if (index < 0) continue;
    const rank = index === 0 ? 0 : /[^\p{L}\p{N}]/u.test(title.charAt(index - 1)) ? 1 : 2;
    ranked.push({ entry, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank ||
    a.entry.title.localeCompare(b.entry.title, "en", { sensitivity: "base", numeric: true }));
  return { total: ranked.length, games: ranked.slice(0, safeLimit).map(({ entry }) => entry) };
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
  const root = entry.packRoot || PACK_ROOT;
  if (root !== PACK_ROOT && root !== ARCHIVE_PACK_ROOT) {
    throw new Error("Untrusted CCG game pack origin.");
  }
  const name = root + entry.packFile;
  let bytesPromise = packCache.get(name);
  if (!bytesPromise) {
    bytesPromise = (async () => {
      const response = await fetch(name, { credentials: "same-origin", cache: "no-store" });
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
