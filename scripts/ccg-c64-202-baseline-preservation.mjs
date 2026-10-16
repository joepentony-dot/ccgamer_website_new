#!/usr/bin/env node
"use strict";

// Read-only, Git-backed preservation audit for the pinned 202 direct-CRT replacements.
// Compares physical packed bytes on the PR head to the common-ancestor baseline.
// Do not use this as a repacker, import tool, or media writer.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const git=(...args)=>execFileSync("git",args,{cwd:root,maxBuffer:20*1024*1024});
const gitText=(...args)=>git(...args).toString("utf8").trim();
const base=gitText("merge-base","HEAD","origin/main");
assert(/^[0-9a-f]{40}$/.test(base),"Missing trusted merge-base against origin/main");
const baseline=filename=>git("show",base+":"+filename);
const current=filename=>fs.readFileSync(path.join(root,filename));
const json=bytes=>JSON.parse(bytes.toString("utf8"));
const oldJson=filename=>json(baseline(filename));
const newJson=filename=>json(current(filename));

assert.deepEqual(current("emulator/c64/library.json"),baseline("emulator/c64/library.json"),
  "Direct game registration changed within the cartridge PR");
const alteredMedia=gitText("diff","--name-only",base,"HEAD","--","emulator/c64/media")
  .split("\n").filter(Boolean).filter(p=>!/^emulator\/c64\/media\/(blast|prg-archive)\//.test(p));
assert.deepEqual(alteredMedia,[],"Unrelated CRT, D64 or multi-disk media changed");
const manifest=newJson("docs/ccg-crt-review/direct-crt-202-retirement-manifest.json");
assert.equal(manifest.recordCount,202);
assert.equal(manifest.rows.length,202);
const cases=[
  {label:"blast",dir:"emulator/c64/media/blast",oldCount:1150,newCount:1081,oldAliases:728,newAliases:797,retired:69},
  {label:"archive",dir:"emulator/c64/media/prg-archive",oldCount:8321,newCount:8188,oldAliases:1528,newAliases:1661,retired:133}
];
const selected=new Map(cases.map(c=>[c.label,new Map()]));
for(const [source,id,title,crtId] of manifest.rows) {
  assert(selected.has(source)&&typeof title==="string"&&typeof crtId==="string"&&
    !selected.get(source).has(id),"Invalid or duplicate retirement manifest ID");
  selected.get(source).set(id,crtId);
}
let originals=0,survivors=0,verifiedPacks=0,verifiedOriginalSlices=0,verifiedNewSlices=0;
for(const config of cases) {
  const {label,dir,oldCount,newCount,oldAliases,newAliases,retired}=config;
  const catalogFile=dir+"/catalog.json",aliasFile=dir+"/retired-ids.json";
  const pre=oldJson(catalogFile),post=newJson(catalogFile);
  const before=oldJson(aliasFile),after=newJson(aliasFile);
  assert.equal(pre.recordCount,oldCount);
  assert.equal(post.recordCount,newCount);
  assert.equal(pre.games.length,oldCount);
  assert.equal(post.games.length,newCount);
  assert.equal(before.recordCount,oldAliases);
  assert.equal(after.recordCount,newAliases);
  assert.equal(Object.keys(before.mappings).length,oldAliases);
  assert.equal(Object.keys(after.mappings).length,newAliases);
  assert.equal(selected.get(label).size,retired);
  assert.equal(pre.packs.length,post.packs.length,"Unexpected pack count change");
  const byOriginalId=new Map(),byNewId=new Map();
  const scan=(catalog,isOriginal)=> {
    const seen=new Set();
    for(const [index,pack] of catalog.packs.entries()) {
      const filename=dir+"/"+pack.file;
      const bytes=isOriginal?baseline(filename):current(filename);
      assert.equal(bytes.length,pack.bytes,filename+" length mismatch");
      assert.equal(sha(bytes),pack.sha256,filename+" SHA-256 mismatch");
      verifiedPacks++;
      const rows=catalog.games.filter(row=>row[3]===index);
      let cursor=0;
      for(const row of rows.sort((a,b)=>a[4]-b[4])) {
        const [id,title,format,packIndex,offset,len,digest]=row;
        assert.equal(format,"prg");
        assert(!seen.has(id)&&packIndex===index&&offset===cursor&&len>=3,
          "Duplicate, reordered, invalid or gapped PRG slice: "+id);
        assert.equal(sha(bytes.subarray(offset,offset+len)),digest,
          "Original or current physical PRG SHA-256 failed: "+id);
        cursor+=len;
        seen.add(id);
        (isOriginal?byOriginalId:byNewId).set(id,row);
        if(isOriginal)verifiedOriginalSlices++;
        else verifiedNewSlices++;
      }
      assert.equal(cursor,bytes.length,"Unclaimed bytes in pack: "+filename);
    }
    assert.equal(seen.size,catalog.recordCount,"Incomplete pack record coverage");
  };
  scan(pre,true);
  scan(post,false);
  for(const [id,original] of byOriginalId) {
    const replacement=byNewId.get(id);
    if(selected.get(label).has(id)) {
      assert(!replacement,"Retired PRG is still present: "+id);
      assert.equal(after.mappings[id],selected.get(label).get(id),
        "Retired ID not redirected to pinned CRT: "+id);
    } else {
      assert(replacement,"Unexpectedly removed PRG: "+id);
      assert.equal(replacement[1],original[1],"Survivor title changed: "+id);
      assert.equal(replacement[2],original[2],"Survivor format changed: "+id);
      assert.equal(replacement[5],original[5],"Survivor bytes changed length: "+id);
      assert.equal(replacement[6],original[6],"Survivor physical SHA changed: "+id);
    }
  }
  for(const id of byNewId.keys())
    assert(byOriginalId.has(id),"Unreviewed extra PRG added: "+id);
  for(const [id,target] of Object.entries(before.mappings))
    assert.equal(after.mappings[id],target,"Existing BLAST/archive bookmark changed: "+id);
  assert.equal(Object.keys(after.mappings).length-Object.keys(before.mappings).length,retired,
    "Unreviewed alias addition or omission");
  originals+=oldCount;
  survivors+=newCount;
}
assert.equal(originals,9471);
assert.equal(survivors,9269);
assert.equal(verifiedOriginalSlices,9471);
assert.equal(verifiedNewSlices,9269);
console.log(JSON.stringify({
  result:"PASS",mode:"read-only original-vs-exact-head preservation",
  originalPRGs:originals,survivingPRGs:survivors,retiredPRGs:202,
  verifiedOriginalSlices,verifiedNewSlices,verifiedPackImages:verifiedPacks,
  preservedAndAddedAliases:2458,unchangedDirectLibrary:true,
  unrelatedCRTandDiskMediaChanges:0,mergeBase:base
}));
