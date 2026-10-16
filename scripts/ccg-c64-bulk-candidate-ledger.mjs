#!/usr/bin/env node
// Deterministic full-catalogue CRT/PRG candidate audit. READ ONLY by default.
// Never interpret title similarity or differing container hashes as edition proof.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const romans={"i":"1","ii":"2","iii":"3","iv":"4","v":"5","vi":"6","vii":"7","viii":"8","ix":"9","x":"10"};
function catalogGameIdentity(title){const k=String(title??"").replace(/\+/g," plus ").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/['\u2018\u2019\u0060]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().replace(/\s+/g," ").toLowerCase();return k==="lemans"?"le mans":k}
function titleForm(title){const words=String(title||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/['’`]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean).map(x=>romans[x]||x).filter(x=>x!=="the");return {key:words.join(""),core:words.join(" "),first:words[0]||"",numbers:words.filter(x=>/^\d+$/.test(x)).join("|"),words}}
function editDistance(a,b){let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const n=[i];for(let j=1;j<=b.length;j++)n[j]=Math.min(n[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=n}return p[b.length]}
function titleScore(x,y){if(x.numbers!==y.numbers)return 0;if(x.key===y.key)return 100;const [short,long]=x.core.length<y.core.length?[x,y]:[y,x];if(short.core.length>=7&&long.core.startsWith(short.core+" ")&&short.core.length/long.core.length>=.4)return 92;const shared=x.words.filter(z=>y.words.includes(z)).length;const union=new Set([...x.words,...y.words]).size;if(shared>=2&&shared/union>=.72&&Math.min(x.key.length,y.key.length)>=9)return 85;if(x.key.slice(0,3)===y.key.slice(0,3)&&Math.min(x.key.length,y.key.length)>=6&&Math.max(x.key.length,y.key.length)<=36&&1-editDistance(x.key,y.key)/Math.max(x.key.length,y.key.length)>=.83)return 80;return 0}
function buildLedger(library,active,blast,archive,blastAliases,archiveAliases,sourceBlobs){
  if(library.version!==1||active.recordCount!==active.games.length||blast.recordCount!==blast.games.length||archive.recordCount!==archive.games.length)throw Error("Invalid source inventory");
  const retired={...blastAliases.mappings,...archiveAliases.mappings};
  if(Object.keys(retired).length!==blastAliases.recordCount+archiveAliases.recordCount||Object.keys(retired).length!==2458)throw Error("Legacy alias count changed");
  const crt=new Map();
  for(const x of library.entries.filter(x=>x.format==="crt"&&x.approved!==false))crt.set(x.id,{id:x.id,title:x.title,sha256:x.sha256,bytes:x.bytes,media:x.url,source:"direct"});
  for(const x of active.games){const id="owner-crt-more-"+x[1].slice(0,-4);const old=crt.get(id);if(old){if(old.sha256!==x[3]||old.title!==x[0])throw Error("Conflicting CRT identity "+id);continue}crt.set(id,{id,title:x[0],sha256:x[3],bytes:x[2],media:"/emulator/c64/media/cartridge-replacements/"+x[1],source:"active"})}
  const byFirst=new Map(),byPrefix=new Map();
  for(const x of crt.values()){x.f=titleForm(x.title);for(const [index,key] of [[byFirst,x.f.first],[byPrefix,x.f.key.slice(0,3)]]){if(!index.has(key))index.set(key,[]);index.get(key).push(x)}}
  const rows=[],unmatchedIds=[];
  for(const [source,cat] of [["blast",blast],["archive",archive]]){
    for(const x of cat.games){
      if(x[2]!=="prg")throw Error("Unexpected packed format: "+x[0]);
      if(Object.hasOwn(retired,x[0]))throw Error("Retired ID remains packed: "+x[0]);
      const f=titleForm(x[1]),found=new Map();
      for(const y of [...(byFirst.get(f.first)||[]),...(byPrefix.get(f.key.slice(0,3))||[])]){const s=titleScore(f,y.f);if(s>=80)found.set(y.id,{target:y,score:s})}
      if(/cauldron|hexenk|draculon|calebaza|citrouille/i.test(x[1])){
        const sequel=/\b(?:2|ii)\b|pumpkin|calebaza|citrouille/i.test(x[1]);
        for(const y of crt.values())if(/^cauldron(?:\s*(?:2|ii))?$/i.test(y.title)&&(/\b(?:2|ii)\b/i.test(y.title))===sequel)found.set(y.id,{target:y,score:77});
      }
      if(!found.size){unmatchedIds.push(x[0]);continue}
      const sorted=[...found.values()].sort((u,v)=>v.score-u.score||u.target.id.localeCompare(v.target.id)).slice(0,4);
      const max=sorted[0].score;
      rows.push({prgId:x[0],title:x[1],source,prgSha256:x[6],pack:cat.packs[x[3]].file,packSha256:cat.packs[x[3]].sha256,offset:x[4],length:x[5],tier:max===100?"normalized-title":max===77?"translation-family":"near-title",status:"B_QUARANTINE_UNVERIFIED",proof:"title-discovery-only",targets:sorted.map(y=>({crtId:y.target.id,title:y.target.title,sha256:y.target.sha256,bytes:y.target.bytes,media:y.target.media,score:y.score}))});
    }
  }
  rows.sort((a,b)=>a.prgId.localeCompare(b.prgId));
  const raw=[...library.entries.map(x=>x.title),...active.games.map(x=>x[0]),...blast.games.map(x=>x[1]),...archive.games.map(x=>x[1])];
  const stats={rawSourceRecords:raw.length,displayTitleKeys:new Set(raw.map(catalogGameIdentity)).size,directEntries:library.entries.length,rawCrtRows:library.entries.filter(x=>x.format==="crt").length+active.games.length,distinctCrtIds:crt.size,packedPrgs:blast.games.length+archive.games.length,legacyAliases:Object.keys(retired).length,possibleDuplicatePrgs:rows.length,normalizedTitleCandidates:rows.filter(x=>x.tier==="normalized-title").length,nearTitleCandidates:rows.filter(x=>x.tier==="near-title").length,translationFamilyCandidates:rows.filter(x=>x.tier==="translation-family").length,quarantined:rows.length,verifiedSafeNewRemovals:0,withoutDiscoveredCrtCandidate:unmatchedIds.length};
  if(stats.rawSourceRecords!==stats.directEntries+active.games.length+stats.packedPrgs||stats.possibleDuplicatePrgs+stats.withoutDiscoveredCrtCandidate!==stats.packedPrgs)throw Error("Incomplete inventory");
  const cauldron=rows.filter(x=>/cauldron|hexenk|draculon|calebaza|citrouille/i.test(x.title));
  if(cauldron.length!==10)throw Error("Cauldron quarantine unexpectedly changed");
  for(const x of rows){if(/boulder\s*dash/i.test(x.title)&&x.targets.some(y=>/beach[\s-]*head/i.test(y.title)))throw Error("Wrong-game Boulder Dash candidate");if(/cauldron/i.test(x.title)&&/\b(?:2|ii)\b/i.test(x.title)&&x.targets.some(y=>/^cauldron$/i.test(y.title)))throw Error("Cross-sequel Cauldron candidate")}
  return {version:1,date:"2026-10-16",state:"READ_ONLY_CANDIDATE_DISCOVERY_NO_RETIREMENT_AUTHORITY",sourceBlobs,stats,classification:{A_verified_same_edition:0,B_ambiguous_preserved:rows.length,C_no_candidate_not_proven_unique:unmatchedIds.length},progress:{machineScreened:stats.packedPrgs,independentlyEditionVerified:0,nextIndependentReviewIndex:0,reviewBatchSize:300},rules:["Title similarity and PRG/CRT media hashes do not prove equivalent released editions.","Retain all source PRG bytes, packs, original D64/multi-disk media, and 2458 legacy aliases.","No automatic deletion, redirect, suppression, publisher credit or autoplay remapping from this ledger.","Every candidate requires independent release/edition evidence and verified launch/rollback before promotion."],candidates:rows,unmatchedPrgIds:unmatchedIds.sort()};
}
const sourcePaths=["emulator/c64/library.json","emulator/c64/media/cartridge-replacements/active.json","emulator/c64/media/blast/catalog.json","emulator/c64/media/prg-archive/catalog.json","emulator/c64/media/blast/retired-ids.json","emulator/c64/media/prg-archive/retired-ids.json"];
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const gitBlob=p=>{const bytes=fs.readFileSync(p);return createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
const sources=Object.fromEntries(sourcePaths.map(p=>[p,gitBlob(p)]));
const output=buildLedger(...sourcePaths.map(read),sources);
const ledgerPath="docs/ccg-crt-review/full-catalogue-crt-prg-candidates-20261016.json";
if(process.argv.includes("--verify")){
  assert.deepStrictEqual(output,read(ledgerPath),"Candidate ledger stale: regenerate only after checking source/edition drift");
  assert.equal(output.stats.legacyAliases,2458);
  assert.equal(output.classification.A_verified_same_edition,0);
  console.log("PASS: "+output.stats.rawSourceRecords+" source records, "+output.stats.packedPrgs+" packed PRGs, "+output.stats.possibleDuplicatePrgs+" quarantined CRT candidates, 2458 aliases intact; zero unsupported retirements");
}else if(process.argv.includes("--write")){
  fs.writeFileSync(ledgerPath,JSON.stringify(output,null,2)+"\n");
  console.log("Wrote read-only ledger: "+output.stats.possibleDuplicatePrgs+" candidates");
}else{
  console.log(JSON.stringify({stats:output.stats,classification:output.classification,progress:output.progress}));
}
