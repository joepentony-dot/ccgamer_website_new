#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { parsePackedCatalog, PACK_CATALOG_URL, ARCHIVE_READY_URL,
  ADDITIONAL_CRT_CATALOG_URL, parseAdditionalCrtCatalog,
  preferSelectedCartridges, catalogGameIdentity } from "../js/ccg-c64/game-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "js/ccg-c64/app.js"), "utf8");
const direct = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/library.json"), "utf8"));
const blast = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/media/blast/catalog.json"), "utf8"));
const moreCrt = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/media/cartridge-replacements/active.json"), "utf8"));
const begin = app.indexOf("async function initialiseOnlineLibrary() {");
const end = app.indexOf("async function loadSelectedLibraryEntry()", begin);
assert(begin >= 0 && end > begin, "Library startup must be identifiable");
const code = app.slice(begin, end) + "\nglobalThis.startLibrary = initialiseOnlineLibrary;";

async function execute(catalogueAvailable, activateExtraCrt = false) {
  const statuses = {};
  const fetchRequests = [];
  const context = vm.createContext({
    onlineLibraryGrid: {},
    onlineLibraryStatus: { textContent: "" },
    onlineLibrarySearch: { value: "" },
    onlineLibraryEntries: [],
    onlineLibraryPanel: { hidden: true },
    onlineLibraryRetryButton: { hidden: true },
    onlineLibraryCount: { textContent: "" },
    controlsDeck: { classList: { toggle() {} } },
    SUPPORTED_MEDIA_TYPES: new Set(["prg", "d64", "crt", "tap", "t64", "d71", "d81", "g64"]),
    PACK_CATALOG_URL,
    ARCHIVE_READY_URL,
    ADDITIONAL_CRT_CATALOG_URL,
    parseAdditionalCrtCatalog,
    parsePackedCatalog,
    preferSelectedCartridges,
    catalogGameIdentity,
    refreshOnlineLibrarySuggestions() { statuses.refreshed = true; },
    updateSelectedLibraryGame() { statuses.selectionUpdated = true; },
    console: { warn(...message) { statuses.warning = message; } },
    fetch: async (url, opts) => {
      fetchRequests.push({ url, opts });
      if (opts?.method === "HEAD") {
        throw new Error("HEAD denied by CDN"); // All old results would disappear.
      }
      if (url === "/emulator/c64/library.json") {
        return { ok: true, json: async () => direct };
      }
      if (url === ADDITIONAL_CRT_CATALOG_URL) {
        return activateExtraCrt
          ? { ok: true, json: async () => moreCrt }
          : { ok: false, status: 404 };
      }
      if (url === ARCHIVE_READY_URL) {
        return { ok: false, status: 404 }; // No optional archive media is published yet.
      }
      if (url === PACK_CATALOG_URL) {
        return catalogueAvailable
          ? { ok: true, json: async () => blast }
          : { ok: false, status: 503 };
      }
      throw new Error("Unexpected URL: " + url);
    },
  });
  vm.runInContext(code, context);
  await context.startLibrary();
  return { context, statuses, fetchRequests };
}

const good = await execute(true);
assert.equal(blast.recordCount, 1878);
assert.equal(direct.entries.length, 222,
  "Retain 70 original directly hosted games plus 152 owner-approved CRT replacements");
assert.equal(direct.entries.filter(item => item.preferOverOtherFormats === true).length, 153,
  "152 new CRT-first entries and existing Pirates! preference must survive");
const musketeer = direct.entries.find(entry => entry.id === "musketeer");
assert(musketeer && musketeer.title === "Musketeer" && musketeer.format === "d64" &&
  musketeer.url === "/emulator/c64/media/musketeer.d64" &&
  musketeer.bytes === 174848 && musketeer.approved,
  "Musketeer must be present with its exact C64 disk location");
for (const [id, title] of [
  ["pirates", "Pirates!"], ["creatures", "Creatures"],
  ["creatures-2", "Creatures 2"], ["defender-of-the-crown", "Defender of the Crown"],
  ["curse-of-the-azure-bonds", "Curse of the Azure Bonds"],
  ["turrican-trilogy", "Turrican Trilogy"], ["tusker", "Tusker"],
  ["below-the-root", "Below the Root"], ["a-pig-quest", "A Pig Quest"],
  ["arcade-daze", "Arcade Daze"],
]) {
  const game = direct.entries.find(entry => entry.id === id);
  assert(game && game.title === title && game.format === "crt" &&
    game.url === "/emulator/c64/media/" + id + ".crt" && game.approved,
    "Verified EasyFlash title must remain published at its exact local URL: " + id);
}
assert.equal(good.context.onlineLibraryEntries.length, 2010,
  "All distinct playable titles must remain available, with five duplicate identities shown once");
assert.equal(good.context.onlineLibraryStatus.textContent, "2,010 READY");
assert.equal(good.context.onlineLibraryRetryButton.hidden, true);
assert.equal(good.context.onlineLibraryPanel.hidden, false);
assert.equal(good.fetchRequests.length, 4, "Direct, optional CRT, Blast and archive activation are probed once");
assert.equal(good.fetchRequests.filter(r => r.url === ARCHIVE_READY_URL).length, 1, "Absent archive activation must be checked once");
assert(good.fetchRequests.every(r => r.opts.method !== "HEAD"));
assert.equal(good.statuses.refreshed, true);

const failed = await execute(false);
assert.equal(failed.context.onlineLibraryEntries.length, 221,
  "Direct CRT-first games must survive pack errors while hiding the duplicate Myth disk listing");
assert.match(failed.context.onlineLibraryStatus.textContent, /BLAST UNAVAILABLE/);
assert.match(failed.context.onlineLibraryCount.textContent, /retry/i);
assert.equal(failed.context.onlineLibraryRetryButton.hidden, false);
assert(failed.statuses.warning, "A catalogue failure must be logged instead of swallowed");

// The expanded 2,064-file cartridge manifest must suppress exact
// matching packed PRGs, not just validate as static JSON. Broken deployments
// must fall back to all original games (tested above with a 404 response).
const activated = await execute(true, true);
assert.equal(moreCrt.recordCount, 2064);
assert(activated.context.onlineLibraryEntries.filter(e =>
  e.id.startsWith("owner-crt-more-")).length >= 2040,
  "Expanded owner CRT catalogue must preserve existing selections and expose new individual games");
for (const title of ["10th Frame", "1943 - The Battle of Midway", "Zzzz"]) {
  const entries = activated.context.onlineLibraryEntries.filter(e => e.title === title);
  assert.equal(entries.length, 1, "Only the chosen CRT may remain visible for " + title);
  assert.equal(entries[0].format, "crt");
  assert(entries[0].preferOverOtherFormats === true);
}
assert.equal(activated.fetchRequests.filter(x =>
  x.url === ADDITIONAL_CRT_CATALOG_URL).length, 1);

console.log("PASS: 2010 distinct selectable library entries appear without HEAD; owner-authorised CRTs survive catalogue errors, and retry is exposed.");

// CCG_BATCH_VERIFIED_MEDIA â€” owner-supplied individual disks and every swap side.
const verifiedBatchGames = [{"id":"knight-n-grail-preview","title":"Knight \u0027n\u0027 Grail (Preview)"},{"id":"rodland","title":"Rodland"},{"id":"the-castles-of-dr-creep","title":"The Castles of Dr. Creep"},{"id":"myth-history-in-the-making","title":"Myth: History in the Making"},{"id":"rick-dangerous-2","title":"Rick Dangerous 2"},{"id":"slicks","title":"Slicks"},{"id":"x-out","title":"X-Out"},{"id":"racing-destruction-set","title":"Racing Destruction Set"},{"id":"tass-times-in-tonetown","title":"Tass Times in Tonetown"},{"id":"boulder-dash-construction-kit","title":"Boulder Dash Construction Kit"},{"id":"the-bards-tale","title":"The Bard\u0027s Tale"},{"id":"oil-imperium","title":"Oil Imperium"},{"id":"silent-service","title":"Silent Service"},{"id":"ultimate-wizard","title":"Ultimate Wizard"},{"id":"the-bards-tale-iii","title":"The Bard\u0027s Tale III: Thief of Fate"},{"id":"puzzle-bobble","title":"Puzzle Bobble"},{"id":"champions-of-krynn","title":"Champions of Krynn"},{"id":"california-games","title":"California Games"},{"id":"katakis","title":"Katakis"},{"id":"world-games","title":"World Games"},{"id":"kennedy-approach","title":"Kennedy Approach"},{"id":"hessian","title":"Hessian"},{"id":"soul-force","title":"Soul Force"},{"id":"lords-of-conquest","title":"Lords of Conquest"},{"id":"times-of-lore","title":"Times of Lore"},{"id":"supremacy","title":"Supremacy: Your Will Be Done"},{"id":"strike-fleet","title":"Strike Fleet"},{"id":"the-legend-of-blacksilver","title":"The Legend of Blacksilver"},{"id":"killed-until-dead","title":"Killed Until Dead"},{"id":"pool-of-radiance","title":"Pool of Radiance"},{"id":"ultima-iii-exodus","title":"Ultima III: Exodus"},{"id":"buck-rogers-countdown-to-doomsday","title":"Buck Rogers: Countdown to Doomsday"},{"id":"briley-witch-chronicles","title":"Briley Witch Chronicles"},{"id":"project-firestart","title":"Project Firestart"},{"id":"legacy-of-the-ancients","title":"Legacy of the Ancients"},{"id":"project-stealth-fighter","title":"Project Stealth Fighter"}];
const { createHash: batchHash } = await import("node:crypto");
for (const expected of verifiedBatchGames) {
  const game = direct.entries.find(item => item.id === expected.id);
  assert(game && game.title === expected.title && game.approved === true,
    "Missing or renamed approved batch game: " + expected.id);
  const sides = Array.isArray(game.disks) && game.disks.length >= 2 ? game.disks : [game];
  assert.equal(sides[0].url, game.url, "The game's boot side must be listed first: " + expected.id);
  for (const side of sides) {
    assert(/^\/emulator\/c64\/media\/[a-z0-9.-]+\.(?:d64|crt)$/.test(side.url),
      "Batch disk must have a secure root-relative media URL: " + expected.id);
    const filename = path.join(root, side.url.slice(1));
    const raw = fs.readFileSync(filename);
    assert.equal(raw.length, side.bytes, "Batch media size changed: " + side.filename);
    assert.equal(batchHash("sha256").update(raw).digest("hex"), side.sha256,
      "Batch media SHA-256 changed: " + side.filename);
  }
}

// CCG_BATCH3_VERIFIED_MEDIA: 15 additional owner-supplied titles and all their disk sides.
const batch3Expected = [{"title":"Last Ninja 2","id":"last-ninja-2","sourceMedia":[{"url":"/emulator/c64/media/last-ninja-2-disk-1.d64","sha256":"38d2a7f244992ff36f7001c940037dab45a550d9b1e7bcc3834f4eec40e85ba1","filename":"last-ninja-2-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/last-ninja-2-disk-2.d64","sha256":"07dbea9b5fe9bf3b3a87a3d8dc51c0633176f9e28d601df55b24624cca0e7962","filename":"last-ninja-2-disk-2.d64","bytes":174848}]},{"title":"Red Storm Rising","id":"red-storm-rising","sourceMedia":[{"url":"/emulator/c64/media/red-storm-rising.crt","sha256":"0bce16722539abf7d4637d474229f15121c8054adcd5d1d2a4c7e730e4c6193f","filename":"red-storm-rising.crt","bytes":664912}]},{"title":"Ghosts \u0027n Goblins Arcade","id":"ghosts-n-goblins-arcade","sourceMedia":[{"url":"/emulator/c64/media/ghosts-n-goblins-arcade.crt","sha256":"4d3f65c2c945d5a0e21ec764199be64e6999d7fb1428674800d1be6751d4ae08","filename":"ghosts-n-goblins-arcade.crt","bytes":229888}]},{"title":"Wasteland","id":"wasteland","sourceMedia":[{"url":"/emulator/c64/media/wasteland.crt","sha256":"b72b8425de8bd0d4707e2d04d0573bfa51db0c0c9cef33740137f7caf69458e5","filename":"wasteland.crt","bytes":1050688}]},{"title":"Ultima IV: Quest of the Avatar","id":"ultima-iv-quest-of-the-avatar","sourceMedia":[{"url":"/emulator/c64/media/ultima-iv-quest-of-the-avatar-disk-1.d64","sha256":"7efd0e7c3d06342722c63eb036adae7b2e3cf92de8214c2a85cd9ae855f25118","filename":"ultima-iv-quest-of-the-avatar-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-iv-quest-of-the-avatar-disk-2.d64","sha256":"01148f5348737607b39590136aa739ef136599625871eb8e28e7d4cf660dac27","filename":"ultima-iv-quest-of-the-avatar-disk-2.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-iv-quest-of-the-avatar-disk-3.d64","sha256":"7943b483c80d75d898e7ff4d30735d88eaa0c39ed106241ab2aa6efcd148aaab","filename":"ultima-iv-quest-of-the-avatar-disk-3.d64","bytes":174848}]},{"title":"Bomberland","id":"bomberland","sourceMedia":[{"url":"/emulator/c64/media/bomberland.d64","sha256":"e3ed1709d9b106732bb1e78b6bf9d14a0d9267355b3ecf178a7fb8f9719fe60a","filename":"bomberland.d64","bytes":174848}]},{"title":"Zak McKracken and the Alien Mindbenders","id":"zak-mckracken-and-the-alien-mindbenders","sourceMedia":[{"url":"/emulator/c64/media/zak-mckracken-and-the-alien-mindbenders-disk-1.d64","sha256":"f16f95e8a34de5241f484aaf5e28b43289cb6b2cb7cad645d8da51d6551c3c28","filename":"zak-mckracken-and-the-alien-mindbenders-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/zak-mckracken-and-the-alien-mindbenders-disk-2.d64","sha256":"34f51b28200c134ef4e1435ad77771c02d39fff8da358e2f26111f852ab5ee88","filename":"zak-mckracken-and-the-alien-mindbenders-disk-2.d64","bytes":174848},{"url":"/emulator/c64/media/zak-mckracken-and-the-alien-mindbenders-disk-3.d64","sha256":"ad93cc9bc3dddf01f651b584f120e0957df4ad0339ce2898e8999c6a0ee8a76f","filename":"zak-mckracken-and-the-alien-mindbenders-disk-3.d64","bytes":174848}]},{"title":"Maniac Mansion","id":"maniac-mansion","sourceMedia":[{"url":"/emulator/c64/media/maniac-mansion-disk-1.d64","sha256":"aa6898d3a053ee5b2cc1823f68b64aad7c20d7e813d24b50f76c742a48333a01","filename":"maniac-mansion-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/maniac-mansion-disk-2.d64","sha256":"5372c01e38b4cc0c0e809634c605312f418b10706e6a67e1c8b556c2863a31d6","filename":"maniac-mansion-disk-2.d64","bytes":174848}]},{"title":"Sonic the Hedgehog","id":"sonic-the-hedgehog","sourceMedia":[{"url":"/emulator/c64/media/sonic-the-hedgehog-disk-1.d64","sha256":"8bf81014da548e78094317450e2600afc9a4ede7bd274f5f5752ea310467bb3e","filename":"sonic-the-hedgehog-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/sonic-the-hedgehog-disk-2.d64","sha256":"36913ea98f419cd615e4e14f78bbf09550a58b867c06fb67fd055517970c04b1","filename":"sonic-the-hedgehog-disk-2.d64","bytes":174848}]},{"title":"Neuromancer","id":"neuromancer","sourceMedia":[{"url":"/emulator/c64/media/neuromancer.d81","sha256":"a728126a3045bc6da1a06a70638b15c96826bfc455bcc565956ac6054141336d","filename":"neuromancer.d81","bytes":819200}]},{"title":"Laser Squad","id":"laser-squad","sourceMedia":[{"url":"/emulator/c64/media/laser-squad.d64","sha256":"47e2bfb6efee7a2d544e1f08494c7c6ab3031ceed4162042285cb1609c6318e5","filename":"laser-squad.d64","bytes":174848}]},{"title":"World Class Leaderboard","id":"world-class-leaderboard","sourceMedia":[{"url":"/emulator/c64/media/world-class-leaderboard-disk-1.d64","sha256":"32b6e5cc33b3b507f3abc0601fab0e6e7639ea944d178cba57ce64146fb2ff83","filename":"world-class-leaderboard-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/world-class-leaderboard-disk-2.d64","sha256":"e7e324ee253e3d6a702ad9244a5769b9f051e99c2b19cfbd152b011b8b76e689","filename":"world-class-leaderboard-disk-2.d64","bytes":174848}]},{"title":"Metal Warrior 4: Agents of Metal","id":"metal-warrior-4-agents-of-metal","sourceMedia":[{"url":"/emulator/c64/media/metal-warrior-4-agents-of-metal-disk-1.d64","sha256":"354c0dac95db8bb4cf0362566347f100b48946123771755a50cfa98b75c8b2c5","filename":"metal-warrior-4-agents-of-metal-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/metal-warrior-4-agents-of-metal-disk-2.d64","sha256":"9b1e59f7b2b837172996d778098d6491ce1225c8d0eaac92b0f953f4182699a3","filename":"metal-warrior-4-agents-of-metal-disk-2.d64","bytes":174848}]},{"title":"Commando Arcade Special Edition","id":"commando-arcade-special-edition","sourceMedia":[{"url":"/emulator/c64/media/commando-arcade-special-edition.crt","sha256":"a6dd99b55a02680ad95336fcfcd3fd709f0ff610816eb739bb1da2a4c866126e","filename":"commando-arcade-special-edition.crt","bytes":221680}]},{"title":"Ultima V: Warriors of Destiny","id":"ultima-v-warriors-of-destiny","sourceMedia":[{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-1.d64","sha256":"5ef48720e1b8da8cbb0b5e3ec2e5a9cf660ad81037165b8272dba4be8612ef67","filename":"ultima-v-warriors-of-destiny-disk-1.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-2.d64","sha256":"c4374489e2acc16350f6c4d577556aa288b401227d7bd64cf8b890492758343e","filename":"ultima-v-warriors-of-destiny-disk-2.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-3.d64","sha256":"d9ce23afe61edd428d627cd0fed849d1cf4e2f4ca7a608c816734e03f1b2d8b3","filename":"ultima-v-warriors-of-destiny-disk-3.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-4.d64","sha256":"1095d4b75b618dce08c52ab7b53f169728aaa5709b810289ab6f829c4daa670d","filename":"ultima-v-warriors-of-destiny-disk-4.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-5.d64","sha256":"c9f0fa1cba6cfb7e13a3801944568c468259f3bcbc4dedaa4d0c8148eb3025aa","filename":"ultima-v-warriors-of-destiny-disk-5.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-6.d64","sha256":"e5494da28fc2a3b02774a4afd65893cc2e7cb27681b99424e629cdaa285d9d8c","filename":"ultima-v-warriors-of-destiny-disk-6.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-7.d64","sha256":"d23ecddeffc77f0af2ada2607bc25246288932584a8f1ff101058bf2cdc04677","filename":"ultima-v-warriors-of-destiny-disk-7.d64","bytes":174848},{"url":"/emulator/c64/media/ultima-v-warriors-of-destiny-disk-8.d64","sha256":"15db166172c261d0dfc6c7e9837d499191effb67f628ca525cb033e3b0b4eed3","filename":"ultima-v-warriors-of-destiny-disk-8.d64","bytes":174848}]}];
const { createHash: batch3Hash } = await import('node:crypto');
for (const expected of batch3Expected) {
  const entry = direct.entries.find(item => item.id === expected.id);
  assert(entry && entry.title === expected.title && entry.approved,
    'Missing or renamed approved batch-3 game: '+expected.id);
  const sides = entry.disks?.length > 1 ? entry.disks : [entry];
  assert.equal(sides.length, expected.sourceMedia.length,
    'Wrong number of disk sides: '+expected.id);
  assert.equal(entry.url, expected.sourceMedia[0].url,
    'The first game disk must be the boot disk: '+expected.id);
  for (let i=0; i<sides.length; i++) {
    const side = sides[i], pinned = expected.sourceMedia[i];
    assert.equal(side.url, pinned.url, 'Side order changed: '+expected.id);
    assert.equal(side.sha256, pinned.sha256, 'SHA-256 manifest changed: '+pinned.filename);
    const bytes = fs.readFileSync(path.join(root, pinned.url.slice(1)));
    assert.equal(bytes.length, pinned.bytes, 'Byte size changed: '+pinned.filename);
    assert.equal(batch3Hash('sha256').update(bytes).digest('hex'), pinned.sha256,
      'Source-verified game media changed: '+pinned.filename);
  }
}
