#!/usr/bin/env node
// Read-only machine triage of the existing CRT/PRG discovery ledger.
// This is NOT edition verification and NEVER grants media retirement.
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";

const sourcePath="docs/ccg-crt-review/full-catalogue-crt-prg-candidates-20261016.json";
const distinctPath="docs/ccg-crt-review/proven-distinct-title-families-20261016.json";
const progressPath="docs/ccg-crt-review/candidate-machine-triage-progress-20261016.json";
const bytes=fs.readFileSync(sourcePath);
const sourceBlob=createHash("sha1").update("blob "+bytes.length+"\\0").update(bytes).digest("hex");
const source=JSON.parse(bytes.toString("utf8"));
const distinct=JSON.parse(fs.readFileSync(distinctPath,"utf8"));
const negatives=new Map(distinct.distinctTitleFamilyPairs.map(x=>[x.prgId,x]));
assert.equal(source.version,1);
assert.equal(source.stats.legacyAliases,2458);
assert.equal(source.candidates.length,source.stats.possibleDuplicatePrgs);
assert.equal(distinct.sourceCandidateLedgerBlob,sourceBlob);
const classify=x=>{
 const flags=[];
 if(x.tier==="near-title")flags.push("different-title-strings");
 if(x.tier==="normalized-title")flags.push("normalised-title-only");
 if(x.tier==="translation-family")flags.push("language-or-alternate-title");
 if(x.targets.length>1)flags.push("multiple-crt-candidates");
 if(/\\b(?:part|side|disk|disc|demo|preview|trainer|hack|crack|translation|remake|re-release)\\b/i.test(x.title))flags.push("edition-or-part-marker");
 if(/\\b(?:[2-9]|ii|iii|iv|v|vi)\\b/i.test(x.title))flags.push("numbered-release-review");
 const n=negatives.get(x.prgId);
 if(n){
   assert.equal(n.prgSha256,x.prgSha256,"Negative control PRG drift");
   assert(x.targets.some(t=>t.crtId===n.crtId&&t.sha256===n.crtSha256),"Negative control CRT drift");
   flags.push("sourced-distinct-from-listed-crt");
 }
 return {prgId:x.prgId,prgSha256:x.prgSha256,source:x.source,tier:x.tier,flags,
   targetIds:x.targets.map(t=>t.crtId),targetSha256s:x.targets.map(t=>t.sha256),
   knownDistinctTargetIds:n?[n.crtId]:[],reviewStatus:"B_QUARANTINE_UNVERIFIED",
   editionProof:"ABSENT",retirementAllowed:false};
};
const progress=JSON.parse(fs.readFileSync(progressPath,"utf8"));
assert.equal(progress.version,1);
assert.equal(progress.state,"MACHINE_TRIAGE_ONLY_NO_EDITION_PROOF");
assert.equal(progress.sourceLedgerBlob,sourceBlob);
assert.equal(progress.sourceCandidateCount,source.candidates.length);
assert.equal(progress.legacyAliasesProtected,2458);
assert.equal(progress.batchSize,300);
assert(Number.isInteger(progress.nextCursor)&&progress.nextCursor>=0&&progress.nextCursor<=source.candidates.length);
assert.equal(progress.independentEditionReviews,0);
assert.equal(progress.newSafeRemovals,0);
assert.deepEqual(progress.entries,source.candidates.slice(0,progress.nextCursor).map(classify),
  "Triage must cover an unbroken, hash-pinned prefix with no altered identities");
if(process.argv.includes("--write")){
  const next=Math.min(source.candidates.length,progress.nextCursor+progress.batchSize);
  if(next===progress.nextCursor){console.log("No unprocessed candidates remain in machine triage");}
  else{
    const updated={...progress,nextCursor:next,entries:source.candidates.slice(0,next).map(classify)};
    fs.writeFileSync(progressPath,JSON.stringify(updated,null,2)+"\\n");
    console.log("Machine triaged "+(next-progress.nextCursor)+" additional candidates; next cursor "+next);
  }
}else if(process.argv.includes("--verify")){
  console.log("PASS: "+progress.nextCursor+" SHA-pinned machine-triaged candidates, 2458 aliases, no edition proof or retirements");
}else{
  console.log(JSON.stringify({total:source.candidates.length,machineTriaged:progress.nextCursor,
    nextCursor:progress.nextCursor,remaining:source.candidates.length-progress.nextCursor,
    independentEditionReviews:0,newSafeRemovals:0}));
}
