#!/usr/bin/env node
"use strict";

// Read-only by default. Physical mutation requires an exact clean review branch,
// fixed pre-migration counts and a pinned list of approved direct CRT targets.
// Never changes multi-disk images, direct games or unrelated game formats.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { catalogGameIdentity } from "../js/ccg-c64/game-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHA = x => crypto.createHash("sha256").update(x).digest("hex");
const file = p => path.join(root,p);
const read = p => JSON.parse(fs.readFileSync(file(p), "utf8"));
const manifest = read("docs/ccg-crt-review/direct-crt-202-retirement-manifest.json");
const core = read("emulator/c64/library.json");
const approved = new Map(core.entries.map(x => [x.id,x]));
const targets = new Map();
const selections = {blast:new Map(), archive:new Map()};
const expected = {
  blast:{original:1150,retired:728,additional:69,remaining:1081,totalRetired:797,packs:11},
  archive:{original:8321,retired:1528,additional:133,remaining:8188,totalRetired:1661,packs:48}
};
const configs = [
 {source:"blast",dir:"emulator/c64/media/blast",aliasPrefix:"blast-",catalog:"emulator/c64/media/blast/catalog.json",aliases:"emulator/c64/media/blast/retired-ids.json"},
 {source:"archive",dir:"emulator/c64/media/prg-archive",aliasPrefix:"archive-",catalog:"emulator/c64/media/prg-archive/catalog.json",aliases:"emulator/c64/media/prg-archive/retired-ids.json",ready:"emulator/c64/media/prg-archive/ready.json"}
];
const modes = process.argv.slice(2);
assert(modes.length <= 1 && (!modes[0] || ["--apply","--verify-post"].includes(modes[0])), "Unsupported mode");
const mode=modes[0]||"--audit";
assert(manifest.version===1&&manifest.recordCount===202&&manifest.rows.length===202&&
  manifest.blastCount===69&&manifest.archiveCount===133&&manifest.uniqueCartridgeCount===136,
  "Pinned retirement manifest changed");
assert(core.version===1&&core.entries.length===1770&&approved.size===1770,
  "Expected original 1770-entry direct library; refusing unexpected changes");
const sourceKey={blast:"blast",archive:"archive"};
for(const row of manifest.rows) {
  assert(Array.isArray(row)&&row.length===4,"Unexpected retirement identity");
  const [source,id,title,crtId]=row;
  assert(source in sourceKey && typeof id==="string" && typeof title==="string" &&
    typeof crtId==="string" && title.trim(), "Unsafe retirement manifest");
  assert(new RegExp("^"+(source==="blast"?"blast-[0-9]{4}":"archive-[0-9]{5}")+"$").test(id),
    "Unexpected packed PRG identifier: "+id);
  assert(!selections[source].has(id),"Duplicate PRG retirement: "+id);
  const target=approved.get(crtId);
  assert(target&&target.format==="crt"&&target.approved===true&&
    target.preferOverOtherFormats===true&&typeof target.url==="string"&&
    catalogGameIdentity(target.title)===catalogGameIdentity(title),
    "Missing or wrong approved direct CRT: "+id+" -> "+crtId);
  assert(target.url.startsWith("/emulator/c64/media/") &&
    /^\/emulator\/c64\/media\/(?:[a-z0-9.-]+\.crt|cartridge-replacements\/[a-z0-9-]+\.crt)$/.test(target.url),
    "Unsafe CRT media path: "+crtId);
  selections[source].set(id,{title,target});
  targets.set(crtId,target);
}
assert(selections.blast.size===69&&selections.archive.size===133&&targets.size===136,
  "Incorrect number of selected direct CRT targets");
for(const target of targets.values()) {
  const bytes=fs.readFileSync(file(target.url.slice(1)));
  assert(bytes.length===target.bytes&&SHA(bytes)===target.sha256,
    "Selected CRT size or SHA changed: "+target.id);
  assert(bytes.subarray(0,13).toString("ascii")==="C64 CARTRIDGE",
    "Selected media is not a real CRT: "+target.id);
}

function inspect(scope,post=false) {
  const e=expected[scope.source];
  const folder=scope.dir;
  const catalogBytes=fs.readFileSync(file(scope.catalog));
  const catalog=JSON.parse(catalogBytes);
  const aliases=read(scope.aliases);
  const wantedCount=post?e.remaining:e.original;
  const wantedAliases=post?e.totalRetired:e.retired;
  assert(catalog.version===2&&catalog.recordCount===wantedCount&&
    catalog.games.length===wantedCount&&catalog.packs.length===e.packs,
    scope.source+": catalogue count mismatch");
  assert(aliases.version===1&&aliases.source===(scope.source==="archive"?"prg-archive":"blast")&&
    aliases.recordCount===wantedAliases&&
    Object.keys(aliases.mappings).length===wantedAliases,
    scope.source+": alias count mismatch");
  if(scope.ready) {
    const ready=read(scope.ready);
    assert(ready.version===1&&ready.recordCount===wantedCount&&
      ready.packCount===e.packs&&ready.catalogSHA256===SHA(catalogBytes),
      "Archive activation marker does not match source catalogue");
  }
  const buffers=[],byPack=Array.from({length:e.packs},()=>[]);
  for(const p of catalog.packs) {
    assert(/^pack-[0-9]{2}\.bin$/.test(p.file)&&p.bytes>0&&p.bytes<=8*1024*1024,
      "Unexpected packed filename or size");
    const bytes=fs.readFileSync(file(folder+"/"+p.file));
    assert(bytes.length===p.bytes&&SHA(bytes)===p.sha256,
      scope.source+": original pack digest mismatch: "+p.file);
    buffers.push(bytes);
  }
  const ids=new Set();
  for(const row of catalog.games) {
    assert(Array.isArray(row)&&row.length===7,"Invalid packed row");
    const [id,title,format,i,offset,len,digest]=row;
    assert(!ids.has(id)&&typeof title==="string"&&format==="prg"&&
      Number.isInteger(i)&&i>=0&&i<e.packs&&
      Number.isInteger(offset)&&offset>=0&&Number.isInteger(len)&&len>=3&&
      offset+len<=buffers[i].length,"Unsafe packed PRG metadata: "+id);
    ids.add(id);
    const raw=buffers[i].subarray(offset,offset+len);
    assert(SHA(raw)===digest,"Packed PRG slice checksum mismatch: "+id);
    byPack[i].push({row,raw});
    if(!post&&selections[scope.source].has(id)) {
      assert(catalogGameIdentity(selections[scope.source].get(id).title)===
        catalogGameIdentity(title),"Pinned retirement title differs: "+id);
    }
    if(post)assert(!selections[scope.source].has(id),"Retired PRG remains: "+id);
  }
  for(let i=0;i<e.packs;i++) {
    const sorted=byPack[i].sort((a,b)=>a.row[4]-b.row[4]);
    let offset=0;
    for(const x of sorted) {
      assert(x.row[4]===offset,"Packed games overlap or leave gaps: "+scope.source);
      offset+=x.row[5];
    }
    assert(offset===buffers[i].length,"Unaccounted bytes in "+scope.source+" pack "+i);
  }
  for(const [retiredId,crtId] of Object.entries(aliases.mappings)) {
    assert(!ids.has(retiredId),"Already retired id present in pack: "+retiredId);
    const crt=approved.get(crtId);
    assert(crt&&crt.approved===true&&crt.format==="crt",
      "Existing bookmark has no direct cartridge target: "+retiredId);
  }
  if(post)for(const [id,{target}] of selections[scope.source]) {
    assert(aliases.mappings[id]===target.id,"New retirement bookmark missing: "+id);
  }
  if(!post)for(const id of selections[scope.source].keys())
    assert(ids.has(id)&&!Object.hasOwn(aliases.mappings,id),"Unqualified PRG retirement: "+id);
  return {scope,catalog,aliases,byPack,buffers,sourceCount:ids.size};
}

const state=configs.map(x=>inspect(x,mode==="--verify-post"));
if(mode==="--verify-post") {
  assert(state.reduce((n,x)=>n+x.sourceCount,0)===9269);
  console.log(JSON.stringify({mode,blastPRGs:1081,archivePRGs:8188,aliases:2458,
    verifiedCRT:targets.size,allPackDigestsVerified:true}));
  process.exit(0);
}
assert(state.reduce((n,x)=>n+x.sourceCount,0)===9471);
const report={mode,blastRetirements:69,archiveRetirements:133,
  uniqueCRT:targets.size,oldPackedGames:9471,newPackedGames:9269,
  changedFiles:59,retainedDirectGames:1770};
if(mode!=="--apply") {console.log(JSON.stringify(report));process.exit(0);}

const branch="codex/c64-direct-crt-202-prg-retirement-20261016";
const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
assert(git("branch","--show-current")===branch,"Refusing to change any other Git branch");
assert(git("status","--porcelain")==="","Dirty checkout; refusing to stage");
const changes=[];
for(const st of state) {
  const {scope,catalog,aliases,byPack}=st;
  const retired=selections[scope.source];
  const newRows=[],newPacks=[];
  const byId=new Map();
  for(let i=0;i<byPack.length;i++){
    const kept=byPack[i].filter(x=>!retired.has(x.row[0]));
    assert(kept.length>0,"Do not delete any pack");
    let offset=0;
    const buffers=[];
    for(const {row,raw} of kept) {
      const newRow=[row[0],row[1],row[2],i,offset,row[5],row[6]];
      byId.set(row[0],newRow);
      buffers.push(raw);offset+=raw.length;
    }
    const bytes=Buffer.concat(buffers,offset);
    const pack=catalog.packs[i];
    newPacks.push({file:pack.file,bytes:bytes.length,sha256:SHA(bytes)});
    changes.push({path:scope.dir+"/"+pack.file,bytes});
  }
  for(const row of catalog.games)if(byId.has(row[0]))newRows.push(byId.get(row[0]));
  const expect=expected[scope.source];
  assert(newRows.length===expect.remaining,"Incorrect survivor count");
  const nextCatalog=Buffer.from(JSON.stringify({
    ...catalog,recordCount:newRows.length,packs:newPacks,games:newRows
  })+"\n");
  const newMappings={...aliases.mappings};
  for(const [id,{target}] of retired) {
    assert(!Object.hasOwn(newMappings,id),"Attempted duplicate legacy ID");
    newMappings[id]=target.id;
  }
  const nextAliases=Buffer.from(JSON.stringify({...aliases,
    recordCount:Object.keys(newMappings).length,mappings:newMappings})+"\n");
  assert(Object.keys(newMappings).length===expect.totalRetired,"Incorrect alias count");
  changes.push({path:scope.catalog,bytes:nextCatalog});
  changes.push({path:scope.aliases,bytes:nextAliases});
  if(scope.ready)changes.push({path:scope.ready,bytes:Buffer.from(JSON.stringify({
    version:1,recordCount:newRows.length,packCount:catalog.packs.length,
    catalogSHA256:SHA(nextCatalog)
  })+"\n")});
}
for(const change of changes)fs.writeFileSync(file(change.path),change.bytes);
console.log(JSON.stringify({...report,wrote:changes.length,
  newAliasCounts:{blast:797,archive:1661},
  oldLinksPreserved:true,disksUnchanged:true}));
