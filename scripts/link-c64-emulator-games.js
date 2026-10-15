#!/usr/bin/env node
"use strict";

// Rebuild-safe integration: link only C64 game pages with an approved,
// SHA-verified matching owner-authorised item in the emulator's direct library.
// No loose title guesses, no emulator media copying and no eager network work.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
const games = JSON.parse(fs.readFileSync(path.join(root, "games/games.json"), "utf8"));
const library = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/library.json"), "utf8"));
const records = Array.isArray(library.entries) ? library.entries : [];

// Mirror the emulator's catalogue title normalisation (no substring guesses).
const normalise = value => String(value || "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
  .replace(/['\u2018\u2019\u0060]/g, "").replace(/[^a-zA-Z0-9]+/g, " ")
  .trim().replace(/\s+/g, " ").toLowerCase();
const usableId = value => /^[a-z0-9][a-z0-9-]{0,100}$/.test(String(value || ""));
const isC64Game = g => g && g.system === "C64" && usableId(g.slug) && g.title;
const sha256 = value => require("node:crypto").createHash("sha256").update(value).digest("hex");
const mediaRoot = path.join(root, "emulator/c64/media");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const safeFile = (relativePath, bytes) => {
  const full = path.join(mediaRoot, relativePath);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;
  return bytes === undefined || fs.statSync(full).size === bytes;
};
const approved = e => e && e.approved === true && usableId(e.id)
  && typeof e.title === "string" && e.title.trim().length > 0
  && typeof e.license === "string" && e.license.trim().length > 0
  && typeof e.url === "string" && /^\/emulator\/c64\/media\/(?:cartridge-replacements\/)?[a-z0-9][a-z0-9._-]+$/i.test(e.url)
  && /^[a-f0-9]{64}$/i.test(String(e.sha256 || ""))
  && ["prg", "d64", "d71", "d81", "g64", "tap", "t64", "crt"].includes(e.format)
  && safeFile(e.url.slice("/emulator/c64/media/".length), e.bytes);

function activatedCartridges() {
  const file = path.join(mediaRoot, "cartridge-replacements/active.json");
  if (!fs.existsSync(file)) return [];
  const data = readJson(file);
  if (data.version !== 1 || data.ownerRedistributionAttested !== true ||
      data.originalFormatsPreserved !== true || !Array.isArray(data.games) ||
      data.recordCount !== data.games.length || data.games.length > 2000) {
    throw new Error("Invalid owner-approved CRT activation manifest.");
  }
  return data.games.map(row => {
    if (!Array.isArray(row) || row.length !== 5) throw new Error("Invalid CRT row.");
    const [title, filename, bytes, digest, hardwareType] = row;
    if (!title || typeof title !== "string" ||
        !/^[a-z0-9-]+\.crt$/.test(filename) ||
        !Number.isSafeInteger(bytes) || bytes < 80 || bytes > 8 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/i.test(digest) || ![0, 19, 32].includes(hardwareType) ||
        !safeFile("cartridge-replacements/" + filename, bytes)) {
      throw new Error("CRT manifest media missing or invalid: " + String(filename));
    }
    return {
      id: "owner-crt-more-" + filename.slice(0, -4),
      title, format: "crt", approved: true, source: "owner-crt",
    };
  });
}

// These are the same two immutable PRG pack catalogues used by the live emulator.
// The optional archive is eligible ONLY after its active ready marker matches
// the catalogue SHA-256 and all referenced packs are present at expected sizes.
function packedEntries(relative, markerRequired = false) {
  const catalogFile = path.join(mediaRoot, relative, "catalog.json");
  if (!fs.existsSync(catalogFile)) return [];
  const bytes = fs.readFileSync(catalogFile);
  const data = JSON.parse(bytes.toString("utf8"));
  if (data.version !== 2 || !Array.isArray(data.packs) ||
      !Array.isArray(data.games) || data.recordCount !== data.games.length ||
      data.games.length > 12000 || data.packs.length > 128) {
    throw new Error("Invalid C64 packed catalogue: " + relative);
  }
  if (markerRequired) {
    const readyFile = path.join(mediaRoot, relative, "ready.json");
    if (!fs.existsSync(readyFile)) return [];
    const ready = readJson(readyFile);
    if (ready.version !== 1 || ready.recordCount !== data.games.length ||
        ready.packCount !== data.packs.length ||
        ready.catalogSHA256 !== sha256(bytes)) {
      throw new Error("Inactive or corrupt packed archive: " + relative);
    }
  }
  data.packs.forEach(pack => {
    if (!pack || !/^pack-\d{2}\.bin$/.test(pack.file) ||
        !Number.isSafeInteger(pack.bytes) || pack.bytes < 1 ||
        pack.bytes > 8 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/i.test(pack.sha256) ||
        !safeFile(relative + "/" + pack.file, pack.bytes)) {
      throw new Error("Missing or invalid pack in " + relative);
    }
  });
  const ids = new Set();
  return data.games.map(row => {
    if (!Array.isArray(row) || row.length !== 7) throw new Error("Invalid packed row.");
    const [id, title, format, index, offset, length, digest] = row;
    const pack = data.packs[index];
    if (!usableId(id) || ids.has(id) || typeof title !== "string" || !title.trim() ||
        !["prg", "d64", "d71", "d81", "g64", "tap", "t64", "crt"].includes(format) ||
        !pack || !Number.isSafeInteger(offset) || offset < 0 ||
        !Number.isSafeInteger(length) || length < 3 ||
        offset + length > pack.bytes || !/^[a-f0-9]{64}$/i.test(digest)) {
      throw new Error("Invalid packed game in " + relative + ": " + String(id));
    }
    ids.add(id);
    return { id, title, format, source: relative };
  });
}

const validGames = games.filter(isC64Game);
const validMedia = records.filter(approved);
const additionalCRT = activatedCartridges();
const blast = packedEntries("blast");
const archive = packedEntries("prg-archive", true);

// Respect the runtime's Bruce Lee exclusion and same-format de-duplication.
// Preserving the full original media library keeps every fallback intact.
const directKeys = new Set([...validMedia, ...additionalCRT].map(e =>
  e.title.trim().toLocaleLowerCase() + "|" + e.format));
const packed = blast.filter(e =>
  e.title.trim().toLocaleLowerCase() !== "bruce lee" &&
  !directKeys.has(e.title.trim().toLocaleLowerCase() + "|" + e.format));
const seen = new Set([...directKeys, ...packed.map(e =>
  e.title.trim().toLocaleLowerCase() + "|" + e.format)]);
const activatedArchive = archive.filter(e => {
  const key = e.title.trim().toLocaleLowerCase() + "|" + e.format;
  if (e.title.trim().toLocaleLowerCase() === "bruce lee" || seen.has(key)) return false;
  seen.add(key);
  return true;
});
const gameCounts = new Map();
const mediaByTitle = new Map();
for (const g of validGames) {
  const key = normalise(g.title);
  gameCounts.set(key, (gameCounts.get(key) || 0) + 1);
}
const priority = { crt: 0, prg: 1, d64: 2, d71: 3, d81: 4, g64: 5, t64: 6, tap: 7 };
for (const entry of [...validMedia, ...additionalCRT, ...packed, ...activatedArchive]) {
  const key = normalise(entry.title);
  mediaByTitle.set(key, [...(mediaByTitle.get(key) || []), entry]);
}
function emulatorMatch(game) {
  const title = normalise(game.title);
  const matches = mediaByTitle.get(title) || [];
  if (!title || !matches.length) return null;
  // Duplicate archive titles require an exact slug identity; never guess.
  if (gameCounts.get(title) !== 1) {
    const exact = matches.filter(e => e.id === game.slug);
    return exact.length === 1 ? exact[0] : null;
  }
  const best = Math.min(...matches.map(e => priority[e.format] ?? 99));
  const preferred = matches.filter(e => (priority[e.format] ?? 99) === best);
  // Direct approved files precede extra CRT, Blast and optional packed PRGs.
  // A tie at the same priority needs an exact ID or is deliberately unlinked.
  if (preferred.length === 1) return preferred[0];
  const exact = preferred.filter(e => e.id === game.slug);
  if (exact.length === 1) return exact[0];
  const direct = preferred.filter(e => validMedia.includes(e));
  return direct.length === 1 ? direct[0] : null;
}

const playAnchor = id => [
  '<a class="ccg-btn ccg-btn--emulator-play" data-ccg-play-in-emulator="true"',
  ' href="/emulator/c64/?game=' + encodeURIComponent(id) + '"',
  ' aria-label="Play this C64 game in the CCG emulator">',
  '<span class="ccg-btn__icon" aria-hidden="true">&#9654;</span>',
  '<span class="ccg-btn__label">Play in C64 Emulator</span></a>'
].join("");
const anchorPattern = /\s*<a\b(?=[^>]*\bdata-ccg-play-in-emulator="true")[^>]*>[\s\S]*?<\/a>/gi;
const actionsPattern = /(<div class="game-hero__actions ccg-share" data-ccg-share>)([\s\S]*?)(<\/div>)/i;
let changed = 0;
let linked = 0;
let missing = 0;
for (const game of validGames) {
  const file = path.join(root, "games", game.slug, "index.html");
  if (!fs.existsSync(file)) { missing++; continue; }
  const before = fs.readFileSync(file, "utf8");
  const expected = emulatorMatch(game);
  let updated = before.replace(anchorPattern, "");
  if (expected) {
    if (!actionsPattern.test(updated)) throw Error("Game hero actions missing: " + game.slug);
    updated = updated.replace(actionsPattern, (_all, start, body, end) =>
      start + body.trimEnd() + "\n                        " + playAnchor(expected.id) + "\n                    " + end);
    linked++;
  }
  if (updated !== before) {
    changed++;
    if (check) throw Error("Emulator link output out of date: " + game.slug);
    fs.writeFileSync(file, updated, "utf8");
  }
}
console.log("[c64-emulator-links] "+ linked +" C64 game-page links (CRT > PRG > D64; direct/active/packed); "+changed+
  (check ? " unexpected differences" : " pages updated") + "; "+missing+" pages absent.");
