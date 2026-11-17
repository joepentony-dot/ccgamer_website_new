#!/usr/bin/env node
/**
 * CCG High Score Arena — read-only headless boot probe for the exact Crossfire PRG.
 * Runs original site ROMs and existing C64Machine with test-only joystick inputs.
 * Logs emulated video/screen fingerprints and writes optional PNG/RAM artifacts.
 * These are DIAGNOSTIC CAPTURES, not observed valid scores or gameplay proof.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { C64Machine } from '../../js/ccg-c64/core/machine.js';
import { inspectCrossfire } from './inspect-crossfire-prg.mjs';
import { readCrossfireScreenScore } from '../../js/ccg-c64/arena/read-crossfire-screen-score.mjs';
import { CrossfireRunObserver } from '../../js/ccg-c64/arena/observe-crossfire-run.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv.includes('--output-dir')
  ? resolve(process.argv[process.argv.indexOf('--output-dir') + 1] || '') : null;
const SHA = 'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const firmware = name => new Uint8Array(readFileSync(resolve(ROOT, 'emulator/c64/firmware', name)));

function loadExactPrg() {
  const entry = inspectCrossfire();
  assert.equal(entry.verified, true);
  assert.equal(entry.gameId, 'archive-02121');
  assert.equal(entry.prgSHA256, SHA);
  const pack = readFileSync(resolve(ROOT, 'emulator/c64/media/prg-archive', entry.packFile));
  const bytes = new Uint8Array(pack.subarray(entry.packOffset, entry.packOffset + entry.byteLength));
  assert.equal(sha256(bytes), SHA);
  return bytes;
}

function readyVisible(ram) {
  const codes = [18, 5, 1, 4, 25, 46];
  for (let i = 0x0400; i <= 0x07e7; i++) {
    if (codes.every((code,k) => (ram[i+k] & 0x7f) === code)) return true;
  }
  return false;
}

function screenText(machine) {
  const vic = machine.vic2;
  const bank = (3 - (machine.cia2.portA & 3)) * 0x4000;
  const base = (bank + ((vic.regs[0x18] >> 4) & 0x0f) * 0x0400) & 0xffff;
  const rows = [];
  for (let y=0; y<25; y++) {
    let row='';
    for (let x=0; x<40; x++) {
      const c = machine.mem.ram[(base+y*40+x)&0xffff] & 0x7f;
      row += (c>=1 && c<=26) ? String.fromCharCode(64+c)
        : (c>=48 && c<=57) ? String.fromCharCode(c)
        : c===32 ? ' ' : c===46 ? '.' : c===45 ? '-' : '·';
    }
    rows.push(row);
  }
  return {base:'0x'+base.toString(16).padStart(4,'0'),rows};
}
function crc32(bytes) {
  let crc=0xffffffff;
  for(const n of bytes) {crc^=n;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function pngChunk(type, data) {
  const name=Buffer.from(type,'ascii'), size=Buffer.alloc(4), checksum=Buffer.alloc(4);
  size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([size,name,data,checksum]);
}
function screenshot(machine) {
  const width=384,height=272, framebuffer=machine.vic2.frameBuffer;
  assert.equal(framebuffer.length,width*height*4);
  const scanlines=Buffer.alloc(height*(1+width*4));
  for(let y=0;y<height;y++) {
    scanlines[y*(1+width*4)]=0;
    Buffer.from(framebuffer.buffer,framebuffer.byteOffset+y*width*4,width*4).copy(scanlines,y*(1+width*4)+1);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(scanlines)),pngChunk('IEND',Buffer.alloc(0))]);
}
const samples=[];
function record(machine,name,frame) {
  const screen=screenText(machine), ram=machine.mem.ram;
  const sample={name,frame,pcHex:'0x'+machine.cpu.pc.toString(16).padStart(4,'0'),
    screenBase:screen.base,ramSHA256:sha256(ram),
    frameSHA256:sha256(machine.vic2.frameBuffer),screenText:screen.rows};
  const visible=screen.rows.map(x=>x.trim()).filter(x=>/[A-Z0-9]{3}/.test(x));
  if (name.startsWith('after-level-fire') || name.startsWith('after-level1') || name.startsWith('first-shots') || name.startsWith('aim-') || name.startsWith('life-cycle-') || name.startsWith('zero-run-') || name.startsWith('scenario-') || name.startsWith('target-') || name.startsWith('shoot-') || name.startsWith('release-')) {
    const regs=machine.vic2.regs, base=Number(screen.base);
    const sprites=[];
    for(let i=0;i<8;i++) {
      if(!(regs[0x15] & (1<<i))) continue;
      sprites.push({i,x:regs[i*2]+((regs[0x10]&(1<<i))?256:0),y:regs[i*2+1]});
    }
    const hudBytes=Array.from(ram.subarray(base,base+80));
    console.log('HUD_DIAGNOSTIC '+JSON.stringify({name,frame,sprites,
      screenBase:screen.base,hudHex:Buffer.from(hudBytes).toString('hex'),
      scoreCandidateFromHUD:readCrossfireScreenScore(ram),
      scoreRegionSHA256:sha256(Buffer.concat(Array.from({length:20},(_,y)=>
        Buffer.from(machine.vic2.frameBuffer.subarray(((45+y)*384+245)*4,((45+y)*384+345)*4)))))}));
  }
  console.log('PROBE '+JSON.stringify({...sample,screenText:visible.slice(0,12)}));
  // The public archive entry contains a historical crack intro. Emit only
  // selected diagnostic frames for separate visual review; no score is inferred.
  if (['after-level-fire-150', 'target-upper-left-y', 'shoot-upper-left-8', 'shoot-lower-right-8', 'scenario-lower-left-shoot-8', 'scenario-lower-right-shoot-8', 'scenario-upper-left-shoot-8', 'scenario-lower-left-offset-shoot-8', 'scenario-two-targets-left-then-right-first-shot-8', 'scenario-two-targets-left-then-right-second-shot-8', 'scenario-two-targets-right-then-left-second-shot-8', 'life-cycle-after-first-death', 'life-cycle-respawn-150', 'life-cycle-second-hit', 'life-cycle-after-second-hit', 'life-cycle-zero-lives-hold', 'life-cycle-third-respawn', 'life-cycle-third-hit', 'life-cycle-after-third-death', 'life-cycle-post-game-over-250', 'life-cycle-post-game-over-650', 'zero-run-life1-death-observed', 'zero-run-life2-death-observed', 'zero-run-grave-confirmed', 'zero-run-game-over-hold'].includes(name)) {
    const base64 = screenshot(machine).toString('base64');
    console.log('CROSSFIRE_PNG_BEGIN '+name+' '+base64.length);
    for (let p=0;p<base64.length;p+=2048) console.log('CROSSFIRE_PNG_CHUNK '+name+' '+base64.slice(p,p+2048));
    console.log('CROSSFIRE_PNG_END '+name);
  }
  if(OUT) {
    writeFileSync(resolve(OUT,name+'.png'),screenshot(machine));
    writeFileSync(resolve(OUT,name+'.ram.bin'),Buffer.from(ram));
    writeFileSync(resolve(OUT,name+'.json'),JSON.stringify(sample,null,2)+'\n');
  }
  samples.push({name,frame,ramSHA256:sample.ramSHA256,frameSHA256:sample.frameSHA256});
}

const prg=loadExactPrg();
if(OUT)mkdirSync(OUT,{recursive:true});
console.log('EXACT-PRG '+JSON.stringify({gameId:'archive-02121',sha256:sha256(prg),bytes:prg.length}));
let machine=new C64Machine();
machine.loadROMs({
  kernal:firmware('kernal-901227-03.bin'),
  basic:firmware('basic-901226-01.bin'),
  charRom:firmware('chargen-901225-01.bin')
});
assert.equal(machine.ready,true);
let frames=0;
for(;frames<250 && !readyVisible(machine.mem.ram);frames++)assert(machine.runFrame());
assert.ok(readyVisible(machine.mem.ram),'Authentic BASIC READY not reached');
record(machine,'basic-ready',frames);
machine.loadPRG(prg);machine.injectRun();
console.log('RUN injected, frame '+frames);
function advance(n,joy,name) {
  machine.joyPort1=joy;machine.joyPort2=joy;
  for(let i=0;i<n;i++){assert(machine.runFrame());frames++;}
  record(machine,name,frames);
}
advance(40,0xff,'after-run-40');
advance(90,0xff,'after-run-130');
advance(90,0xff,'after-run-220');
advance(6,0xef,'fire-press');
advance(70,0xff,'fire-release-70');
advance(55,0xf7,'move-right');
advance(55,0xfe,'move-up');
advance(55,0xfb,'move-left');
advance(50,0xf5,'move-down-fire');
advance(75,0xff,'rest-75');
// After the preserved FBR intro, allow the remaining original game loader to
// finish before using the published Crossfire F1 start key. This probe never
// makes claims about a score or end-of-run state from these input sequences.
advance(400,0xff,'after-loader-400');
advance(400,0xff,'after-loader-800');
advance(400,0xff,'after-loader-1200');
machine.cia1.setKey(0,4,true); // F1 on the repository's C64 keyboard matrix
advance(6,0xff,'f1-press');
machine.cia1.setKey(0,4,false);
advance(140,0xff,'after-f1-140');
advance(350,0xff,'after-f1-490');
// The source contains a SECOND DCS crack scroller after the first FBR intro.
// Exercise normal keys independently to locate the playable game transition.
function pressKey(col,row,pressedName,releaseName) {
  machine.cia1.setKey(col,row,true);
  advance(8,0xff,pressedName);
  machine.cia1.setKey(col,row,false);
  advance(250,0xff,releaseName);
}
pressKey(7,4,'space-press','after-space-250');
pressKey(0,1,'enter-press','after-enter-250');
advance(8,0xef,'fire-again-press');
advance(250,0xff,'after-fire-250');
pressKey(0,4,'f1-retry-press','after-f1-retry-250');
// The exact archived PRG offers a TRAINER. Answer N on the real C64 keyboard
// to reject endless lives. This does not establish that trainers are disabled
// in subsequent gameplay, and never qualifies a leaderboard submission.
machine.cia1.setKey(4,7,true); // KeyN on the existing matrix
advance(8,0xff,'n-endless-lives-press');
machine.cia1.setKey(4,7,false);
advance(200,0xff,'after-n-200');
advance(300,0xff,'after-n-500');
advance(400,0xff,'after-n-900');
// The first No exposes a second trainer question (Endless time?). Reject any
// subsequent Yes/No trainer options individually. Never interpret test runs as
// eligible leaderboard records without a verified no-cheat session signature.
function rejectTrainerOption(index, settleFrames=140) {
  machine.cia1.setKey(4,7,true);
  advance(8,0xff,'n'+index+'-press');
  machine.cia1.setKey(4,7,false);
  advance(settleFrames,0xff,'after-n'+index+'-'+settleFrames);
}
rejectTrainerOption(2);
rejectTrainerOption(3);
rejectTrainerOption(4);
rejectTrainerOption(5,200);
// A fixed "Starting level (1-9)?" prompt follows both rejected cheats.
// Choose level 1 on the exact C64 key matrix before inspecting gameplay.
pressKey(7,0,'level1-press','after-level1-250'); // Digit1
advance(400,0xff,'after-level1-650');
pressKey(0,4,'start-f1-press','after-start-f1-300');
// Authentic title screen for Atlantis/Pantheon Crossfire says FIRE TO PLAY.
// Trigger the joystick fire signal only after declining both trainer options
// and selecting level one. These are observations, NOT eligible score runs.
advance(8,0xef,'fire-play-press');
advance(80,0xff,'after-fire-play-80');
advance(170,0xff,'after-fire-play-250');
advance(250,0xe7,'after-right-fire-250');
advance(300,0xff,'after-play-idle-300');
// Try a second FIRE from the displayed "LEVEL 1 / DOWNTOWN CHICAGO" state.
// Preserve the HUD/score framebuffer without assuming the score has advanced.
advance(8,0xef,'level-fire-press');
advance(150,0xff,'after-level-fire-150');
// Fork this known playable state (not the non-restorable snapshot debug dump).
// Each scoring experiment begins at the same exact machine state, without
// modifying the production game or using any of the trainer options.
const playableState=machine.serializeState();
// The first street gameplay image appears here. Sweep the aim while holding
// FIRE using the existing joystick encoding; do not label results as scores.
// At street start the sprite 0/1 cursor is x=112,y=128; character-window
// targets appear near x=75,y=145 and x=195,y=185. The VIC coordinate to
// visible-screen offset is empirical and target shots must be verified onscreen.
// Move WITHOUT fire; only press once the cursor has reached a suspected target.
advance(30,0xfb,'target-upper-left-x');
advance(12,0xfd,'target-upper-left-y');
advance(8,0xef,'shoot-upper-left-8');
advance(8,0xff,'release-upper-left-8');
advance(60,0xf7,'target-lower-right-x');
advance(20,0xfd,'target-lower-right-y');
advance(8,0xef,'shoot-lower-right-8');
advance(8,0xff,'release-lower-right-8');
advance(60,0xef,'followup-fire-60');
advance(120,0xff,'first-shots-rest-120');
advance(300,0xff,'after-level-fire-move-300');
advance(400,0xff,'after-level-fire-rest-400');
// Independent target experiments from the same no-cheat first-street state.
// Restores are DIAGNOSTIC only, not eligible challenge attempts.
const scenarios=[
  {label:'lower-left',commands:[
    [30,0xfb,'move-left-30'],[33,0xfd,'move-down-33'],
    [8,0xef,'shoot-8'],[15,0xff,'release-15']]},
  {label:'lower-right',commands:[
    [30,0xf7,'move-right-30'],[33,0xfd,'move-down-33'],
    [8,0xef,'shoot-8'],[15,0xff,'release-15']]},
  {label:'upper-left',commands:[
    [30,0xfb,'move-left-30'],[12,0xfd,'move-down-12'],
    [8,0xef,'shoot-8'],[15,0xff,'release-15']]},
  {label:'lower-left-offset',commands:[
    [27,0xfb,'move-left-27'],[29,0xfd,'move-down-29'],
    [8,0xef,'shoot-8'],[15,0xff,'release-15']]},
  {label:'two-targets-left-then-right',commands:[
    [30,0xfb,'move-left-30'],[33,0xfd,'move-down-33'],
    [8,0xef,'first-shot-8'],[8,0xff,'first-release-8'],
    [60,0xf7,'move-right-60'],[8,0xef,'second-shot-8'],
    [15,0xff,'second-release-15'],[60,0xff,'post-shot-60']]},
  {label:'two-targets-right-then-left',commands:[
    [30,0xf7,'move-right-30'],[33,0xfd,'move-down-33'],
    [8,0xef,'first-shot-8'],[8,0xff,'first-release-8'],
    [60,0xfb,'move-left-60'],[8,0xef,'second-shot-8'],
    [15,0xff,'second-release-15'],[60,0xff,'post-shot-60']]},
];
for(const scenario of scenarios) {
  machine=new C64Machine();
  machine.loadROMs({
    kernal:firmware('kernal-901227-03.bin'),
    basic:firmware('basic-901226-01.bin'),
    charRom:firmware('chargen-901225-01.bin')
  });
  machine.restoreState(playableState);
  console.log('SCENARIO_START '+JSON.stringify({label:scenario.label,source:'single exact state from normal Crossfire level 1'}));
  advance(1,0xff,'scenario-'+scenario.label+'-start');
  for(const [n,joy,label] of scenario.commands) advance(n,joy,'scenario-'+scenario.label+'-'+label);
  console.log('SCENARIO_END '+JSON.stringify({
    label:scenario.label,displayedScoreIfHUD:readCrossfireScreenScore(machine.mem.ram),
    screenBase:screenText(machine).base
  }));
}
// Run score persistence across an ACTUAL life loss and restart, rather than
// mistaking the Level-1 interstitial for a playable second target.
machine=new C64Machine();
machine.loadROMs({
  kernal:firmware('kernal-901227-03.bin'),
  basic:firmware('basic-901226-01.bin'),
  charRom:firmware('chargen-901225-01.bin')
});
machine.restoreState(playableState);
const lifeObserver=new CrossfireRunObserver({gameId:'archive-02121',prgSHA256:SHA});
lifeObserver.observe(machine.mem.ram);
console.log('LIFE_CYCLE_START same original Level-1 no-trainer state');
advance(1,0xff,'life-cycle-fresh-start');
advance(30,0xfb,'life-cycle-first-aim-x');
advance(33,0xfd,'life-cycle-first-aim-y');
advance(8,0xef,'life-cycle-first-hit');
lifeObserver.observe(machine.mem.ram);
advance(110,0xff,'life-cycle-after-first-death');
lifeObserver.observe(machine.mem.ram);
advance(8,0xef,'life-cycle-restart-fire');
advance(150,0xff,'life-cycle-respawn-150');
advance(30,0xf7,'life-cycle-second-aim-x');
advance(33,0xfd,'life-cycle-second-aim-y');
advance(8,0xef,'life-cycle-second-hit');
lifeObserver.observe(machine.mem.ram);
advance(80,0xff,'life-cycle-after-second-hit');
lifeObserver.observe(machine.mem.ram);
// Confirm whether a lives HUD glyph of 0 is final game over or the last
// remaining life; then observe what really appears after the next death.
advance(90,0xff,'life-cycle-zero-lives-hold');
advance(8,0xef,'life-cycle-third-resume-fire');
advance(150,0xff,'life-cycle-third-respawn');
advance(30,0xfb,'life-cycle-third-aim-x');
advance(33,0xfd,'life-cycle-third-aim-y');
advance(8,0xef,'life-cycle-third-hit');
lifeObserver.observe(machine.mem.ram);
advance(105,0xff,'life-cycle-after-third-death');
let observedFinal=lifeObserver.observe(machine.mem.ram);
for(let i=0;i<25&&!observedFinal;i++){
  assert(machine.runFrame());frames++;
  observedFinal=lifeObserver.observe(machine.mem.ram);
}
assert.equal(observedFinal?.score,2325,
  'No diagnostic final-score candidate unless actual grave persists after last life');
assert.equal(observedFinal?.kind,'diagnostic-final-score-candidate');
console.log('CROSSFIRE_OBSERVER_VERIFIED '+JSON.stringify(observedFinal));
advance(250,0xff,'life-cycle-post-game-over-250');
advance(400,0xff,'life-cycle-post-game-over-650');
console.log('LIFE_CYCLE_END '+JSON.stringify({
  displayedScoreIfHUD:readCrossfireScreenScore(machine.mem.ram),
  screenBase:screenText(machine).base,
  lifeGlyphs:Array.from(machine.mem.ram.subarray(0x7429,0x742b))
}));
// Independent no-hit/zero-score route through all three lives.
// The memory/drawing signature must be verified against DIFFERENT scoring
// outcomes before any game-over classifier is even considered.
machine=new C64Machine();
machine.loadROMs({
  kernal:firmware('kernal-901227-03.bin'),
  basic:firmware('basic-901226-01.bin'),
  charRom:firmware('chargen-901225-01.bin')
});
machine.restoreState(playableState);
console.log('NO_HIT_GAME_OVER_START exact level-one state; no shots or trainers');
// HUD counter glyph is $04/$05=0, $08/$09=1, $0c/$0d=2.
// The below is an internal diagnostic observer, not a trustworthy final
// leaderboard lifecycle detector. The machine itself is unchanged.
function readTestLives() {
  const ram=machine.mem.ram, a=ram[0x7429], b=ram[0x742a];
  if (readCrossfireScreenScore(ram) === null) return null;
  return b===a+1 && a>=4 && a<=0x28 && (a-4)%4===0 ? (a-4)/4 : null;
}
function waitTestLives(target,label,maxFrames=1500) {
  machine.joyPort1=0xff;machine.joyPort2=0xff;
  let found=false,ran=0;
  for(;ran<maxFrames;ran++) {
    assert(machine.runFrame());frames++;
    if(readTestLives()===target){found=true;break;}
  }
  console.log('ZERO_LIFE_TRANSITION '+JSON.stringify({target,found,ran,lives:readTestLives(),score:readCrossfireScreenScore(machine.mem.ram)}));
  record(machine,label,frames);
  return found;
}
const zeroSawLifeOne=waitTestLives(1,'zero-run-life1-death-observed');
if(zeroSawLifeOne) {
  advance(8,0xef,'zero-run-life2-start');
  const zeroSawLifeZero=waitTestLives(0,'zero-run-life2-death-observed');
  if(zeroSawLifeZero) {
    advance(8,0xef,'zero-run-final-life-start');
    machine.joyPort1=0xff;machine.joyPort2=0xff;
    // Reference: unchanged grave-screen bytes persisted at frames 9586,
    // 9836 and 10236 of positive-score run 43938124747. This is an
    // INVESTIGATION GATE only, not production gameover classification.
    const knownGraveHeader=Buffer.from('0303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030333340235360303','hex');
    let graveFrames=0,graveObserved=false,gameoverAfterFrames=0;
    for(;gameoverAfterFrames<1800;gameoverAfterFrames++) {
      assert(machine.runFrame());frames++;
      const current=Buffer.from(machine.mem.ram.subarray(0x7400,0x7450));
      if(current.equals(knownGraveHeader)) graveFrames++; else graveFrames=0;
      if(graveFrames>=20) {graveObserved=true;break;}
    }
    console.log('ZERO_GAMEOVER_TRANSITION '+JSON.stringify({graveObserved,graveFrames,gameoverAfterFrames,score:readCrossfireScreenScore(machine.mem.ram)}));
    record(machine,'zero-run-grave-confirmed',frames);
    advance(280,0xff,'zero-run-game-over-hold');
  }
}
console.log('NO_HIT_GAME_OVER_END '+JSON.stringify({
  scoreIfHud:readCrossfireScreenScore(machine.mem.ram),
  screenSHA256:sha256(machine.mem.ram.subarray(0x7400,0x77e8)),
  headerHex:Buffer.from(machine.mem.ram.subarray(0x7400,0x7450)).toString('hex')
}));
if(OUT)writeFileSync(resolve(OUT,'manifest.json'),JSON.stringify({
  gameId:'archive-02121',mediaSHA256:SHA,
  automatedScoreDetected:false,scoreAddressValidated:false,gameOverValidated:false,
  samples
},null,2)+'\n');
console.log('PROBE COMPLETE '+JSON.stringify({frames,observations:samples.length,scoreAddressValidated:false,gameOverValidated:false}));
