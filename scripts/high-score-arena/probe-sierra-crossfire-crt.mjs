#!/usr/bin/env node
/**
 * Sierra On-Line Crossfire: read-only, exact CRT memory/video capture.
 * Diagnostic only. NO public scores, member data, network, or submissions.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { C64Machine } from '../../js/ccg-c64/core/machine.js';
import { KEY_MAP } from '../../js/ccg-c64/core/cia.js';
import { readSierraCrossfireScreenScores } from './read-sierra-crossfire-screen-score.mjs';
import { sierraCrossfireGameOverVisible } from './observe-sierra-crossfire-run.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const expected = Object.freeze({
 title:'Crossfire (Sierra Online)',
 filename:'crossfiresierraonline-0c60e852f438.crt',
 bytes:65728, hardware:19,
 digest:'0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab'
});
const sha = value => createHash('sha256').update(value).digest('hex');
const catalog = JSON.parse(readFileSync(resolve(root,'emulator/c64/media/cartridge-replacements/active.json'),'utf8'));
assert.equal(catalog.ownerRedistributionAttested,true);
const rows = catalog.games.filter(row=>row[0]===expected.title && row[1]===expected.filename);
assert.equal(rows.length,1,'Only the owner-selected Sierra CRT is eligible for capture');
assert.deepEqual(rows[0],[expected.title,expected.filename,expected.bytes,expected.digest,expected.hardware]);
const bytes = new Uint8Array(readFileSync(resolve(root,'emulator/c64/media/cartridge-replacements',expected.filename)));
assert.equal(bytes.byteLength,expected.bytes);
assert.equal(sha(bytes),expected.digest,'Unexpected CRT bytes: fail closed');
const roms = Object.fromEntries(Object.entries({
 kernal:'kernal-901227-03.bin',basic:'basic-901226-01.bin',charRom:'chargen-901225-01.bin'
}).map(([key,name])=>[key,new Uint8Array(readFileSync(resolve(root,'emulator/c64/firmware',name)))]));
const machine=new C64Machine();
machine.loadROMs(roms);
assert.equal(machine.loadCartridge(bytes).hwType,19);
const outputIndex=process.argv.indexOf('--output-dir');
const output=resolve(outputIndex<0?'sierra-crossfire-forensics':process.argv[outputIndex+1]);
mkdirSync(output,{recursive:true});
let frames=0;
function advance(count) {
 for(let i=0;i<count;i++){assert.equal(machine.runFrame(),true,'PAL emulation stopped');frames++;}
}
function press(name,count) {
 const key=KEY_MAP[name];assert(key,'Unknown C64 key');
 machine.cia1.setKey(...key,true);advance(count);machine.cia1.setKey(...key,false);
}
function crc32(bytes) {
 let n=0xffffffff;for(const byte of bytes){n^=byte;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}
 return (n^0xffffffff)>>>0;
}
function pngChunk(type,bytes) {
 const t=Buffer.from(type,'ascii'),header=Buffer.alloc(4),sum=Buffer.alloc(4);
 header.writeUInt32BE(bytes.length);sum.writeUInt32BE(crc32(Buffer.concat([t,bytes])));
 return Buffer.concat([header,t,bytes,sum]);
}
function pngFrame() {
 const width=384,height=272,rgba=machine.vic2.frameBuffer;
 assert.equal(rgba.byteLength,width*height*4);
 const scan=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++){
   scan[y*(width*4+1)]=0;
   Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(scan,y*(width*4+1)+1);
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
   pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(scan)),pngChunk('IEND',Buffer.alloc(0))]);
}
function textCode(raw) {
 const value=raw&127;
 if(value>=1&&value<=26)return String.fromCharCode(value+64);
 if(value>=48&&value<=57)return String.fromCharCode(value);
 return value===32?' ':'.';
}
const captures=[];
function capture(label) {
 const ram=machine.mem.ram.slice(),registers=machine.vic2.regs;
 const base=(machine.cia2.vicBank+((registers[0x18]>>>4)&15)*1024)&65535;
 const screenRows=Array.from({length:25},(_,y)=>Array.from({length:40},(_,x)=>
  textCode(ram[(base+y*40+x)&65535])).join(''));
 const asciiDigits=[];
 for(let i=0;i<65531;i++) {
  if(ram[i]>=48&&ram[i]<=57) {
   let j=i;while(j<65536&&ram[j]>=48&&ram[j]<=57&&j<i+12)j++;
   if(j-i>=5&&asciiDigits.length<35)asciiDigits.push({
    address:'$'+i.toString(16).padStart(4,'0'),
    text:Array.from(ram.subarray(i,j),x=>String.fromCharCode(x)).join('')
   });
   i=j-1;
  }
 }
 const result={label,frames,pc:machine.cpu.pc,screenBase:base,
   vicD011:registers[0x11],vicD018:registers[0x18],
   ramSha256:sha(ram),screenRows,asciiDigits,
   localScoreCandidate:readSierraCrossfireScreenScores(ram)};
 const previous=captures.at(-1);
 if(previous) {
  const changed=[];for(let i=0;i<65536;i++)if(ram[i]!==previous.ram[i])changed.push(i);
  result.changedRam={count:changed.length,first256:changed.slice(0,256).map(i=>
   '$'+i.toString(16).padStart(4,'0'))};
 }
 captures.push({ram,result});
 writeFileSync(resolve(output,label+'.ram'),Buffer.from(ram));
 writeFileSync(resolve(output,label+'.png'),pngFrame());
 writeFileSync(resolve(output,label+'.json'),JSON.stringify(result,null,2));
 console.log('SIERRA_CRT_CAPTURE',JSON.stringify({
   label,frames,pc:result.pc,screenBase:base,ramSha256:result.ramSha256,
   visibleRows:screenRows.map((text,index)=>({index,text:text.trim()}))
     .filter(item=>/[A-Z0-9]/.test(item.text)).slice(0,22),
   asciiDigits:asciiDigits.slice(0,12),localScoreCandidate:result.localScoreCandidate,
   changedRamCount:result.changedRam?.count??null
 }));
}
advance(400);capture('01-title');
const titleState=machine.serializeState();
// A short four-frame keypress was not sufficient: the prior trials reached
// the automatic attract/game-over sequence with zero score. Check longer F1
// key holds and capture very early frames before gameplay advances.
const positiveCandidates=[];
if(process.argv.includes('--hunt-score')) {
 // Begin AFTER the CRT's automatic demonstration has reached GAME OVER.
 // F1 during its initial SierraVision credits is too early and was ignored;
 // all previous 24 strategies merely observed the same ~57-frame demo end.
 let attractFrames=0;
 while(!sierraCrossfireGameOverVisible(machine.mem.ram)&&attractFrames<400) {
  advance(1);attractFrames++;
 }
 assert(sierraCrossfireGameOverVisible(machine.mem.ram),
  'Expected real ROM attract-mode GAME OVER before explicit player F1');
 capture('02-gameover-before-user-f1');
 const gameOverState=machine.serializeState();
 // Genuine Sierra CRT C64Machine, no synthetic RAM modifications.
 // Each trial independently restarts from the pre-game title state.
 // Joystick FIRE changes from movement mode to firing mode; keyboard offers
 // independent IJKL movement and ESDF firing (Sierra manual).
 const strategies=[
  ...[['up',0xee],['right',0xe7],['down',0xed],['left',0xeb]]
    .map(([name,mask])=>({name:'joy2-'+name+'-fire',mask})),
  ...['KeyE','KeyD','KeyS','KeyF'].map(fire=>({name:'shoot-'+fire,fire})),
  ...['KeyI','KeyK','KeyJ','KeyL'].flatMap(move=>
    ['KeyE','KeyD','KeyS','KeyF'].map(fire=>({
      name:'move-'+move+'-fire-'+fire,move,fire
    })))
 ];
 let attempt=0;
 for(const strategy of strategies) {
  attempt++;
  machine.restoreState(gameOverState);
  machine.joyPort1=0xff;machine.joyPort2=0xff;
  press('F1',8);
  const held=[];
  for(const k of [strategy.move,strategy.fire]) {
   if(!k)continue;
   const pair=KEY_MAP[k];assert(pair,'Invalid input '+k);
   machine.cia1.setKey(...pair,true);held.push(pair);
  }
  if(strategy.mask)machine.joyPort2=strategy.mask;
  let hit=null, terminal=false;
  for(let n=0;n<240;n++) {
   advance(1);
   const hud=readSierraCrossfireScreenScores(machine.mem.ram);
   const isOver=sierraCrossfireGameOverVisible(machine.mem.ram);
   if(hud?.score>0&&!isOver) {
    hit={strategy:strategy.name,frameWithinRun:n+1,score:hud.score,
      oldHighScore:hud.highScore,originalMedia:expected.digest};
    capture('positive-'+String(attempt).padStart(2,'0'));
    positiveCandidates.push(hit);
    break;
   }
   if(isOver&&n>15){terminal=true;break;}
  }
  for(const key of held)machine.cia1.setKey(...key,false);
  machine.joyPort2=0xff;
  console.log('SIERRA_CRT_HUNT_TRIAL',JSON.stringify({
    strategy:strategy.name,frames,terminal,hit
  }));
 }
 if(process.argv.includes('--full-run')) {
  // Long original-ROM sessions. Capture actual score transitions and an
  // end-of-run only when 25 consecutive frames show genuine GAME OVER.
  // This produces evidence, NEVER a trusted/eligible public attempt.
  for(const [name,mask] of [['up-fire',0xee],['left-fire',0xeb]]) {
   machine.restoreState(gameOverState);
   machine.joyPort1=0xff;machine.joyPort2=0xff;
   press('F1',8);
   machine.joyPort2=mask;
   const changes=[];
   let sawZero=false,sawPositive=false,gameOverFrames=0,finished=false;
   let lastScore=null,lastActiveScore=null;
   for(let i=0;i<1500;i++) {
    advance(1);
    const ram=machine.mem.ram;
    const hud=readSierraCrossfireScreenScores(ram);
    const over=sierraCrossfireGameOverVisible(ram);
    if(hud&&!over) {
     gameOverFrames=0;
     if(hud.score===0)sawZero=true;
     if(hud.score>0)sawPositive=true;
     if(hud.score!==lastScore) {
      lastScore=hud.score;
      changes.push({frame:i+1,score:hud.score,highScore:hud.highScore});
      if(changes.length<=15)capture('run-'+name+'-score-'+String(changes.length).padStart(2,'0'));
     }
     lastActiveScore=hud.score;
    } else if(over&&sawZero&&sawPositive) {
     gameOverFrames++;
     if(gameOverFrames>=25) {
      finished=true;
      capture('run-'+name+'-gameover');
      break;
     }
    } else {
     gameOverFrames=0;
    }
   }
   machine.joyPort2=0xff;
   console.log('SIERRA_CRT_FULL_RUN',JSON.stringify({
    name,mediaSha256:expected.digest,sawActiveZero:sawZero,
    sawPositiveScore:sawPositive,positiveTransitions:changes.filter(x=>x.score>0),
    changes,stableTerminal25Frames:finished,lastActiveScore,
    publicScoreEligible:false,submitted:false
   }));
  }
 }
 console.log('SIERRA_CRT_SCORE_HUNT_COMPLETE',JSON.stringify({
   strategies:strategies.length,positiveCandidates:positiveCandidates.length,
   automaticSubmissionEnabled:false
 }));
} else {
const trials=[
 {name:'no-f1-control',hold:0,port:2,mask:0xff},
 {name:'f1-16',hold:16,port:2,mask:0xff},
 {name:'f1-30',hold:30,port:2,mask:0xff},
 {name:'f1-60',hold:60,port:2,mask:0xff},
 {name:'f1-90',hold:90,port:2,mask:0xff},
 {name:'f1-30-joystick-fire',hold:30,port:2,mask:0xe7},
 {name:'f1-60-joystick-fire',hold:60,port:2,mask:0xe7},
 {name:'f1-30-key-fire',hold:30,key:'KeyE'}
];
for(let n=0;n<trials.length;n++){
 const trial=trials[n];
 machine.restoreState(titleState);
 machine.joyPort1=0xff;machine.joyPort2=0xff;
 if(trial.hold>0)press('F1',trial.hold);
 const name=String(n+2).padStart(2,'0')+'-'+trial.name;
 capture(name+'-immediate');
 const pos=trial.key?KEY_MAP[trial.key]:null;
 if(pos)machine.cia1.setKey(...pos,true);
 if(trial.port===2)machine.joyPort2=trial.mask;
 advance(18);capture(name+'-18f');
 advance(35);capture(name+'-53f');
 advance(50);capture(name+'-103f');
 if(pos)machine.cia1.setKey(...pos,false);
 machine.joyPort1=0xff;machine.joyPort2=0xff;
}
}
writeFileSync(resolve(output,'manifest.json'),JSON.stringify({
 game:expected.title,mediaSha256:expected.digest,captureFrames:frames,
 captures:captures.map(item=>({label:item.result.label,frame:item.result.frames,ramSha256:item.result.ramSha256})),
 observedPositiveScoreCandidates:positiveCandidates,verifiedScores:[],verifiedGameOver:false,submissions:0,
 caution:'Controlled positive displayed scores, score bytes and final game-over must be independently verified.'
},null,2));
console.log('SIERRA_CRT_FORENSIC_COMPLETE',JSON.stringify({
 frames,captures:captures.length,verifiedScoreAddresses:0,scoreSubmissions:0
}));