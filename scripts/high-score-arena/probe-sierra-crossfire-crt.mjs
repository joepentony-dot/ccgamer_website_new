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
   ramSha256:sha(ram),screenRows,asciiDigits};
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
   asciiDigits:asciiDigits.slice(0,12),changedRamCount:result.changedRam?.count??null
 }));
}
advance(400);capture('01-title');
press('F1',16);advance(150);capture('02-f1-start');
const actions=[['right-fire',0xe7],['up-fire',0xee],['left-fire',0xeb],
 ['down-fire',0xed],['right-fire-2',0xe7],['fire',0xef],
 ['left-fire-2',0xeb],['neutral',0xff]];
for(let i=0;i<actions.length;i++) {
 const [label,port]=actions[i];
 machine.joyPort2=port;advance(150);machine.joyPort2=0xff;
 if(i===1||i===3||i===5||i===7)capture((i+3)+'-'+label);
}
writeFileSync(resolve(output,'manifest.json'),JSON.stringify({
 game:expected.title,mediaSha256:expected.digest,captureFrames:frames,
 captures:captures.map(item=>({label:item.result.label,frame:item.result.frames,ramSha256:item.result.ramSha256})),
 verifiedScores:[],verifiedGameOver:false,submissions:0,
 caution:'Controlled positive displayed scores, score bytes and final game-over must be independently verified.'
},null,2));
console.log('SIERRA_CRT_FORENSIC_COMPLETE',JSON.stringify({
 frames,captures:captures.length,verifiedScoreAddresses:0,scoreSubmissions:0
}));