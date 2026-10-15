#!/usr/bin/env node
"use strict";

// C64 game-page deep links are generated from the same catalogues the browser
// actually reads. Never infer availability from filenames or substring searches.
// A linked title is only SELECTED on arrival: the visitor must press LOAD.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
const audit = process.argv.includes("--audit-json");
const readText = relative => fs.readFileSync(path.join(root, relative), "utf8");
const readJson = relative => JSON.parse(readText(relative));
const usableId = value => /^[a-z0-9][a-z0-9-]{0,100}$/.test(String(value || ""));
const isC64Game = g => g && g.system === "C64" && usableId(g.slug) && g.title;
const approved = e => e && e.approved === true && usableId(e.id)
  && typeof e.title === "string" && e.title.trim().length > 0
  && typeof e.license === "string" && e.license.trim().length > 0
  && typeof e.url === "string" && /^\/emulator\/c64\/media\/(?:cartridge-replacements\/)?[a-z0-9][a-z0-9._-]+$/i.test(e.url)
  && /^[a-f0-9]{64}$/i.test(String(e.sha256 || ""))
  && ["prg", "d64", "d71", "d81", "g64", "tap", "t64", "crt"].includes(e.format);

const playAnchor = id => [
  '<a class="ccg-btn ccg-btn--emulator-play" data-ccg-play-in-emulator="true"',
  ' href="/emulator/c64/?game=' + encodeURIComponent(id) + '"',
  ' aria-label="Play this C64 game in the CCG emulator">',
  '<span class="ccg-btn__icon" aria-hidden="true">&#9654;</span>',
  '<span class="ccg-btn__label">Play in C64 Emulator</span></a>'
].join("");
const anchorPattern = /\s*<a\b(?=[^>]*\bdata-ccg-play-in-emulator="true")[^>]*>[\s\S]*?<\/a>/gi;
const actionsPattern = /(<div class="game-hero__actions ccg-share" data-ccg-share>)([\s\S]*?)(<\/div>)/i;

async function main() {
  const games = readJson("games/games.json");
  const records = readJson("emulator/c64/library.json").entries;
  const { normaliseCatalogSearch, parsePackedCatalog, parseAdditionalCrtCatalog,
    preferSelectedCartridges, PACK_ROOT, ARCHIVE_PACK_ROOT } =
    await import(pathToFileURL(path.join(root, "js/ccg-c64/game-catalog.js")).href);
  const normalise = normaliseCatalogSearch;
  const validGames = games.filter(isC64Game);
  const direct = (Array.isArray(records) ? records : []).filter(approved);
  const warnings = [];
  let regular = direct.slice();
  let extraCount = 0;
  try {
    const extra = parseAdditionalCrtCatalog(readJson(
      "emulator/c64/media/cartridge-replacements/active.json"));
    regular = regular.concat(extra);
    extraCount = extra.length;
  } catch (error) {
    warnings.push("Additional CRT catalogue unavailable: " + error.message);
  }

  let packed = [];
  try {
    const catalogue = parsePackedCatalog(readJson("emulator/c64/media/blast/catalog.json"),
      { packRoot: PACK_ROOT });
    const directKeys = new Set(regular.map(e =>
      e.title.trim().toLocaleLowerCase() + "|" + String(e.format).toLowerCase()));
    packed = catalogue.entries.filter(e =>
      e.title.trim().toLocaleLowerCase() !== "bruce lee" &&
      !directKeys.has(e.title.trim().toLocaleLowerCase() + "|" + e.format));
  } catch (error) {
    warnings.push("Blast catalogue unavailable: " + error.message);
  }

  // The optional PRG archive is NOT available simply because ready.json exists.
  // Its catalogue must match the activation SHA and parser/record-count contract.
  // If a marker exists but its catalogue is absent, empty or corrupt, fail closed
  // for these entries while retaining the working direct, CRT and Blast links.
  let archived = [];
  try {
    const markerFile = path.join(root, "emulator/c64/media/prg-archive/ready.json");
    if (fs.existsSync(markerFile)) {
      const ready = readJson("emulator/c64/media/prg-archive/ready.json");
      if (ready?.version !== 1 || !Number.isInteger(ready.recordCount) ||
          !Number.isInteger(ready.packCount) || ready.recordCount < 1 ||
          ready.packCount < 1 || !/^[a-f0-9]{64}$/i.test(ready.catalogSHA256 || "")) {
        throw new Error("Invalid activation marker");
      }
      const catalogueText = readText("emulator/c64/media/prg-archive/catalog.json");
      const actualHash = crypto.createHash("sha256").update(catalogueText).digest("hex");
      if (actualHash !== ready.catalogSHA256.toLowerCase()) {
        throw new Error("Activation SHA does not match catalogue");
      }
      const parsed = parsePackedCatalog(JSON.parse(catalogueText),
        { packRoot: ARCHIVE_PACK_ROOT });
      if (parsed.entries.length !== ready.recordCount ||
          parsed.packs.length !== ready.packCount) {
        throw new Error("Activation record/pack count mismatch");
      }
      const alreadyListed = new Set([...regular, ...packed].map(e =>
        e.title.trim().toLocaleLowerCase() + "|" + String(e.format).toLowerCase()));
      archived = parsed.entries.filter(e =>
        e.title.trim().toLocaleLowerCase() !== "bruce lee" &&
        !alreadyListed.has(e.title.trim().toLocaleLowerCase() + "|" + e.format));
    }
  } catch (error) {
    warnings.push("Optional PRG archive excluded: " + error.message);
  }

  const preferred = preferSelectedCartridges([...regular, ...packed, ...archived]);
  const mediaByTitle = new Map();
  for (const e of preferred) {
    const key = normalise(e.title);
    mediaByTitle.set(key, [...(mediaByTitle.get(key) || []), e]);
  }
  const gameCounts = new Map();
  for (const g of validGames) {
    const key = normalise(g.title);
    gameCounts.set(key, (gameCounts.get(key) || 0) + 1);
  }
  function emulatorMatch(game) {
    const title = normalise(game.title);
    const matches = mediaByTitle.get(title) || [];
    if (!title || !matches.length) return null;
    const exact = matches.filter(e => e.id === game.slug);
    if (exact.length === 1) return exact[0];
    // When a title has several offered formats, retain the original trusted
    // direct-library entry if unique; otherwise require one unambiguous result.
    if (gameCounts.get(title) !== 1) return null;
    const directMatches = matches.filter(e => direct.some(d => d.id === e.id));
    if (directMatches.length === 1) return directMatches[0];
    if (matches.length === 1) return matches[0];
    return null;
  }

  let changed = 0, linked = 0, missing = 0;
  const mappings = [];
  for (const game of validGames) {
    const expected = emulatorMatch(game);
    if (expected) mappings.push({ slug: game.slug, title: game.title, id: expected.id,
      format: expected.format, source: String(expected.packRoot || "").includes("blast")
        ? "blast" : String(expected.packRoot || "").includes("prg-archive")
        ? "prg-archive" : expected.id.startsWith("owner-crt-more-")
        ? "additional-crt" : "direct" });
    const file = path.join(root, "games", game.slug, "index.html");
    if (!fs.existsSync(file)) { missing++; continue; }
    if (audit) continue;
    const before = fs.readFileSync(file, "utf8");
    let updated = before.replace(anchorPattern, "");
    if (expected) {
      if (!actionsPattern.test(updated)) throw Error("Game hero actions missing: " + game.slug);
      updated = updated.replace(actionsPattern, (_all, start, body, end) =>
        start + body.trimEnd() + "\n                        " +
        playAnchor(expected.id) + "\n                    " + end);
      linked++;
    }
    if (updated !== before) {
      changed++;
      if (check) throw Error("Emulator link output out of date: " + game.slug);
      fs.writeFileSync(file, updated, "utf8");
    }
  }
  if (audit) {
    process.stdout.write(JSON.stringify({ c64Games: validGames.length, direct: direct.length,
      additionalCrt: extraCount, blast: packed.length, prgArchive: archived.length,
      matched: mappings.length, missingPageFiles: missing, warnings, mappings }) + "\n");
  } else {
    console.log("[c64-emulator-links] " + linked + " verified C64 game-page links; " +
      changed + (check ? " unexpected differences" : " pages updated") +
      "; " + missing + " pages absent; " + mappings.length + " eligible matches.");
    for (const warning of warnings) console.warn("[c64-emulator-links] " + warning);
  }
}

main().catch(error => {
  console.error("[c64-emulator-links] " + (error?.stack || error));
  process.exitCode = 1;
});
