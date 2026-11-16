#!/usr/bin/env node
/**
 * Read-only Crossfire (C64 PRG) forensic gate for CCG High Score Arena.
 *
 * Run from any directory: node scripts/high-score-arena/inspect-crossfire-prg.mjs
 * This tool reads existing approved catalogue and pack bytes only.
 * It does not modify the PRG, emulate gameplay, or guess score RAM addresses.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CATALOG = resolve(ROOT, "emulator/c64/media/prg-archive/catalog.json");
const PACK_ROOT = resolve(ROOT, "emulator/c64/media/prg-archive");
const CROSS_FIRE = Object.freeze({
  id: "archive-02121",
  title: "Crossfire",
  format: "prg",
  pack: "pack-10.bin",
  offset: 208062,
  length: 23637,
  sha256: "ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9",
});
const sha256 = data => createHash("sha256").update(data).digest("hex");

export function inspectCrossfire() {
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  assert.equal(catalog.version, 2, "Unexpected PRG archive catalogue version");
  assert.equal(catalog.recordCount, catalog.games.length, "PRG archive count mismatch");

  const entries = catalog.games.filter(row => row[0] === CROSS_FIRE.id);
  assert.equal(entries.length, 1, "Crossfire ID must have exactly one catalogue entry");
  const [id, title, format, packIndex, offset, length, digest] = entries[0];
  assert.deepEqual({ id, title, format, offset, length, digest },
    { id: CROSS_FIRE.id, title: CROSS_FIRE.title, format: CROSS_FIRE.format,
      offset: CROSS_FIRE.offset, length: CROSS_FIRE.length, digest: CROSS_FIRE.sha256 },
    "Crossfire media identity changed: do not attach scores to an unverified edition");

  const distinct = catalog.games.find(row => row[0] === "archive-02122");
  assert.equal(distinct?.[1], "Crossfire - Tron",
    "Crossfire - Tron must remain distinct from this leaderboard");

  const packMeta = catalog.packs[packIndex];
  assert.ok(packMeta, "Crossfire pack metadata missing");
  assert.equal(packMeta.file, CROSS_FIRE.pack, "Crossfire source pack changed");
  const pack = readFileSync(resolve(PACK_ROOT, packMeta.file));
  assert.equal(pack.length, packMeta.bytes, "Source pack length differs from catalogue");
  assert.equal(sha256(pack), packMeta.sha256,
    "Source pack integrity check failed: do not inspect unverified data");

  assert.ok(offset >= 0 && length >= 3 && offset + length <= pack.length,
    "Crossfire source entry points outside approved pack");
  const prg = pack.subarray(offset, offset + length);
  assert.equal(sha256(prg), digest,
    "Extracted Crossfire bytes do not match the approved catalogue checksum");
  const loadAddress = prg.readUInt16LE(0);
  const payloadBytes = prg.length - 2;

  return Object.freeze({
    verified: true,
    gameId: id,
    title,
    format,
    packFile: packMeta.file,
    packOffset: offset,
    byteLength: length,
    prgSHA256: digest,
    loadAddressDecimal: loadAddress,
    loadAddressHex: "0x" + loadAddress.toString(16).padStart(4, "0"),
    payloadBytes,
    firstPayloadBytesHex: prg.subarray(2, 18).toString("hex"),
    memoryScoreAddressVerified: false,
    gameOverSignalVerified: false,
    automaticScoringEnabled: false,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(inspectCrossfire(), null, 2));
  } catch (error) {
    console.error("[CCG Crossfire forensic gate] FAIL:", error.message);
    process.exitCode = 1;
  }
}
