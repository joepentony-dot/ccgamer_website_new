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

const normalise = value => String(value || "").normalize("NFKD").toLowerCase()
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const usableId = value => /^[a-z0-9][a-z0-9-]{0,100}$/.test(String(value || ""));
const isC64Game = g => g && g.system === "C64" && usableId(g.slug) && g.title;
const approved = e => e && e.approved === true && usableId(e.id)
  && typeof e.title === "string" && e.title.trim().length > 0
  && typeof e.license === "string" && e.license.trim().length > 0
  && typeof e.url === "string" && /^\/emulator\/c64\/media\/[a-z0-9][a-z0-9._-]+$/i.test(e.url)
  && /^[a-f0-9]{64}$/i.test(String(e.sha256 || ""))
  && ["prg", "d64", "d71", "d81", "g64", "tap", "t64", "crt"].includes(e.format);

const validGames = games.filter(isC64Game);
const validMedia = records.filter(approved);
const gameCounts = new Map();
const mediaByTitle = new Map();
for (const g of validGames) {
  const key = normalise(g.title);
  gameCounts.set(key, (gameCounts.get(key) || 0) + 1);
}
for (const e of validMedia) {
  const key = normalise(e.title);
  mediaByTitle.set(key, [...(mediaByTitle.get(key) || []), e]);
}

function emulatorMatch(game) {
  const title = normalise(game.title);
  const matches = mediaByTitle.get(title) || [];
  if (!title || !matches.length) return null;
  const exact = matches.filter(e => e.id === game.slug);
  if (exact.length === 1) return exact[0];
  // Only unique exact-title matches can use a different emulator ID.
  if (gameCounts.get(title) === 1 && matches.length === 1) return matches[0];
  return null;
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
      start + body + "\n                        " + playAnchor(expected.id) + "\n                    " + end);
    linked++;
  }
  if (updated !== before) {
    changed++;
    if (check) throw Error("Emulator link output out of date: " + game.slug);
    fs.writeFileSync(file, updated, "utf8");
  }
}
console.log("[c64-emulator-links] "+ linked +" verified C64 game-page links; "+changed+
  (check ? " unexpected differences" : " pages updated") + "; "+missing+" pages absent.");
