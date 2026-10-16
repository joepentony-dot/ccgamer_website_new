#!/usr/bin/env node
// Read-only guard: pinned MAME exact-title proposals are not C64 edition proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const rows=read("docs/ccg-c64-publisher-mame-exact-20261016.json");
const visible=read("docs/ccg-c64-publisher-visible-20261016.json");
const ledger=read("emulator/c64/publisher-research-sources.json");
const meta=read("emulator/c64/catalogue-metadata.json");
assert.equal(rows.version,1);
assert.equal(rows.mameSourceCommit,"41a80b9dbaedbd4d0f1c2db6771d778a34547e59");
assert.equal(rows.status,"READ-ONLY CANDIDATE SOURCES — not edition-verified and never auto-publish");
assert.equal(rows.counts.fullVisibleUnmatched,visible.unmatched.length);
assert.equal(rows.counts.exactMatchedTitles,rows.candidates.length+rows.requiresReview.length);
assert.equal(rows.counts.sourceOnlyCandidates,rows.candidates.length);
assert.equal(rows.counts.requiresReview,rows.requiresReview.length);
const unmatched=new Set(visible.unmatched);
const q=new Set(ledger.quarantined.map(x=>x.key));
const credited=new Set(meta.entries.filter(x=>Array.isArray(x[1])&&x[1].length).map(x=>x[0]));
const keys=new Set();
for(const group of [rows.candidates,rows.requiresReview])for(const rec of group){
 assert(!keys.has(rec.key) && unmatched.has(rec.key),"MAME queue identity already credited or absent: "+rec.key);
 keys.add(rec.key);
 assert(Array.isArray(rec.sourceRecords)&&rec.sourceRecords.length>0);
 for(const x of rec.sourceRecords){
  assert(rows.sources.some(y=>y.filename===x.sourceFile));
  assert(typeof x.publisher==="string"&&x.publisher.trim()&&typeof x.softwareId==="string");
 }
 if(rows.candidates.includes(rec)){
  assert.equal(rec.status,"unverified-manual-review-required");
  assert(!q.has(rec.key),"Quarantined title incorrectly in candidate list: "+rec.key);
  assert(!credited.has(rec.key),"MAME candidate already promoted without edition review: "+rec.key);
 } else assert(typeof rec.reason==="string");
}
// Exact MAME titles that independently conflict with the actual C64 release history
// must be quarantined, not silently promoted to publisher metadata.
const editionConflicts = ["escape", "frogger", "super trux", "time traveller"];
for (const key of editionConflicts) {
  const held = ledger.quarantined.find(entry => entry.key === key);
  assert(held && held.status.startsWith("unverified-"), "Missing publisher quarantine: " + key);
  assert(Array.isArray(held.evidence) && held.evidence.length >= 1,
    "Unreferenced C64 edition conflict: " + key);
  assert(held.rejectedCandidate?.mameRevision === rows.mameSourceCommit);
  assert(rows.requiresReview.some(entry => entry.key === key &&
    entry.reason === "edition-conflict-independently-sourced"));
  assert(!rows.candidates.some(entry => entry.key === key));
  assert(!credited.has(key), "Ambiguous publisher credit promoted: " + key);
}
console.log("PASS: "+rows.counts.mameSoftwareRecords+" pinned MAME records considered; "+
 rows.candidates.length+" unverified source-only proposals and "+rows.requiresReview.length+
 " abstentions retained; no publisher/media modification.");
