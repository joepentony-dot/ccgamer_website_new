import {test} from "node:test";
import assert from "node:assert/strict";
import {TRACKS,remapMusicUrls} from "./import-original-music.mjs";

const base="https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/";

test("exact 16-track recovered Supabase inventory; no duplicates",()=>{
  assert.equal(TRACKS.length,16);
  assert.equal(new Set(TRACKS.map(t=>t[1])).size,16);
  assert.equal(TRACKS.reduce((total,t)=>total+t[2],0),72233137);
  assert.ok(TRACKS.every(([,name,size,etag])=>name.endsWith(".mp3")&&size>1000000&&/^[0-9a-f]{32}$/.test(etag)));
  assert.equal(new Set(TRACKS.map(t=>t[3])).size,16,"Storage ETag fingerprints must be unique");
  const counts={};
  for(const [category] of TRACKS)counts[category]=(counts[category]||0)+1;
  assert.deepEqual(counts,{
    lostSizzlerDanger:3,
    lostSizzlerExploration:5,
    lostSizzlerNamed:3,
    lostSizzlerSanctuary:2,
    lostSizzlerStalker:3
  });
});
test("rewrites only original soundtrack references to portable local MP3 URLs",()=>{
  const sample=TRACKS.map(([category,name])=>[base+category+"/"+name,base+category+"/"+name]).flat().join("\n");
  const result=remapMusicUrls(sample);
  assert.ok(!result.includes("supabase.co"));
  for(const [category,name] of TRACKS){
    const local="assets/audio/music/originals/"+category+"/"+name;
    assert.equal(result.split(local).length-1,2);
  }
});
test("rejects partial soundtrack recovery and stale/misidentified sources",()=>{
  const sample=TRACKS.slice(1).map(([category,name])=>base+category+"/"+name).join("\n");
  assert.throws(()=>remapMusicUrls(sample),/Canonical soundtrack URL missing/);
});
