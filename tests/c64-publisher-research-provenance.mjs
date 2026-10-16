#!/usr/bin/env node
// Read-only research-candidate provenance, collision, and publisher-coverage regression.
// Covers direct library and both packed PRG sources. Does not claim full live display
// coverage across other sources or change media, titles, identity keys or credits.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogGameIdentity } from "../js/ccg-c64/game-catalog.js";
import { parseMetadata } from "../js/ccg-c64/catalogue-browser.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));
const meta=parseMetadata(read("emulator/c64/catalogue-metadata.json"));
const ledger=read("emulator/c64/publisher-research-sources.json");
const core=read("emulator/c64/library.json");
const blast=read("emulator/c64/media/blast/catalog.json");
const archive=read("emulator/c64/media/prg-archive/catalog.json");
assert.equal(ledger.version,1);
assert(Array.isArray(ledger.added)&&Array.isArray(ledger.quarantined));
assert(Array.isArray(core.entries)&&Array.isArray(blast.games)&&Array.isArray(archive.games));
const researchKeys=new Set();
const sourceRows=new Set();
let externalSourceCount=0;
let inheritedMetadataCount=0;
for(const row of ledger.added) {
  assert(Array.isArray(row)&&row.length===3&&typeof row[0]==="string"&&
    typeof row[1]==="string"&&typeof row[2]==="string","Invalid source record");
  assert(/^(https:\/\/|meta:)/.test(row[1]),"Research lacks a source pointer: "+row[0]);
  const sourceIdentity=JSON.stringify([row[0],row[1]]);
  assert(!sourceRows.has(sourceIdentity),"Duplicated publisher research source: "+sourceIdentity);
  sourceRows.add(sourceIdentity);
  if(row[1].startsWith("https://")) externalSourceCount++;
  else inheritedMetadataCount++;
  assert(meta.has(row[0])&&meta.get(row[0]).publishers.length>0,
    "Research credit missing from metadata: "+row[0]);
  assert(meta.get(row[0]).publishers.every(name=>
    !/^(unknown|not listed|unverified)$/i.test(name.trim())),
    "Generic unknown credited as publisher: "+row[0]);
  researchKeys.add(row[0]);
}
// Independent, source-specific C64 publisher/year corroboration. Records not
// present in this subset remain research candidates, not source-verified.
const verified = ledger.independentlyVerified;
assert(verified && /^20\d{2}-\d{2}-\d{2}$/.test(verified.reviewedOn));
assert(Array.isArray(verified.entries) && verified.entries.length === 10);
const reviewedKeys = new Set();
for (const record of verified.entries) {
  assert.equal(record.platform, "Commodore 64");
  assert(!reviewedKeys.has(record.key), "Duplicate independently verified C64 title");
  reviewedKeys.add(record.key);
  assert(ledger.added.some(row => row[0] === record.key && row[1] === record.source),
    "Verified C64 title missing identical source provenance: " + record.key);
  assert(record.source.startsWith("https://www.lemon64.com/game/"));
  assert(Array.isArray(record.publishers) && record.publishers.length > 0);
  assert.deepEqual(meta.get(record.key)?.publishers, record.publishers,
    "Source-checked publisher identities changed: " + record.key);
  assert.equal(meta.get(record.key)?.year, record.releaseYear,
    "Source-checked C64 release year changed: " + record.key);
  assert(Array.isArray(record.developerNotPublisher));
  assert(Array.isArray(record.releaserNotOriginalPublisher));
  assert(record.copyrightNotPublisher === undefined ||
    Array.isArray(record.copyrightNotPublisher));
  for (const excluded of [...record.developerNotPublisher,
      ...record.releaserNotOriginalPublisher,
      ...(record.copyrightNotPublisher || [])]) {
    assert(!record.publishers.includes(excluded),
      "Developer or reissue company silently promoted to publisher: " + record.key);
  }
}
const pendingReview=read("docs/ccg-c64-publisher-20261016-edition-review.json");
assert.equal(pendingReview.version,1);
assert.equal(pendingReview.entries.length,4);
assert.equal(pendingReview.quarantine.length,1);
assert.equal(pendingReview.quarantine[0].key,"slap fight");
assert.equal(pendingReview.quarantine[0].releaseBlocker,true);
for(const entry of pendingReview.entries) {
  assert(entry.source.startsWith("https://www.lemon64.com/game/"));
  assert(meta.has(entry.key));
  assert(ledger.added.some(row=>row[0]===entry.key));
  assert(!reviewedKeys.has(entry.key),
    "Pending edition review must not be counted as applied: "+entry.key);
  const existing=meta.get(entry.key);
  assert(existing.publishers.includes(entry.currentPublisher)&&existing.year===null,
    "Pending C64 credit changed without source review: "+entry.key);
}
const slapQuarantine=ledger.quarantined.find(x=>x.key==="slap fight");
assert(slapQuarantine?.status==="unverified-regional-edition" &&
  slapQuarantine.rejectedCandidate.publisher==="Erbe",
  "Unresolved regional Slap Fight publisher requires explicit quarantine");
assert(!meta.has("slap fight") && !researchKeys.has("slap fight"),
  "Generic Slap Fight must not inherit Spanish/European publisher without verified edition");

// Batch-derived publisher credits may inherit only from an already credited
// exact C64 parent title; check the pinned packed PRG identity and SHA each run.
const inheritedBatch = ledger.bulkInheritedBatch;
assert(inheritedBatch && inheritedBatch.status ===
  "source-inherited-candidate-pending-exact-head-CI");
assert(Array.isArray(inheritedBatch.entries) && inheritedBatch.entries.length === 18);
const packedRecords = [...blast.games, ...archive.games];
const testedBatchKeys = new Set();
for (const record of inheritedBatch.entries) {
  const {key,parent,type,mediaId,mediaTitle,mediaSHA256,publishers,year} = record;
  assert(!testedBatchKeys.has(key), "Duplicated batch identity: " + key);
  testedBatchKeys.add(key);
  assert(researchKeys.has(key) && ledger.added.some(row =>
    row[0] === key && row[1] === "meta:" + parent),
    "Publisher source missing for derived identity: " + key);
  const gameRows = packedRecords.filter(row =>
    catalogGameIdentity(row[1]) === key);
  assert.equal(gameRows.length, 1, "Batch media identity changed: " + key);
  assert.deepEqual([gameRows[0][0],gameRows[0][1],gameRows[0][6]],
    [mediaId,mediaTitle,mediaSHA256], "Packed media SHA drift: " + key);
  assert.equal(catalogGameIdentity(mediaTitle),key);
  assert(meta.has(parent) && meta.get(parent).publishers.length > 0,
    "Inherited source credit no longer exists: " + parent);
  assert.deepEqual(meta.get(key)?.publishers, publishers);
  assert.deepEqual(meta.get(parent)?.publishers, publishers,
    "Parent publisher changed; manually reverify descendant: " + key);
  assert.equal(meta.get(key)?.year, year);
  assert.equal(meta.get(parent)?.year, year);
  if (type === "article") {
    assert(key === parent.replace(/^the /,"") ||
      key === parent.replace(/^the /,"") + " the" ||
      "the " + key === parent || key === parent.replace(/ the$/,""),
      "Not an exact definite-article variant: " + key);
    const sourceRows = packedRecords.filter(row =>
      catalogGameIdentity(row[1]) === parent);
    assert(sourceRows.length > 0 && new Set(sourceRows.map(row => row[6])).size === 1,
      "Article variant base game lost unique PRG identity: " + parent);
  } else {
    assert.equal(type, "part");
    assert(new RegExp("^" + parent.replace(/[.*+?^${}()|[\\]\\]/g, "\\const q=ledger.quarantined.find(x=>x.key==="armageddon");") +
      " (?:part|side|disk|disc|tape) (?:[1-9]|a|b)$").test(key),
      "Not a checked explicit side/part identity: " + key);
  }
}
const q=ledger.quarantined.find(x=>x.key==="armageddon");
assert(q&&q.status==="unverified-game-identity","Ambiguous Armageddon must be quarantined");
assert(!meta.has("armageddon"),"Do not attribute unrelated Armageddon games from a shared name");
assert(!researchKeys.has("armageddon"),"Quarantined Armageddon returned to source additions");
assert(meta.get("armageddon ocean")?.publishers.includes("Ocean Software Ltd."));
assert(meta.get("armageddon visions software factory")?.publishers.includes("Visions Software Factory"));
const armed=[
  ...blast.games.map(x=>({id:x[0],title:x[1],sha256:x[6]})),
  ...archive.games.map(x=>({id:x[0],title:x[1],sha256:x[6]})),
].filter(x=>catalogGameIdentity(x.title)==="armageddon");
assert.equal(armed.length,2,"Reinspect Armageddon collision if source library changes");
assert.notEqual(armed[0].sha256,armed[1].sha256,"C64 binaries need separate identification");
assert.deepEqual(new Map(q.playableMedia.map(x=>[x.id,x.sha256])),
  new Map(armed.map(x=>[x.id,x.sha256])),
  "Quarantine evidence must match current packed PRGs");

const playable=[
  ...core.entries.filter(x=>x&&x.id&&x.title).map(x=>({id:x.id,title:x.title,publisher:x.publisher})),
  ...blast.games.map(x=>({id:x[0],title:x[1]})),
  ...archive.games.map(x=>({id:x[0],title:x[1]}))
];
const identities=new Map();
for(const game of playable) {
  const key=catalogGameIdentity(game.title);
  if(!key) continue;
  const rows=identities.get(key)||[];
  rows.push(game);
  identities.set(key,rows);
}
const unmatched=[];
let credited=0;
for(const [key,games] of identities) {
  const vetted=games.some(x=>Array.isArray(x.publisher)?x.publisher.length:
    typeof x.publisher==="string"&&x.publisher.trim());
  if(vetted||meta.get(key)?.publishers.length) credited++;
  else unmatched.push(key);
}
unmatched.sort();
assert(unmatched.includes("armageddon"));
// Packed PRGs with identical displayed title identities but different bytes
// require edition identification before any GameBase publisher candidate.
const packedDigests = new Map();
for (const game of [...blast.games, ...archive.games]) {
  const identity = catalogGameIdentity(game[1]);
  if (!identity || typeof game[6] !== "string") continue;
  if (!packedDigests.has(identity)) packedDigests.set(identity, new Set());
  packedDigests.get(identity).add(game[6]);
}
const packedPRGCollisionTitleKeys = [...packedDigests.entries()]
  .filter(([,digests]) => digests.size > 1)
  .map(([identity]) => identity).sort();
assert(packedPRGCollisionTitleKeys.includes("armageddon"));
// Opt-in full ledger for research; default CI remains concise. This is deliberately
// read-only and derives titles from current media catalogues, never guessed matches.
if (process.argv.includes("--unmatched-json")) {
  console.log(JSON.stringify({
    auditScope:"direct library + BLAST + packed PRG archive only",
    unmatchedTitleKeys:unmatched.length,
    packedPRGCollisionTitleKeys,
    unmatched
  },null,2));
  process.exit(0); // The importer requires exactly one valid JSON document.
}

console.log(JSON.stringify({
  result:"PASS",auditScope:"direct library + BLAST + packed PRG archive only",
  sourceRecords:playable.length,distinctTitleKeys:identities.size,
  publisherCreditedKeys:credited,unmatchedTitleKeys:unmatched.length,
  newlyResearchedKeys:researchKeys.size,externalSourceRecords:externalSourceCount,
  inheritedMetadataRecords:inheritedMetadataCount,quarantinedKeys:ledger.quarantined.length,
  exampleUnmatched:unmatched.slice(0,30)
}));
