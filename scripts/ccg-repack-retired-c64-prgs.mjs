#!/usr/bin/env node
"use strict";

// Repack existing CCG PRG payloads while preserving every non-retired game
// byte-for-byte. Default is a read-only audit. Never touches Git history.
// --apply requires exact expected counts and a dedicated Git branch.
// Examples:
//   node scripts/ccg-repack-retired-c64-prgs.mjs --scope blast
//   node scripts/ccg-repack-retired-c64-prgs.mjs --scope blast --apply \
//      --branch codex/my-reviewed-branch --expected-source 1878 --expected-retired 728
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const sha = data => crypto.createHash("sha256").update(data).digest("hex");
const identity = value => {
  const key = String(value ?? "").replace(/\+/g, " plus ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/['\u2018\u2019\u0060]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ").trim()
    .replace(/\s+/g, " ").toLowerCase();
  return key === "lemans" ? "le mans" : key;
};
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const option = (args, key) => {
  const i = args.indexOf(key);
  if (i === -1) return null;
  if (i === args.length - 1 || args[i + 1].startsWith("--"))
    throw Error("Missing value for " + key);
  return args[i + 1];
};
const digestFile = file => sha(fs.readFileSync(file));

function calculate(root, scope) {
  assert(["blast", "prg-archive"].includes(scope), "Unsupported pack collection.");
  const packDir = path.join(root, "emulator/c64/media", scope);
  const catalogPath = path.join(packDir, "catalog.json");
  const crtRoot = path.join(root, "emulator/c64/media/cartridge-replacements");
  const manifest = JSON.parse(fs.readFileSync(path.join(crtRoot, "active.json"), "utf8"));
  const originalBytes = fs.readFileSync(catalogPath);
  const catalog = JSON.parse(originalBytes.toString("utf8"));
  assert(manifest.version === 1 && manifest.ownerRedistributionAttested === true &&
    manifest.recordCount === manifest.games.length && manifest.originalFormatsPreserved === true,
    "CRT manifest does not satisfy the owner's activation contract.");
  assert(catalog.version === 2 && catalog.recordCount === catalog.games.length &&
    catalog.packs.length > 0 && catalog.packs.length <= 128 && catalog.games.length < 12000,
    "Original PRG catalogue is invalid.");
  const selected = new Map();
  for (const row of manifest.games) {
    assert(Array.isArray(row) && row.length === 5, "Bad CRT row.");
    const [title, filename, size, sum, hw] = row;
    assert(typeof title === "string" && /^[a-z0-9-]+\.crt$/.test(filename) &&
      Number.isSafeInteger(size) && size >= 80 && size <= 8 * 1024 * 1024 &&
      /^[a-f0-9]{64}$/.test(sum) && [0, 19, 32].includes(hw),
      "Invalid selected CRT metadata.");
    const key = identity(title);
    assert(key && !selected.has(key), "Duplicate selected CRT identity: " + title);
    selected.set(key, { title, filename, size, sum,
      id: "owner-crt-more-" + filename.slice(0, -4) });
  }
  const originalPacks = catalog.packs.map(pack => {
    assert(pack && /^pack-\d{2}\.bin$/.test(pack.file) &&
      Number.isSafeInteger(pack.bytes) && pack.bytes > 0 &&
      pack.bytes <= 8 * 1024 * 1024 && /^[a-f0-9]{64}$/.test(pack.sha256),
      "Unsafe or invalid original pack.");
    const bytes = fs.readFileSync(path.join(packDir, pack.file));
    assert(bytes.length === pack.bytes && sha(bytes) === pack.sha256,
      "Source pack length/digest differs: " + pack.file);
    return bytes;
  });
  if (scope === "prg-archive") {
    const ready = JSON.parse(fs.readFileSync(path.join(packDir, "ready.json"), "utf8"));
    assert(ready.version === 1 && ready.recordCount === catalog.recordCount &&
      ready.packCount === catalog.packs.length &&
      ready.catalogSHA256 === sha(originalBytes),
      "Archive activation marker does not match source catalogue.");
  }
  const retainedByPack = originalPacks.map(() => []);
  const ids = new Set(), retained = [], retired = {}, verifiedCrt = new Set();
  let retiredBytes = 0;
  for (const row of catalog.games) {
    assert(Array.isArray(row) && row.length === 7, "Bad PRG catalogue row.");
    const [id, title, format, i, start, len, sum] = row;
    assert(/^[a-z0-9-]+$/.test(id) && !ids.has(id) &&
      typeof title === "string" && title.trim() && 
      Number.isSafeInteger(i) && i >= 0 && i < originalPacks.length &&
      Number.isSafeInteger(start) && start >= 0 &&
      Number.isSafeInteger(len) && len >= 3 &&
      start + len <= originalPacks[i].length &&
      /^[a-f0-9]{64}$/.test(sum), "Bad packed game metadata: " + id);
    ids.add(id);
    const bytes = originalPacks[i].subarray(start, start + len);
    assert(sha(bytes) === sum, "Packed game checksum differs: " + id);
    // Other formats and different editions are never silently replaced.
    const chosen = format === "prg" ? selected.get(identity(title)) : null;
    if (chosen) {
      if (!verifiedCrt.has(chosen.filename)) {
        const crtFile = path.join(crtRoot, chosen.filename);
        const stat = fs.statSync(crtFile);
        assert(stat.isFile() && stat.size === chosen.size &&
          digestFile(crtFile) === chosen.sum,
          "Selected CRT not present or corrupt: " + chosen.filename);
        verifiedCrt.add(chosen.filename);
      }
      assert(!Object.hasOwn(retired, id), "Retired PRG ID repeated.");
      retired[id] = chosen.id;
      retiredBytes += len;
    } else {
      retainedByPack[i].push({ row, bytes });
      retained.push(row);
    }
  }
  const nextPacks = [], nextGames = [], packWrites = [], retiredFiles = [];
  for (let i = 0; i < originalPacks.length; i++) {
    const survivors = retainedByPack[i];
    if (!survivors.length) {
      retiredFiles.push(catalog.packs[i].file);
      continue;
    }
    let offset = 0;
    const buffers = [];
    const nextPackIndex = nextPacks.length;
    for (const { row, bytes } of survivors) {
      nextGames.push([row[0], row[1], row[2], nextPackIndex, offset, row[5], row[6]]);
      offset += row[5];
      buffers.push(bytes);
    }
    assert(offset > 0 && offset <= 8 * 1024 * 1024,
      "Repacked file outside supported pack limits.");
    const combined = Buffer.concat(buffers, offset);
    const name = catalog.packs[i].file;
    nextPacks.push({ file: name, bytes: combined.length, sha256: sha(combined) });
    packWrites.push({ file: name, bytes: combined });
  }
  // Keep original catalog game ordering, regardless of its pack ordering.
  const byId = new Map(nextGames.map(row => [row[0], row]));
  const ordered = retained.map(row => byId.get(row[0]));
  assert(ordered.length === retained.length &&
    ordered.every(Boolean) && ordered.length + Object.keys(retired).length === catalog.recordCount,
    "A source game was lost or duplicated during repack.");
  const next = { ...catalog, recordCount: ordered.length, packs: nextPacks, games: ordered };
  const nextBytes = Buffer.from(JSON.stringify(next) + "\n");
  const aliases = { version: 1, source: scope, recordCount: Object.keys(retired).length, mappings: retired };
  const aliasBytes = Buffer.from(JSON.stringify(aliases) + "\n");
  const readyBytes = scope === "prg-archive" ? Buffer.from(JSON.stringify({
    version: 1, recordCount: next.recordCount,
    packCount: next.packs.length, catalogSHA256: sha(nextBytes),
  }) + "\n") : null;
  // A retired PRG must not depend exclusively on an optional CRT manifest:
  // publish its already-SHA-verified cartridge in the direct core catalogue.
  // This adds metadata only, not duplicate cartridge binary files.
  const corePath = path.join(root, "emulator/c64/library.json");
  const core = JSON.parse(fs.readFileSync(corePath, "utf8"));
  assert(core.version === 1 && Array.isArray(core.entries),
    "Original direct C64 library missing or invalid.");
  const existingDirect = new Map();
  for (const entry of core.entries) {
    assert(entry && typeof entry.id === "string" && !existingDirect.has(entry.id),
      "Invalid or duplicate direct game ID.");
    existingDirect.set(entry.id, entry);
  }
  const retiredTargetIds = new Set(Object.values(retired));
  const newDirect = [];
  for (const chosen of selected.values()) {
    if (!retiredTargetIds.has(chosen.id)) continue;
    const prior = existingDirect.get(chosen.id);
    if (prior) {
      assert(prior.format === "crt" && prior.sha256 === chosen.sum &&
        prior.url === "/emulator/c64/media/cartridge-replacements/" + chosen.filename &&
        prior.bytes === chosen.size && prior.approved === true,
        "Conflicting direct CRT registration: " + chosen.id);
      continue;
    }
    newDirect.push({
      id: chosen.id, title: chosen.title, filename: chosen.filename,
      format: "crt",
      description: "CRT-first replacement for a physically retired packed PRG.",
      url: "/emulator/c64/media/cartridge-replacements/" + chosen.filename,
      bytes: chosen.size, sha256: chosen.sum,
      license: "Public redistribution authorised by CCG website owner on 2026-10-14 (owner declaration)",
      approved: true, preferOverOtherFormats: true,
    });
  }
  const coreBytes = newDirect.length
    ? Buffer.from(JSON.stringify({ ...core,
      entries: [...newDirect, ...core.entries] }, null, 2) + "\n")
    : null;
  return { packDir, catalogPath, scope, originalCount: catalog.recordCount,
    survivorCount: ordered.length, retiredCount: Object.keys(retired).length,
    retiredBytes, originalBytes: originalPacks.reduce((n, p) => n + p.length, 0),
    newBytes: nextPacks.reduce((n, p) => n + p.bytes, 0),
    packWrites, retiredFiles, nextBytes, aliasBytes, readyBytes,
    corePath, coreBytes, coreAdded: newDirect.length };
}

function stage(plan) {
  // All source pack and game hashes were validated before any write is attempted.
  // The result is committed/reviewed on a dedicated Git branch, not deployed here.
  for (const { file, bytes } of plan.packWrites) {
    fs.writeFileSync(path.join(plan.packDir, file), bytes);
  }
  for (const file of plan.retiredFiles) fs.rmSync(path.join(plan.packDir, file));
  fs.writeFileSync(plan.catalogPath, plan.nextBytes);
  fs.writeFileSync(path.join(plan.packDir, "retired-ids.json"), plan.aliasBytes);
  if (plan.readyBytes) fs.writeFileSync(path.join(plan.packDir, "ready.json"), plan.readyBytes);
  if (plan.coreBytes) fs.writeFileSync(plan.corePath, plan.coreBytes);
}

const args = process.argv.slice(2);
const scope = option(args, "--scope") || "blast";
const apply = args.includes("--apply");
const root = option(args, "--root") ? path.resolve(option(args, "--root")) : projectRoot;
const plan = calculate(root, scope);
const results = {
  scope, sourceGames: plan.originalCount, survivors: plan.survivorCount,
  retiredPRGs: plan.retiredCount, removedPRGBytes: plan.retiredBytes,
  originalPackBytes: plan.originalBytes, repackedBytes: plan.newBytes,
  freedPackedBytes: plan.originalBytes - plan.newBytes,
  remainingPacks: plan.packWrites.length, emptiedPacks: plan.retiredFiles,
  coreCRTRegistrationsAdded: plan.coreAdded,
  mode: apply ? "stage locally on branch" : "read-only audit",
};
if (apply) {
  const expectedSource = Number(option(args, "--expected-source"));
  const expectedRetired = Number(option(args, "--expected-retired"));
  const expectedCore = Number(option(args, "--expected-core-added"));
  const branch = option(args, "--branch");
  assert(Number.isSafeInteger(expectedSource) && expectedSource === plan.originalCount &&
    Number.isSafeInteger(expectedRetired) && expectedRetired === plan.retiredCount &&
    Number.isSafeInteger(expectedCore) && expectedCore === plan.coreAdded &&
    expectedRetired > 0, "Expected count mismatch: refusing to stage.");
  assert(branch && branch.startsWith("codex/c64-") && path.resolve(root) === projectRoot,
    "Refusing to modify another folder or unreviewed branch.");
  const git = argv => execFileSync("git", ["-C", root, ...argv], { encoding: "utf8" }).trim();
  assert(git(["rev-parse", "--abbrev-ref", "HEAD"]) === branch &&
    git(["status", "--porcelain"]) === "", "Stage only in the named clean Git branch.");
  stage(plan);
}
console.log(JSON.stringify(results, null, 2));
