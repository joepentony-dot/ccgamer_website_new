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
  console.log('PROBE '+JSON.stringify({...sample,screenText:visible.slice(0,12)}));
  // The public archive entry contains a historical crack intro. Emit only
  // selected diagnostic frames for separate visual review; no score is inferred.
  if (['after-n2-140', 'after-level1-250', 'after-level1-650', 'after-start-f1-300'].includes(name)) {
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
const machine=new C64Machine();
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
if(OUT)writeFileSync(resolve(OUT,'manifest.json'),JSON.stringify({
  gameId:'archive-02121',mediaSHA256:SHA,
  automatedScoreDetected:false,scoreAddressValidated:false,gameOverValidated:false,
  samples
},null,2)+'\n');
console.log('PROBE COMPLETE '+JSON.stringify({frames,observations:samples.length,scoreAddressValidated:false,gameOverValidated:false}));
