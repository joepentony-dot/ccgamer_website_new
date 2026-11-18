import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSierraCrossfireScreenScores } from '../js/ccg-c64/arena/read-sierra-crossfire-screen-score.mjs';
import { SierraCrossfireLocalRunObserver, isSierraCrossfireGameOver } from '../js/ccg-c64/arena/observe-sierra-crossfire-run.mjs';

// The actual 170 and 150 point histories were observed in the original,
// checksum-bound Sierra CRT running under the repository's C64Machine.
// This test replays their observed screen glyphs; it is NOT server validation.
const SCREEN=0x400, RIGHT=39;
function memory(score=0,highScore=score,terminal=false) {
 const ram=new Uint8Array(65536);
 for(const [row,glyph] of [[0,20],[1,21],[3,22],[4,23],
                          [13,20],[14,21],[16,22],[17,23]]) {
  ram[SCREEN+row*40+RIGHT]=glyph;
 }
 ram.set([126,255,231,231,231,255,126,0],0x2800);
 ram.set([126,231,231,126,231,231,126,0],0x2840);
 for(const [rows,value] of [
   [[19,20,21,22,23,24],score],[[6,7,8,9,10,11],highScore]
 ]) {
  [...String(value).padStart(6,'0')].forEach((digit,i)=>{
   ram[SCREEN+rows[i]*40+RIGHT]=Number(digit);
  });
 }
 if(terminal)for(const [col,glyph] of [
  [10,19],[11,10],[12,252],[13,10],[14,253],[15,10],
  [16,23],[20,0],[21,10],[22,254],[23,10],
  [24,23],[25,10],[26,22]
 ]) ram[SCREEN+13*40+col]=glyph;
 return ram;
}
test('real Sierra screen signatures distinguish active gameplay from terminal',()=>{
 assert.equal(isSierraCrossfireGameOver(memory(0)),false);
 assert.equal(isSierraCrossfireGameOver(memory(170)),false);
 assert.equal(isSierraCrossfireGameOver(memory(170,170,true)),true);
 assert.equal(readSierraCrossfireScreenScores(memory(150)).score,150);
 assert.equal(isSierraCrossfireGameOver(new Uint8Array(65536)),false);
});
test('no F1-armed player, no local completed score even after many game-over frames',()=>{
 const obs=new SierraCrossfireLocalRunObserver();
 for(let i=0;i<100;i++)assert.equal(obs.observe(memory(0,0,true)),null);
 assert.equal(obs.phase,'attract');
 assert.equal(obs.armFromUserF1(),true);
 assert.equal(obs.armFromUserF1(),false);
 assert.equal(obs.observe(memory(0)),null);
 assert.equal(obs.phase,'running');
});
test('original 170- and 150-point games finish once and never submit scores',()=>{
 const data=JSON.parse(readFileSync(
  new URL('./fixtures/sierra-crossfire-local-run-histories.json',import.meta.url),'utf8'
 ));
 assert.equal(data.networkSubmissions,0);
 assert.equal(data.runs.length,2);
 assert.equal(data.mediaSha256,'0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab');
 for(const run of data.runs) {
  const obs=new SierraCrossfireLocalRunObserver();
  obs.observe(memory(0,0,true));
  assert.equal(obs.armFromUserF1(),true);
  let previous=-1;
  for(const [index,step] of run.scoreTransitions.entries()) {
   assert(step.score>=previous);
   if(index===0)assert.equal(step.score,0);
   previous=step.score;
   assert.equal(obs.observe(memory(step.score)),null);
   assert.equal(obs.phase,'running');
  }
  assert.equal(previous,run.finalScore);
  for(let i=0;i<24;i++)assert.equal(
   obs.observe(memory(run.finalScore,run.finalScore,true)),null
  );
  const final=obs.observe(memory(run.finalScore,run.finalScore,true));
  assert.equal(final.score,run.finalScore);
  assert.equal(final.stableFrames,25);
  assert.equal(final.verified,false);
  assert.equal(final.eligibleForSubmission,false);
  assert.equal(obs.phase,'completed');
  for(let i=0;i<30;i++)assert.equal(
   obs.observe(memory(run.finalScore,run.finalScore,true)),null
  );
 }
});
test('reset, stale screen, premature terminal and suspicious score decreases fail closed',()=>{
 const obs=new SierraCrossfireLocalRunObserver();
 assert.equal(obs.armFromUserF1(),false);
 obs.observe(memory(0,0,true));
 assert.equal(obs.armFromUserF1(),true);
 for(let i=0;i<45;i++)assert.equal(obs.observe(memory(10,10,true)),null);
 assert.equal(obs.phase,'armed','Game-over may not stand in for zero-score active play');
 obs.observe(memory(0));
 obs.observe(memory(80));
 obs.observe(memory(10));
 assert.equal(obs.phase,'invalid');
 for(let i=0;i<100;i++)assert.equal(obs.observe(memory(10,10,true)),null);
 assert.equal(obs.finalScore,null);
});
test('new player run can begin after prior completion and explicit new F1',()=>{
 const obs=new SierraCrossfireLocalRunObserver();
 obs.observe(memory(0,0,true));
 obs.armFromUserF1();
 obs.observe(memory(0));
 obs.observe(memory(30));
 for(let i=0;i<25;i++)obs.observe(memory(30,30,true));
 assert.equal(obs.phase,'completed');
 assert.equal(obs.armFromUserF1(),true);
 assert.equal(obs.observe(memory(0)),null);
 obs.observe(memory(10));
 assert.equal(obs.phase,'running');
 obs.invalidate();
 assert.equal(obs.phase,'invalid');
 assert.equal(obs.armFromUserF1(),false);
});
