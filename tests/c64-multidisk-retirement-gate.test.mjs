#!/usr/bin/env node
"use strict";
// Safety gate for the six remaining direct D64-to-CRT candidates.
// Cartridge CPU startup alone does not establish successful later-level loading.
// Do not retire multi-disk media unless a separate full-flow test has passed.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
const library = JSON.parse(readFileSync("emulator/c64/library.json","utf8"));
const manifest = JSON.parse(readFileSync("emulator/c64/media/cartridge-replacements/active.json","utf8"));
const expected = new Map([
  ["x-out", ["X-Out",2]], ["world-games", ["World Games",2]],
  ["strike-fleet", ["Strike Fleet",2]], ["killed-until-dead", ["Killed Until Dead",2]],
  ["project-firestart", ["Project Firestart",3]],
  ["project-stealth-fighter", ["Project Stealth Fighter",2]],
]);
assert.equal(manifest.recordCount,manifest.games.length);
let sides = 0;
for (const [id,[title,count]] of expected) {
  const legacy = library.entries.find(e => e.id === id);
  assert(legacy && legacy.title === title && legacy.format === "d64",
    "Multidisk legacy entry missing before acceptance: " + id);
  assert(Array.isArray(legacy.disks) && legacy.disks.length === count,
    "Multidisk sides missing: " + id);
  assert.equal(legacy.url,legacy.disks[0].url,
    "Boot side mismatch: " + id);
  const replacement = manifest.games.filter(row => row[0] === title);
  assert.equal(replacement.length,1,"No unique CRT alternative: " + title);
  const [crtTitle, crtFile, crtBytes, crtHash] = replacement[0];
  assert(crtTitle === title && /^[a-z0-9-]+\.crt$/.test(crtFile));
  const crtPath=join("emulator/c64/media/cartridge-replacements",crtFile);
  assert(existsSync(crtPath),"CRT file absent: " + crtFile);
  const crt=readFileSync(crtPath);
  assert.equal(crt.length,crtBytes,"CRT size mismatch: "+crtFile);
  assert.equal(createHash("sha256").update(crt).digest("hex"),crtHash,
    "CRT digest mismatch: "+crtFile);
  for (const side of legacy.disks) {
    assert(/^\/emulator\/c64\/media\/[a-z0-9-]+\.d64$/.test(side.url),
      "Unsafe D64 path: "+id);
    const location=side.url.slice(1);
    assert(existsSync(location),"D64 side missing: "+location);
    const bytes=readFileSync(location);
    assert.equal(bytes.length,side.bytes,"D64 size changed: "+location);
    assert.equal(createHash("sha256").update(bytes).digest("hex"),side.sha256,
      "D64 digest changed: "+location);
    sides++;
  }
}
console.log("PASS: six multi-disk CRT alternatives present; "+sides+
  " original disk sides SHA-verified and preserved.");
console.log("NOT CERTIFIED: multi-disk CRT gameplay and later-level loading.");
