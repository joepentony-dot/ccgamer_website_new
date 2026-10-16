#!/usr/bin/env node
// Read-only regression for the post-202 CRT/PRG candidate backlog.
// A title match is NEVER permission to delete media or remap an alias.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const ledger = read("docs/ccg-crt-review/remaining-packed-prg-candidates-20261016.json");
const library = read("emulator/c64/library.json");
const blast = read("emulator/c64/media/blast/catalog.json");
const archive = read("emulator/c64/media/prg-archive/catalog.json");
const oldBlast = read("emulator/c64/media/blast/retired-ids.json");
const oldArchive = read("emulator/c64/media/prg-archive/retired-ids.json");
const norm = s => String(s||"").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/\bii\b/g,"2").replace(/\biii\b/g,"3").replace(/\biv\b/g,"4")
  .replace(/[^a-z0-9]/g,"");
assert.equal(ledger.version,1);
assert.equal(ledger.counts.remainingPackedPrgs, blast.games.length+archive.games.length);
const aliases={...oldBlast.mappings,...oldArchive.mappings};
assert.equal(Object.keys(aliases).length,ledger.counts.retiredLegacyAliases);
assert.equal(ledger.counts.retiredLegacyAliases,2458);
const direct = new Map(library.entries.map(e=>[e.id,e]));
const byId = new Map([...blast.games,...archive.games].map(g=>[g[0],g]));
assert.equal(byId.size, blast.games.length+archive.games.length);
const existingTargets = new Set(Object.values(aliases));
assert.equal(existingTargets.size,ledger.counts.distinctExistingCartridgeAliasTargets);
const dict = new Map();
for(const id of existingTargets) {
  const directCrt = direct.get(id);
  assert(directCrt?.format==="crt" && directCrt.approved !== false, "Alias target no longer approved CRT: "+id);
  const k=norm(id.replace(/^owner-crt-(?:more-)?/,""));
  if(!dict.has(k))dict.set(k,[]);
  dict.get(k).push(id);
}
const matches=[];
for(const g of byId.values()){
  const targets=dict.get(norm(g[1]))||[];
  if(targets.length) matches.push({prgId:g[0],title:g[1],possibleCartridgeIds:targets.sort()});
}
const sort=x=>x.sort((a,b)=>a.prgId.localeCompare(b.prgId));
assert.deepEqual(sort(matches),sort(ledger.normalizedTitleCandidates.map(e=>({
  prgId:e.prgId,title:e.title,possibleCartridgeIds:[...e.possibleCartridgeIds].sort()
}))),"Batch candidate inventory drifted; investigate media/identity before retirement");
assert.equal(matches.length,ledger.counts.normalizedTitleCandidates);
for (const e of ledger.normalizedTitleCandidates){
  assert.equal(e.status,"unverified-do-not-retire");
  assert(byId.has(e.prgId) && !Object.hasOwn(aliases,e.prgId),
    "Unverified candidate was retired or redirected: "+e.prgId);
}
for(const e of ledger.cauldronTitleVariants){
  assert.equal(e.status,"unverified-do-not-retire");
  assert(byId.has(e.prgId) && !Object.hasOwn(aliases,e.prgId),
    "Cauldron edition changed before positive edition verification: "+e.prgId);
  assert(/cauldron|hexenk|draculon|calebaza|citrouille/i.test(e.title));
}
assert.equal(ledger.cauldronTitleVariants.length,ledger.counts.cauldronTitleVariants);

// Release-family negative controls: similarly titled but DISTINCT C64 games.
// These cases must stay playable as original packed PRGs, even if a title
// discovery audit awards a high similarity score.
const excluded = read("docs/ccg-crt-review/proven-distinct-title-families-20261016.json");
const bulk = read("docs/ccg-crt-review/full-catalogue-crt-prg-candidates-20261016.json");
assert.equal(excluded.version, 1);
assert.equal(excluded.status, "EXPLICIT NEGATIVE CONTROLS — prevent accidental cross-game title similarity replacement");
assert.equal(excluded.sourceCandidateLedgerBlob, "a048f2193537af1ebabd10736c31801afb786e1e");
assert.deepEqual(excluded.distinctTitleFamilyPairs.map(e => e.prgId).sort(),
  ["archive-00551", "archive-01057"]);
for (const pair of excluded.distinctTitleFamilyPairs) {
  assert.equal(pair.classification, "known-different-C64-game-title-family");
  assert.equal(pair.releaseSafeToRetire, false);
  assert.equal(pair.mediaEditionVerified, false);
  assert(pair.sources.length >= 2 && pair.sources.every(url => url.startsWith("https://")));
  const source = bulk.candidates.find(c => c.prgId === pair.prgId);
  const target = source?.targets.find(t => t.crtId === pair.crtId);
  assert.deepEqual([source?.title, source?.prgSha256, target?.title, target?.sha256],
    [pair.prgTitle, pair.prgSha256, pair.crtTitle, pair.crtSha256],
    "Distinct release-family evidence changed: " + pair.prgId);
  const original = byId.get(pair.prgId);
  assert.equal(original?.[6], pair.prgSha256, "Distinct PRG no longer survives: " + pair.prgId);
  assert.equal(direct.get(pair.crtId)?.sha256, pair.crtSha256,
    "Distinct comparison CRT changed: " + pair.crtId);
  assert(!Object.hasOwn(aliases, pair.prgId),
    "A distinct C64 title must not silently redirect to another game: " + pair.prgId);
}

console.log("PASS: verified all "+byId.size+" surviving packed PRGs, "+
  matches.length+" read-only possible CRT duplicates, "+
  ledger.cauldronTitleVariants.length+" quarantined Cauldron variants, "+
  Object.keys(aliases).length+" preserved aliases.");
