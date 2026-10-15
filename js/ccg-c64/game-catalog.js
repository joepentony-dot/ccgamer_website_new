// CCG C64 game catalogue: bounded, same-origin media packs and local-only filters.
// The data packs are optional until the site owner uploads the approved games.
export const PACK_ROOT = "/emulator/c64/media/blast/";
export const PACK_CATALOG_URL = PACK_ROOT + "catalog.json";
export const ARCHIVE_PACK_ROOT = "/emulator/c64/media/prg-archive/";
export const ARCHIVE_CATALOG_URL = ARCHIVE_PACK_ROOT + "catalog.json";
export const ARCHIVE_READY_URL = ARCHIVE_PACK_ROOT + "ready.json";
export const ADDITIONAL_CRT_CATALOG_URL = "/emulator/c64/media/cartridge-replacements/active.json";
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

// Owner-attested extra cartridge library. Strictly limit this optional source to
// same-origin, SHA-bound direct CRT media. A missing/corrupt manifest fails closed;
// the existing packed game versions remain visible for rollback.
export function parseAdditionalCrtCatalog(data) {
  if (!data || data.version !== 1 || data.ownerRedistributionAttested !== true ||
      data.originalFormatsPreserved !== true || !Array.isArray(data.games) ||
      data.recordCount !== data.games.length || data.games.length > 6000) {
    throw new Error("Invalid optional cartridge catalogue.");
  }
  const ids = new Set();
  const titles = new Set();
  const hardwareTypes = new Set([0, 19, 32]);
  return data.games.map(row => {
    if (!Array.isArray(row) || row.length !== 5) {
      throw new Error("Invalid cartridge entry.");
    }
    const [title, filename, bytes, sha256, hardwareType] = row;
    if (typeof title !== "string" || !title.trim() || title.length > 150 ||
        typeof filename !== "string" || !/^[a-z0-9-]+\.crt$/.test(filename) ||
        !Number.isSafeInteger(bytes) || bytes < 80 || bytes > 8 * 1024 * 1024 ||
        typeof sha256 !== "string" || !HEX_64.test(sha256) ||
        !hardwareTypes.has(hardwareType)) {
      throw new Error("Invalid cartridge metadata.");
    }
    const id = "owner-crt-more-" + filename.slice(0, -4);
    const nameKey = normaliseCatalogSearch(title);
    if (!nameKey || ids.has(id) || titles.has(nameKey)) {
      throw new Error("Duplicate cartridge title or media path.");
    }
    ids.add(id);
    titles.add(nameKey);
    return Object.freeze({
      id, title, format: "crt", filename, bytes, sha256: sha256.toLowerCase(),
      url: "/emulator/c64/media/cartridge-replacements/" + filename,
      description: "CRT-first edition; original PRG/disk media retained for rollback.",
      license: "Public redistribution authorised by CCG website owner on 2026-10-14 (owner declaration)",
      approved: true,
      preferOverOtherFormats: true,
    });
  });
}

// Only explicitly promoted cartridge images replace other formats. A title alone
// never grants an untested CRT priority: pack contents and the owner's original
// media stay untouched until a reviewed, verified, owner-approved CRT is listed.
// Matching is punctuation-insensitive but never substring-based ("Pitfall" must
// not hide "Pitfall II", nor a compilation hide its individual games).
// A strict game-identity key, NOT a fuzzy-search key. Distinguish sequels,
// numbered games and "+" editions; only merge the owner-approved Le Mans alias.
// Keep fuzzy/typo matching confined to the search interface.
export function catalogGameIdentity(title) {
  const key = normaliseCatalogSearch(String(title ?? "").replace(/\+/g, " plus "));
  return key === "lemans" ? "le mans" : key;
}

// The emulator displays ONE playable row per exact game identity even when the
// underlying approved media still resides in several older packed archives.
// CRT has priority; identical formats keep their earlier entry/order.
// This is a VIEW only: never deletes packed bytes, so rollback remains possible.
export function preferSelectedCartridges(entries) {
  if (!Array.isArray(entries)) return [];
  const winners = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.title !== "string" ||
        typeof entry.id !== "string") continue;
    const key = catalogGameIdentity(entry.title);
    if (!key) continue;
    const format = String(entry.format || "").toLowerCase();
    const crt = format === "crt" && entry.approved === true;
    const promoted = crt && entry.preferOverOtherFormats === true;
    const score = promoted ? 3 : crt ? 2 : 1;
    const prior = winners.get(key);
    if (!prior || score > prior.score) winners.set(key, { entry, score });
  }
  return entries.filter(entry => {
    if (!entry || typeof entry.title !== "string") return false;
    return winners.get(catalogGameIdentity(entry.title))?.entry === entry;
  });
}

// Search is deliberately more forgiving than automatic archive-to-media linking.
// Fuzzy suggestions must never silently launch a different game, sequel or edition.
const searchTitleCache = new WeakMap();
const ROMAN_NUMERALS = Object.freeze({
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6",
  vii: "7", viii: "8", ix: "9", x: "10",
});
export function normaliseCatalogSearch(value) {
  return String(value ?? "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2018\u2019\u0060]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function searchForms(value) {
  const literal = normaliseCatalogSearch(value);
  const parts = literal.split(" ").filter(Boolean).map(part =>
    ROMAN_NUMERALS[part] || (part === "n" ? "and" : part));
  // Sorting or removing meaningful words could make different games collide.
  // Only a movable standalone "The" is ignored for search equivalence.
  const core = parts.filter(part => part !== "the").join(" ");
  return {
    literal,
    core,
    compact: core.replace(/ /g, ""),
    numbers: parts.filter(part => /^[0-9]+$/.test(part)).join("|"),
  };
}
function titleForms(entry) {
  if (searchTitleCache.has(entry)) return searchTitleCache.get(entry);
  const forms = searchForms(entry.title);
  searchTitleCache.set(entry, forms);
  return forms;
}
function searchRank(forms, query) {
  if (forms.literal === query.literal) return 0;
  // Do not turn an explicitly requested sequel/version into another one.
  if (forms.numbers && query.numbers && forms.numbers !== query.numbers) {
    // Preserve partial typing: "Game 9" still finds "Game 90"–"Game 99".
    // A complete wrong sequel number (Beach Head 1 vs 2) never matches.
    const partialNumber = forms.literal.startsWith(query.literal) &&
      forms.numbers.length > query.numbers.length &&
      forms.numbers.startsWith(query.numbers) &&
      /^[0-9]$/.test(query.numbers);
    if (!partialNumber) return -1;
  }
  if (query.core && forms.core === query.core) return 1;
  if (query.compact.length >= 4 && forms.compact === query.compact) return 1;
  if (forms.literal.startsWith(query.literal)) return 2;
  if (query.core && forms.core.startsWith(query.core + " ") &&
      forms.numbers === query.numbers) return 2;
  // A full archive subtitle may not exist in the shorter emulator display name.
  // Only suggest it when the game/version prefix and explicit numbers agree.
  if (forms.core.length >= 7 && query.core.startsWith(forms.core + " ") &&
      forms.numbers === query.numbers) return 3;
  const index = forms.literal.indexOf(query.literal);
  if (index >= 0) return index === 0 ? 2 : forms.literal.charAt(index - 1) === " " ? 3 : 4;
  if (query.core && forms.core.includes(query.core)) return 3;
  // Spacing/hyphens/initials: "Boulderdash" ↔ "Boulder Dash",
  // "B.C.'s" ↔ "BC's", and "Trapdoor" ↔ "Trap Door".
  if (query.compact.length >= 4 && forms.compact.includes(query.compact)) return 4;
  return -1;
}

// Bounded Levenshtein fallback is used ONLY if nothing matched by any spelling,
// article, numeric form or substring. Never offer a differently numbered sequel
// as a "typo", and do not edit-distance match arbitrary short titles.
function typoDistanceWithin(a, b, maximum) {
  if (Math.abs(a.length - b.length) > maximum) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, n) => n);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let smallest = i;
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min(row[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row.push(value);
      if (value < smallest) smallest = value;
    }
    if (smallest > maximum) return false;
    previous = row;
  }
  return previous[b.length] <= maximum;
}

const ENGLISH_TITLE_SORT = new Intl.Collator("en-GB", { sensitivity: "base", numeric: true });
export function searchCatalogEntries(entries, query) {
  const text = String(query ?? "").trim();
  if (!text) return entries.slice().sort((a, b) =>
    ENGLISH_TITLE_SORT.compare(a.title, b.title));
  const forms = searchForms(text);
  if (!forms.literal) return [];
  const ranked = [];
  for (const entry of entries) {
    if (!entry || typeof entry.title !== "string") continue;
    const rank = searchRank(titleForms(entry), forms);
    if (rank >= 0) ranked.push({ entry, rank });
  }
  if (!ranked.length && forms.compact.length >= 5) {
    const maxDistance = forms.compact.length >= 9 ? 2 : 1;
    for (const entry of entries) {
      if (!entry || typeof entry.title !== "string") continue;
      const candidate = titleForms(entry);
      if (candidate.numbers !== forms.numbers ||
          Math.abs(candidate.compact.length - forms.compact.length) > maxDistance ||
          candidate.compact[0] !== forms.compact[0]) continue;
      if (typoDistanceWithin(candidate.compact, forms.compact, maxDistance)) {
        ranked.push({ entry, rank: 5 });
      }
    }
  }
  ranked.sort((a, b) => a.rank - b.rank ||
    ENGLISH_TITLE_SORT.compare(a.entry.title, b.entry.title));
  return ranked.map(({ entry }) => entry);
}
export function filterCatalog(entries, { query = "", format = "all", letter = "all", page = 0 } = {}) {
  const wantedFormat = String(format).toLowerCase();
  const wantedLetter = String(letter).toUpperCase();
  const filtered = entries.filter(entry => {
    if (!entry || typeof entry.title !== "string") return false;
    if (wantedFormat !== "all" && entry.format !== wantedFormat) return false;
    const first = entry.title.trim().charAt(0).toUpperCase();
    return wantedLetter === "ALL" || (wantedLetter === "0-9"
      ? !/^[A-Z]/.test(first) : first === wantedLetter);
  });
  const matching = searchCatalogEntries(filtered, query);
  const pages = Math.max(1, Math.ceil(matching.length / GAME_PAGE_SIZE));
  const selectedPage = Math.min(pages - 1, Math.max(0, Number.isInteger(page) ? page : 0));
  return {
    total: matching.length, page: selectedPage, pages,
    games: matching.slice(selectedPage * GAME_PAGE_SIZE, (selectedPage + 1) * GAME_PAGE_SIZE),
  };
}

// The same search ranking drives the small typeahead and the full browser.
// Suggestions remain capped at eight (hard cap twenty), with no results before typing.
export function suggestCatalogGames(entries, query, limit = 8) {
  if (!normaliseCatalogSearch(query)) return { games: [], total: 0 };
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(20, limit)) : 8;
  const matching = searchCatalogEntries(entries, query);
  return { total: matching.length, games: matching.slice(0, safeLimit) };
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
