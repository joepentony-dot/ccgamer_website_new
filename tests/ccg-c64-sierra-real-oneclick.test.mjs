#!/usr/bin/env node
/**
 * End-to-end genuine Sierra On-Line CRT one-click F1 acceptance.
 * This is not a fabricated RAM/DOM fixture: loads actual SHA-pinned CRT
 * and original C64 firmware and drives C64Machine PAL frames.
 * Local score only, never a HelioHost public submission.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { C64Machine } from '../js/ccg-c64/core/machine.js';
import { KEY_MAP } from '../js/ccg-c64/core/cia.js';
import { SierraCrossfireLocalRunObserver } from '../js/ccg-c64/arena/observe-sierra-crossfire-run.mjs';
import { SierraOneClickStarter } from '../js/ccg-c64/arena/sierra-one-click-launch.mjs';
import { readSierraCrossfireScreenScores } from '../js/ccg-c64/arena/read-sierra-crossfire-screen-score.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const EXPECTED={
 id:'owner-crt-more-crossfiresierraonline-0c60e852f438',
 title:'Crossfire (Sierra Online)',
 file:'crossfiresierraonline-0c60e852f438.crt',
 digest:'0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab',
 bytes:65728,hardware:19
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('one-link starter loads original Sierra CRT, taps F1 once, scores and finishes locally',()=>{
 const catalog=JSON.parse(readFileSync(
  resolve(root,'emulator/c64/media/cartridge-replacements/active.json'),'utf8'
 ));
 assert.equal(catalog.ownerRedistributionAttested,true);
 assert.deepEqual(catalog.games.filter(row=>row[0]===EXPECTED.title),[
  [EXPECTED.title,EXPECTED.file,EXPECTED.bytes,EXPECTED.digest,EXPECTED.hardware]
 ]);
 const crt=new Uint8Array(readFileSync(resolve(root,
  'emulator/c64/media/cartridge-replacements',EXPECTED.file)));
 assert.equal(crt.length,EXPECTED.bytes);
 assert.equal(sha(crt),EXPECTED.digest);
 const roms=Object.fromEntries(Object.entries({
  kernal:'kernal-901227-03.bin',basic:'basic-901226-01.bin',
  charRom:'chargen-901225-01.bin'
 }).map(([key,name])=>[key,new Uint8Array(readFileSync(
  resolve(root,'emulator/c64/firmware',name)
 ))]));
 const machine=new C64Machine();
 machine.loadROMs(roms);
 assert.equal(machine.loadCartridge(crt).hwType,19);
 const observer=new SierraCrossfireLocalRunObserver();
 const key=KEY_MAP.F1;
 assert(key);
 let presses=0,releases=0;
 const starter=new SierraOneClickStarter({
  onArm:()=>observer.armFromUserF1(),
  onPress:()=>{
   machine.cia1.setKey(...key,true);
   presses++;
   return true;
  },
  onRelease:()=>{
   machine.cia1.setKey(...key,false);
   releases++;
  }
 });
 let sawZero=false,sawPositive=false;
 let maxScore=0,final=null,frames=0;
 for(let i=0;i<3600;i++){
  assert.equal(machine.runFrame(),true,'Original C64Machine must keep running');
  frames++;
  const ram=machine.mem.ram;
  const hud=readSierraCrossfireScreenScores(ram);
  const candidate=observer.observe(ram);
  starter.tick(ram);
  if(starter.phase==='done'&&observer.phase==='running'){
   // Genuine joystick port 2: up+fire, as in the prior 170-point
   // original-cartridge capture. No modification of score RAM.
   machine.joyPort2=0xee;
  }
  if(hud && observer.phase==='running'){
   if(hud.score===0)sawZero=true;
   if(hud.score>0)sawPositive=true;
   maxScore=Math.max(maxScore,hud.score);
  }
  if(candidate){final=candidate;break;}
 }
 machine.joyPort2=0xff;
 starter.cancel(); // Must NOT inject or release F1 a second time.
 assert.equal(presses,1,'Exactly one F1 start for the game-link navigation');
 assert.equal(releases,1,'F1 must be released even during gameover');
 assert.equal(starter.phase,'cancelled');
 assert.equal(sawZero,true,'Fresh F1 run must have initial active 000000 HUD');
 assert.equal(sawPositive,true,'Actual ROM must produce a positive gameplay score');
 assert(maxScore>=10);
 assert(final && Number.isInteger(final.score)&&final.score>0);
 assert.equal(final.score,maxScore,'Final must match actual previous positive HUD');
 assert.equal(final.stableFrames,25);
 assert.equal(final.verified,false);
 assert.equal(final.eligibleForSubmission,false);
 console.log('SIERRA_REAL_ONE_CLICK_PASS',JSON.stringify({
  mediaSha256:EXPECTED.digest,frames,presses,releases,
  maxScore,finalScore:final.score,submissions:0
 }));
});
