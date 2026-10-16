#!/usr/bin/env node
// CCG offline, read-only publisher evidence cohorts. Source SHA pinned, no media edits.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const PATHS={
  "visible": "docs/ccg-c64-publisher-visible-20261016.json",
  "mame": "docs/ccg-c64-publisher-mame-exact-20261016.json",
  "blast": "emulator/c64/media/blast/catalog.json",
  "archive": "emulator/c64/media/prg-archive/catalog.json",
  "active": "emulator/c64/media/cartridge-replacements/active.json",
  "sources": "emulator/c64/publisher-research-sources.json"
};
function norm(t){return String(t).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/\+/g," plus ").replace(/['‘’`]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().replace(/\s+/g," ").toLowerCase().replace(/^lemans$/,"le mans")}
function build(d,blobs,cursor,batchSize){
 const v=d.visible, m=d.mame;
 if(v.version!==1||!Array.isArray(v.unmatched)||v.counts.publisherNotListed!==v.unmatched.length||new Set(v.unmatched).size!==v.unmatched.length)throw Error("Stale or invalid visible publisher identity source");
 if(m.version!==1||!Array.isArray(m.candidates)||!Array.isArray(m.requiresReview)||!m.mameSourceCommit)throw Error("Invalid pinned MAME source ledger");
 if(!Number.isInteger(cursor)||cursor<0||cursor>v.unmatched.length||!Number.isInteger(batchSize)||batchSize<1||batchSize>1000)throw Error("Invalid cursor/batchSize");
 for(const cat of [d.blast,d.archive])if(cat.recordCount!==cat.games.length||cat.packs.length<1)throw Error("Invalid packed source");
 if(d.active.recordCount!==d.active.games.length)throw Error("Invalid active CRT source");
 const keys=[...v.unmatched].sort(),selected=keys.slice(cursor,cursor+batchSize),collisions=new Set(v.ambiguousSameTitleBinaryKeys);
 const mame=new Map();for(const x of [...m.candidates,...m.requiresReview]){if(mame.has(x.key))throw Error("Duplicate MAME research key "+x.key);mame.set(x.key,x)}
 const packed=new Map();for(const [source,cat] of [["blast",d.blast],["archive",d.archive]])for(const row of cat.games){const key=norm(row[1]);if(!packed.has(key))packed.set(key,[]);const pack=cat.packs[row[3]];if(!pack||!pack.sha256)throw Error("Missing source pack");packed.get(key).push({source,id:row[0],title:row[1],sha256:row[6],pack:pack.file,packSha256:pack.sha256,offset:row[4],length:row[5]})}
 const crt=new Map();for(const row of d.active.games){const key=norm(row[0]);if(!crt.has(key))crt.set(key,[]);crt.get(key).push({file:row[1],title:row[0],sha256:row[3],bytes:row[2],hardwareType:row[4]})}
 const stats={selected:0,withPackedSource:0,withActiveCRT:0,sourceBinaryCollision:0,visibleCollision:0,mameSourceRecords:0,mameReviewFlags:0,withoutIndexedSource:0,exactPackedByteDuplicates:0,independentlyEditionVerified:0,publishersPromoted:0};
 const rows=selected.map((key,i)=>{
  const prgs=packed.get(key)||[],activeCRT=crt.get(key)||[],src=mame.get(key)||null,shas=new Set(prgs.map(x=>x.sha256)),flags=[];
  stats.selected++;
  if(collisions.has(key)){stats.visibleCollision++;flags.push("visible-multiple-binary-identity")}
  if(shas.size>1){stats.sourceBinaryCollision++;flags.push("multiple-packed-prg-shas")}
  if(prgs.length>shas.size){stats.exactPackedByteDuplicates++;flags.push("identical-prg-sha-in-multiple-packed-ids")}
  if(prgs.length)stats.withPackedSource++;if(activeCRT.length)stats.withActiveCRT++;if(!prgs.length&&!activeCRT.length)stats.withoutIndexedSource++;
  if(src){stats.mameSourceRecords++;if(src.reason){stats.mameReviewFlags++;flags.push("mame-requires-edition-review")}}
  const mameEvidence=src?{status:src.status||"UNVERIFIED",reason:src.reason||"title-match-only",sourceRecords:(src.sourceRecords||[]).map(x=>({...x,sourceUrl:"https://github.com/mamedev/mame/blob/"+m.mameSourceCommit+"/hash/"+x.sourceFile}))}:null;
  return {position:cursor+i,key,packedPRGs:prgs,activeCRTs:activeCRT,flags,mameEvidence,independentEditionProof:false,publisherPromoted:false,reviewState:"QUARANTINE_ABSTAIN",abstentionReason:src?"mame-title-record-does-not-prove-hosted-c64-binary-edition":flags.length?"identity-or-variant-collision-requires-edition-proof":"no-independent-hosted-edition-publisher-source"};
 });
 if(stats.selected!==selected.length)throw Error("Cohort incomplete");
 return {version:1,kind:"SOURCE_SHA_PINNED_PUBLISHER_IDENTITY_COHORT_NOT_PUBLISHER_APPROVAL",auditDate:"2026-10-16",scope:v.auditScope,visibleIdentityBaseline:v.counts.visibleGames,publisherLabelledBaseline:v.counts.publisherLabelled,publisherUnmatchedBaseline:v.counts.publisherNotListed,sourceBlobs:blobs,mameRevision:m.mameSourceCommit,cursor,nextCursor:cursor+selected.length,batchSize,stats,policy:["Publisher names and years from MAME are candidate references only, not verified credits for hosted binary editions.","Identical PRG SHA proves identical packed bytes only; it does not establish original publisher or CRT equivalence.","Every identity remains uncredited pending independent C64 edition-specific publisher proof; no media or game catalogue mutation."],rows};
}
function gitBlob(file){const b=fs.readFileSync(file);return createHash("sha1").update("blob "+b.length+"\\0").update(b).digest("hex")}
function snapshot(){const d={},blobs={};for(const [key,file] of Object.entries(PATHS)){d[key]=JSON.parse(fs.readFileSync(file,"utf8"));blobs[file]=gitBlob(file)}blobs[".github/workflows/c64-catalogue-publisher-year.yml"]=gitBlob(".github/workflows/c64-catalogue-publisher-year.yml");return {d,blobs}}
const args=process.argv.slice(2);
if(args.includes("--verify-dir")){
 const dir="docs/ccg-c64-publisher-cohorts",files=fs.readdirSync(dir).filter(x=>/^batch-\\d+-\\d+\\.json$/.test(x)).sort((a,b)=>Number(a.match(/\\d+/)[0])-Number(b.match(/\\d+/)[0]));
 if(!files.length)throw Error("No committed publisher cohorts");
 const {d,blobs}=snapshot();let previous=-1,verified=0;
 for(const file of files){const saved=JSON.parse(fs.readFileSync(path.join(dir,file),"utf8"));if(saved.cursor<previous)throw Error("Overlapping cohorts");const expected=build(d,blobs,saved.cursor,saved.batchSize);assert.deepStrictEqual(saved,expected,"Stale or modified publisher evidence cohort: "+file);if(file!==`batch-${saved.cursor}-${saved.nextCursor-1}.json`)throw Error("Incorrect cohort filename");previous=saved.nextCursor;verified+=saved.rows.length}
 console.log("PASS: "+verified+" source-SHA-verified publisher cohort identities; zero unsupported publisher promotions");
}else if(args.includes("--write")){
 const cursor=Number(args[args.indexOf("--cursor")+1]),size=Number(args[args.indexOf("--batch-size")+1]);const {d,blobs}=snapshot();const result=build(d,blobs,cursor,size),dir="docs/ccg-c64-publisher-cohorts";fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,`batch-${cursor}-${result.nextCursor-1}.json`);if(fs.existsSync(dest))throw Error("Cohort exists; do not overwrite");fs.writeFileSync(dest,JSON.stringify(result,null,2)+"\\n");console.log(dest+" "+result.stats.selected+" quarantined identities");
}else{throw Error("Use --verify-dir or --write --cursor N --batch-size N")}
