#!/usr/bin/env node
"use strict";

// Rebuild-safe integration: link only C64 game pages with an approved,
// SHA-verified matching owner-authorised item in the emulator's direct library.
// No loose title guesses, no emulator media copying and no eager network work.
const fs = require("node:fs");
const path = require("node:path");
// Reuse the publishing pipeline's explicit repository root; tests can
// exercise future game entries in an isolated temporary site without editing main.
const root = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
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
      data.recordCount !== data.games.length || data.games.length > 6000) {
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
// Individually reviewed C64 page-title spellings versus existing approved
// emulator catalogue titles. Never use fuzzy matching for autoplay/editions.
// The source game titles, original media and existing stable IDs stay intact.
const verifiedPageTitleAliases = new Map([
  ["bcs-quest-for-tires",["BC's Quest For Tires","owner-crt-more-bcsquestfortires-e801a4272e1d"]],
  ["bc2-grogs-revenge",["BC II - Grog's Revenge","owner-crt-more-bc-ii-grogs-revenge"]],
  ["beach-head-2",["Beach-head 2","blast-0180"]],
  ["boulder-dash",["Boulderdash","blast-0260"]],
  ["the-captive",["Captive, The","owner-crt-more-captive-the"]],
  ["ghetto-blaster",["Ghettoblaster","owner-crt-more-ghettoblaster"]],
  ["the-great-escape",["Great Escape, The","owner-crt-more-great-escape-the"]],
  ["halls-of-the-things",["Halls of the Things, The","owner-crt-more-halls-of-the-things-the"]],
  ["the-hitchhikers-guide-to-the-galaxy",["Hitchhiker's Guide to the Galaxy, The","archive-04070"]],
  ["jack-the-nipper-2-in-coconut-capers",["Jack the Nipper 2 - In Coconut Capers","archive-04412"]],
  ["the-last-ninja",["Last Ninja, The","owner-crt-more-last-ninja-the"]],
  ["leader-board",["Leaderboard","owner-crt-more-leaderboard"]],
  ["the-lords-of-midnight",["Lords of Midnight","owner-crt-more-lords-of-midnight"]],
  ["the-movie-monster-game",["Movie Monster Game, The","archive-05771"]],
  ["the-official-father-christmas",["Official Father Christmas, The","owner-crt-more-officialfatherchristmasthe-b87bc59b307d"]],
  ["pitfall-2-lost-caverns",["Pitfall 2 - Lost Caverns","archive-06519"]],
  ["the-prince",["Prince, The","owner-crt-more-princethe-2cf0124d5000"]],
  ["the-sacred-armour-of-antiriad",["Sacred Armour of Antiriad, The","owner-crt-more-sacred-armour-of-antiriad-the"]],
  ["the-staff-of-karnath",["Staff of Karnath, The","owner-crt-more-staff-of-karnath-the"]],
  ["summer-games-2",["Summer Games 2","blast-1566"]],
  ["the-sword-of-fargoal",["Sword of Fargoal, The","owner-crt-more-sword-of-fargoal-the"]],
  ["thunder-blade",["Thunderblade","owner-crt-more-thunderblade"]],
  ["through-the-trap-door",["Through the Trapdoor","owner-crt-more-through-the-trapdoor"]],
  ["up-n-down",["Up 'n Down","archive-09161"]],
  ["water-polo",["Waterpolo","owner-crt-more-waterpolo"]],
  ["the-way-of-the-exploding-fist",["Way of the Exploding Fist, The","owner-crt-more-way-of-the-exploding-fist-the"]],
  ["the-willow-pattern-adventure",["Willow Pattern Adventure, The","owner-crt-more-willow-pattern-adventure-the"]],
  ["wonder-boy",["Wonderboy","owner-crt-more-wonderboy-8ec329e8ba3d"]],
  ["the-wombles",["Wombles, The","owner-crt-more-womblesthe-eeeeb83dbe3e"]],
  ["the-transformers",["Transformers","owner-crt-more-transformers"]],
  ["the-trap-door",["Trap Door, The","owner-crt-more-trapdoorthe-f9e40ebe1021"]],
]);

function emulatorMatch(game) {
  const title = normalise(game.title);
  const literalMatches = mediaByTitle.get(title) || [];
  const auditedAlias = verifiedPageTitleAliases.get(game.slug);
  const matches = literalMatches.length ? literalMatches :
    (auditedAlias ? (mediaByTitle.get(normalise(auditedAlias[0])) || [])
      .filter(entry => entry.id === auditedAlias[1]) : []);
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
  ' href="/emulator/c64/?game=' + encodeURIComponent(id) + '&amp;autoplay=1"',
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
  if (!fs.existsSync(file)) {
    missing++;
    throw new Error("Generated C64 game page missing; cannot verify emulator link: " + game.slug);
  }
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
