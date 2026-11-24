#!/usr/bin/env node
/**
 * Exact hosted Dropzone CRT — read-only real-ROM PAL video/RAM evidence.
 * This is diagnostic work for a GAME-SPECIFIC future score decoder.
 * NO synthetic score, network call, ranked submission or altered game memory.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync,mkdirSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { C64Machine } from "../../js/ccg-c64/core/machine.js";
import { KEY_MAP } from "../../js/ccg-c64/core/cia.js";
import { readDropzoneHudScore } from "../../js/ccg-c64/arena/games/dropzone/score-reader.mjs";
const root=resolve(import.meta.dirname,"../..");
const game=Object.freeze({
  title:"Dropzone",file:"dropzone.crt",bytes:82144,hardware:19,
  sha256:"0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7"
});
const digest=x=>createHash("sha256").update(x).digest("hex");
const catalog=JSON.parse(readFileSync(resolve(root,"emulator/c64/media/cartridge-replacements/active.json"),"utf8"));
assert.equal(catalog.ownerRedistributionAttested,true);
assert.deepEqual(catalog.games.filter(x=>x[0]===game.title&&x[1]===game.file),[
  [game.title,game.file,game.bytes,game.sha256,game.hardware]
]);
const crt=new Uint8Array(readFileSync(resolve(root,"emulator/c64/media/cartridge-replacements",game.file)));
assert.equal(crt.length,game.bytes);
assert.equal(digest(crt),game.sha256,"Unexpected hosted cartridge: stop");
const romNames={kernal:"kernal-901227-03.bin",basic:"basic-901226-01.bin",charRom:"chargen-901225-01.bin"};
const roms=Object.fromEntries(Object.entries(romNames).map(([key,name])=>[
 key,new Uint8Array(readFileSync(resolve(root,"emulator/c64/firmware",name)))
]));
const machine=new C64Machine();
machine.loadROMs(roms);
assert.equal(machine.loadCartridge(crt).hwType,19);
const index=process.argv.indexOf("--output-dir");
const output=resolve(index<0?"dropzone-crt-forensics":process.argv[index+1]);
mkdirSync(output,{recursive:true});
const CRC_TABLE=Uint32Array.from({length:256},(_,i)=>{
  let v=i;for(let k=0;k<8;k++)v=(v>>>1)^((v&1)?0xedb88320:0);
  return v>>>0;
});
function crc32(bytes){
 let sum=0xffffffff;for(const b of bytes)sum=CRC_TABLE[(sum^b)&255]^(sum>>>8);
 return(sum^0xffffffff)>>>0;
}
function pngChunk(name,content){
 const kind=Buffer.from(name),sz=Buffer.alloc(4),checksum=Buffer.alloc(4);
 sz.writeUInt32BE(content.length);
 checksum.writeUInt32BE(crc32(Buffer.concat([kind,content])));
 return Buffer.concat([sz,kind,content,checksum]);
}
function png(){
 const width=384,height=272,rgba=machine.vic2.frameBuffer;
 assert.equal(rgba.length,width*height*4);
 const data=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++){
  data[y*(width*4+1)]=0;
  Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4)
    .copy(data,y*(width*4+1)+1);
 }
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([
   Buffer.from([137,80,78,71,13,10,26,10]),
   pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateSync(data)),pngChunk("IEND",Buffer.alloc(0))
 ]);
}
let frames=0;
function advance(count){
  for(let j=0;j<count;j++){
    assert.equal(machine.runFrame(),true,"C64 PAL emulation stopped");
    frames++;
  }
}
function yellow(x,y){
 const i=((y+36)*384+(x+32))*4,rgba=machine.vic2.frameBuffer;
 const r=rgba[i],g=rgba[i+1],b=rgba[i+2];
 return r>140&&g>140&&r>b+35&&g>b+35;
}
function yellowHud(){
 return Array.from({length:9},(_,line)=>
  Array.from({length:41},(_,col)=>yellow(22+col,160+line)?"#":" ").join("")
 );
}
function screenText(){
 const v=machine.vic2.regs;
 const base=(machine.cia2.vicBank+((v[0x18]>>>4)&15)*1024)&65535;
 const ram=machine.mem.ram;
 const rows=Array.from({length:25},(_,row)=>{
  const codes=Array.from({length:40},(_,col)=>ram[(base+row*40+col)&65535]);
  return codes.map(n=>{
   n&=127;
   if(n>=1&&n<=26)return String.fromCharCode(64+n);
   if(n>=48&&n<=57)return String.fromCharCode(n);
   return n===32?" ":".";
  }).join("");
 });
 return {base:base.toString(16).padStart(4,"0"),rows:rows.map((text,i)=>({row:i,text}))
   .filter(x=>/[A-Z0-9]/.test(x.text)).slice(0,12)};
}
const snapshots=[];
function capture(name){
 const mem=machine.mem.ram;
 const screen=screenText();
 const screenBase=parseInt(screen.base,16);
 const localHudScore=readDropzoneHudScore(mem,{screenBase});
 const status={name,frame:frames,pc:machine.cpu.pc,
  sha256:digest(mem),screen,localHudScore,scoreYellowRows:yellowHud(),
  vic:{d011:machine.vic2.regs[0x11],d016:machine.vic2.regs[0x16],
    d018:machine.vic2.regs[0x18]}};
 const ram=Buffer.from(mem);
 writeFileSync(resolve(output,name+".ram"),ram);
 writeFileSync(resolve(output,name+".png"),png());
 writeFileSync(resolve(output,name+".json"),JSON.stringify(status,null,2));
 snapshots.push({name,frame:frames,ramSha256:status.sha256});
 console.log("DROPZONE_REAL_ROM_SNAPSHOT",JSON.stringify(status));
}
// The first real-ROM capture showed a splash/title image at 350 frames and
// credits around 800 frames. Held FIRE does not provide a valid gameplay
// observation. Advance the original CRT's attract sequence first, then
// test SHORT joystick FIRE edges with release, as the manual specifies.
advance(350);
capture("01-intro-350");
advance(500);
capture("02-credits-850");
advance(500);
capture("03-attract-1350");
advance(500);
capture("04-title-1850");
const titleState=machine.serializeState();
const trials=[
 {name:"idle",port:2,delay:0,pulse:0},
 {name:"fire2-edge3",port:2,delay:0,pulse:3},
 {name:"fire2-edge8",port:2,delay:0,pulse:8},
 {name:"fire2-after250",port:2,delay:250,pulse:5},
 {name:"fire2-right",port:2,delay:0,pulse:5,move:0xF7},
 {name:"fire1-control",port:1,delay:0,pulse:5}
];
const observed=[];
function visualFingerprint() {
 return digest(Buffer.from(machine.vic2.frameBuffer)).slice(0,16);
}
for(const trial of trials){
 machine.restoreState(titleState);
 machine.joyPort1=0xff;machine.joyPort2=0xff;
 advance(trial.delay);
 const before=visualFingerprint();
 if(trial.pulse) {
  const mask=0xef & (trial.move??0xff);
  if(trial.port===1)machine.joyPort1=mask;
  else machine.joyPort2=mask;
  advance(trial.pulse);
  // A short press/release is necessary. Held FIRE during the first CRT
  // splash produced no game evidence in the preceding forensic run.
  machine.joyPort1=0xff;machine.joyPort2=0xff;
 }
 advance(100);
 capture(trial.name+"-100f");
 const early=visualFingerprint();
 advance(250);
 capture(trial.name+"-350f");
 const middle=visualFingerprint();
 advance(450);
 capture(trial.name+"-800f");
 const late=visualFingerprint();
 const report={trial:trial.name,port:trial.port,pulseFrames:trial.pulse,
  delayFrames:trial.delay,distinctVideoStates:new Set([before,early,middle,late]).size,
  hashSequence:[before,early,middle,late]};
 observed.push(report);
 console.log("DROPZONE_START_TRIAL",JSON.stringify(report));
}
// Assert that the untouched, checksum-pinned CRT exposed genuine scores
// at both capture points across two independent FIRE press/release trials.
for(const name of ["fire2-edge3","fire2-edge8"]){
 const early=JSON.parse(readFileSync(resolve(output,name+"-350f.json"),"utf8"));
 const late=JSON.parse(readFileSync(resolve(output,name+"-800f.json"),"utf8"));
 assert.equal(early.localHudScore,0,name+" genuine active 0");
 assert.equal(late.localHudScore,10,name+" genuine active 10");
}
// Continue a real game without joystick input, observing natural score,
// life and terminal-video evolution. NO game RAM or scores are fabricated.
machine.restoreState(titleState);
machine.joyPort1=0xff;machine.joyPort2=0xef;
advance(3);
machine.joyPort1=0xff;machine.joyPort2=0xff;
advance(1200);capture("no-input-1200");
advance(1400);capture("no-input-2600");
// The exact CRT independently showed 280 points at 2600 frames and had
// returned to the title/high-score page by 4400 frames. Capture every
// 75 frames in the gap, keeping original RAM and video unmodified.
for(let elapsed=2675;elapsed<=4400;elapsed+=75){
 advance(75);
 capture("no-input-"+String(elapsed).padStart(4,"0"));
}
advance(2200);capture("no-input-6600");
writeFileSync(resolve(output,"manifest.json"),JSON.stringify({
 kind:"dropzone-exact-crt-start-edge-diagnostic",
 exactMediaSha256:game.sha256,originalGameBytes:game.bytes,
 snapshots,observedStartTrials:observed,
 verifiedScoreRamAddresses:[],gameOverRamSignatureVerified:false,
 publicSubmissionEnabled:false,
 note:"Exact CRT score HUD 0-to-10 tested on untouched emulator RAM. Natural terminal states still to be interpreted; no server submission."
},null,2));
console.log("DROPZONE_FORENSICS_COMPLETE",JSON.stringify({
 mediaSha256:game.sha256,snapshots:snapshots.length,
 trials:observed.length,verifiedScoreRamAddresses:0,publicSubmissions:0
}));
