#!/usr/bin/env node
/**
 * One-time, manual recovery of the 16 original Dungeon Carnage soundtrack MP3s.
 * Never run from ordinary CI, browser tests, or the game itself.
 * Requires Supabase Storage to be unrestricted; stops immediately on HTTP 402.
 *
 * Usage:
 *   node scripts/recover-dungeon-carnage-music.mjs --validate
 *   node scripts/recover-dungeon-carnage-music.mjs --recover --confirm RECOVER_16_ORIGINAL_TRACKS
 *   node scripts/recover-dungeon-carnage-music.mjs --verify
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sourceFile=path.join(repo,"scripts/dungeon-carnage-music-recovery-sources.json");
const source=JSON.parse(await fs.readFile(sourceFile,"utf8"));
const categories=Object.freeze({
  normal:"lostSizzlerExploration",
  danger:"lostSizzlerDanger",
  sanctuary:"lostSizzlerSanctuary",
  named:"lostSizzlerNamed",
  stalker:"lostSizzlerStalker"
});
const target=path.join(repo,source.storageDirectory);
const musicHost="lcslgxpgmttaexsorxik.supabase.co";
const safeFile=/^[a-z0-9-]+\.mp3$/;
const maxTotal=75*1024*1024;

export function looksLikeMp3(buffer){
  return Buffer.isBuffer(buffer)&&buffer.length>=3&&(
    buffer.subarray(0,3).toString("ascii")==="ID3" ||
    (buffer[0]===0xff&&(buffer[1]&0xe0)===0xe0)
  );
}
export function validateSourceManifest(manifest){
  assert.equal(manifest.schema,"ccg-original-dungeon-soundtrack-recovery-v1");
  assert.equal(manifest.storageDirectory,"arcade/lost-sizzler/assets/audio/music/ccg-originals");
  assert.equal(manifest.expectedTrackCount,16);
  assert.equal(manifest.expectedTotalBytes,72233137);
  assert.ok(manifest.expectedTotalBytes<maxTotal,"Unexpectedly large download plan");
  assert.ok(Array.isArray(manifest.files)&&manifest.files.length===16);
  const seen=new Set();
  const tally={normal:0,danger:0,sanctuary:0,named:0,stalker:0};
  let bytes=0;
  for(const row of manifest.files){
    assert.equal(typeof row.filename,"string");
    assert.ok(safeFile.test(row.filename),"Unsafe or unexpected filename");
    assert.ok(Object.hasOwn(categories,row.category),"Unknown music category");
    assert.ok(!seen.has(row.filename),"Duplicate local filename");
    seen.add(row.filename);
    tally[row.category]++;
    assert.ok(Number.isSafeInteger(row.sizeBytes)&&row.sizeBytes>100000&&row.sizeBytes<10*1024*1024,"Unexpected MP3 size");
    bytes+=row.sizeBytes;
    const url=new URL(row.sourceUrl);
    assert.equal(url.protocol,"https:");
    assert.equal(url.hostname,musicHost,"Only the approved source host is allowed");
    assert.equal(url.username,"");assert.equal(url.password,"");
    assert.equal(url.search,"");assert.equal(url.hash,"");
    assert.equal(url.pathname.startsWith("/storage/v1/object/public/ccg-arcade-assets/music/"+categories[row.category]+"/"),true,"Wrong source category");
    assert.ok(url.pathname.endsWith("-"+row.filename),"Source name does not match destination");
  }
  assert.deepEqual(tally,{normal:5,danger:3,sanctuary:2,named:3,stalker:3});
  assert.equal(bytes,manifest.expectedTotalBytes,"Approved total size changed");
  return {count:seen.size,bytes,tally};
}

async function fetchOne(row){
  // No retries. A 402 is an active service restriction, not a transient failure.
  const response=await fetch(row.sourceUrl,{
    redirect:"error",
    signal:AbortSignal.timeout(120000),
    headers:{"accept":"audio/mpeg"}
  });
  if(response.status===402)throw new Error("Supabase Storage returned HTTP 402. STOP. Request temporary export access from support or wait for quota reset; do not retry automatically.");
  if(response.status!==200)throw new Error(row.filename+": storage returned HTTP "+response.status);
  if(!response.body)throw new Error("Missing audio response body: "+row.filename);
  const chunks=[];
  let received=0;
  for await (const chunk of response.body){
    received+=chunk.byteLength;
    if(received>row.sizeBytes)throw new Error("Source larger than approved size: "+row.filename);
    chunks.push(Buffer.from(chunk));
  }
  if(received!==row.sizeBytes)throw new Error("Audio content size mismatch: "+row.filename+" (got "+received+", expected "+row.sizeBytes+")");
  const buffer=Buffer.concat(chunks);
  if(!looksLikeMp3(buffer))throw new Error("Source is not MP3 audio: "+row.filename);
  return {buffer,sha256:crypto.createHash("sha256").update(buffer).digest("hex")};
}

async function recover(){
  try{
    await fs.stat(target);
    throw new Error("Destination already exists. Refusing to overwrite any stored soundtrack files.");
  }catch(error){if(error.code!=="ENOENT")throw error}
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),"ccg-dungeon-original-music-"));
  const entries=[];
  try{
    // Sequential, exactly one request per MP3, never from Chromium tests.
    for(const row of source.files){
      const {buffer,sha256}=await fetchOne(row);
      await fs.writeFile(path.join(temp,row.filename),buffer,{flag:"wx"});
      entries.push({category:row.category,filename:row.filename,sizeBytes:row.sizeBytes,sha256});
      console.log("Recovered "+row.filename+" ("+row.sizeBytes+" bytes, SHA-256 "+sha256.slice(0,12)+"…)"); 
    }
    assert.equal(entries.length,16);
    const catalog={
      schema:"ccg-original-dungeon-soundtrack-local-v1",
      totalBytes:source.expectedTotalBytes,
      tracks:entries
    };
    await fs.mkdir(target,{recursive:true});
    for(const entry of entries){
      await fs.copyFile(path.join(temp,entry.filename),path.join(target,entry.filename),fs.constants.COPYFILE_EXCL);
    }
    await fs.writeFile(path.join(target,"catalog.json"),JSON.stringify(catalog,null,2)+"\n",{flag:"wx"});
    await verify();
    console.log("Original soundtrack recovered to "+source.storageDirectory+"; review the new files in Git before deployment.");
  }finally{await fs.rm(temp,{recursive:true,force:true})}
}

async function verify(){
  const catalog=JSON.parse(await fs.readFile(path.join(target,"catalog.json"),"utf8"));
  assert.equal(catalog.schema,"ccg-original-dungeon-soundtrack-local-v1");
  assert.ok(Array.isArray(catalog.tracks)&&catalog.tracks.length===16);
  let bytes=0;
  const fileNames=new Set();
  for(const row of catalog.tracks){
    assert.ok(safeFile.test(row.filename)&&!fileNames.has(row.filename));
    fileNames.add(row.filename);
    const ref=source.files.find(item=>item.filename===row.filename);
    assert.ok(ref&&ref.category===row.category&&ref.sizeBytes===row.sizeBytes);
    const b=await fs.readFile(path.join(target,row.filename));
    assert.equal(b.byteLength,row.sizeBytes);
    assert.ok(looksLikeMp3(b));
    assert.equal(crypto.createHash("sha256").update(b).digest("hex"),row.sha256);
    bytes+=b.byteLength;
  }
  assert.equal(bytes,source.expectedTotalBytes);
  console.log("PASS: 16 authentic MP3s, "+bytes+" bytes, all SHA-256 hashes verified.");
}

const mode=process.argv[2]||"";
if(mode==="--validate"){
  const plan=validateSourceManifest(source);
  console.log("PASS: approved one-shot recovery manifest, "+plan.count+" files, "+plan.bytes+" bytes. No network requests made.");
}else if(mode==="--verify"){
  validateSourceManifest(source);
  await verify();
}else if(mode==="--recover" && process.argv[3]==="--confirm" && process.argv[4]==="RECOVER_16_ORIGINAL_TRACKS"){
  validateSourceManifest(source);
  await recover();
}else{
  console.error("Usage: --validate | --recover --confirm RECOVER_16_ORIGINAL_TRACKS | --verify");
  process.exitCode=2;
}
