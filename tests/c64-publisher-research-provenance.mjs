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
for(const row of ledger.added) {
  assert(Array.isArray(row)&&row.length===3&&typeof row[0]==="string"&&
    typeof row[1]==="string"&&typeof row[2]==="string","Invalid source record");
  assert(/^https:\/\/|^meta:/.test(row[1]),"Research lacks a source pointer: "+row[0]);
  assert(meta.has(row[0])&&meta.get(row[0]).publishers.length>0,
    "Research credit missing from metadata: "+row[0]);
  assert(meta.get(row[0]).publishers.every(name=>
    !/^(unknown|not listed|unverified)$/i.test(name.trim())),
    "Generic unknown credited as publisher: "+row[0]);
  researchKeys.add(row[0]);
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
console.log(JSON.stringify({
  result:"PASS",auditScope:"direct library + BLAST + packed PRG archive only",
  sourceRecords:playable.length,distinctTitleKeys:identities.size,
  publisherCreditedKeys:credited,unmatchedTitleKeys:unmatched.length,
  newlyResearchedKeys:researchKeys.size,quarantinedKeys:ledger.quarantined.length,
  exampleUnmatched:unmatched.slice(0,30)
}));
