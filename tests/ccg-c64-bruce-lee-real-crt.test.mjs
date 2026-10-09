import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { C64Machine } from "../js/ccg-c64/core/machine.js";
import { KEY_MAP } from "../js/ccg-c64/core/cia.js";

// Use the exact public Magic Desk cartridge, not the retired PRG listing.
const romPaths = {
  kernal: "emulator/c64/firmware/kernal-901227-03.bin",
  basic: "emulator/c64/firmware/basic-901226-01.bin",
  charRom: "emulator/c64/firmware/chargen-901225-01.bin",
};
const roms = Object.fromEntries(Object.entries(romPaths).map(([k,p]) =>
  [k,new Uint8Array(fs.readFileSync(p))]));
const crt = new Uint8Array(fs.readFileSync("emulator/c64/media/bruce-lee-trilogy.crt"));

const c64Char = (v) => {
  v &= 0x7f;
  if(v===32 || v===0x60) return " ";
  if(v>=1 && v<=26) return String.fromCharCode(v+64);
  if(v>=48 && v<=57) return String.fromCharCode(v);
  return v===46 ? "." : " ";
};
function screen(machine) {
  const base=(machine.cia2.vicBank +
    ((machine.vic2.regs[0x18] >>> 4) & 15) * 1024) & 0xffff;
  const codes=Array.from({length:1000},(_,i)=>machine.mem.ram[(base+i)&0xffff]);
  return codes.map(c64Char).join("");
}
function gameImage(machine) {
  const bank=machine.cia2.vicBank;
  const d018=machine.vic2.regs[0x18];
  const screenBase=(bank+((d018>>>4)&15)*1024)&0xffff;
  const bitmapBase=(bank+((d018&0x08)?8192:0))&0xffff;
  const ram=machine.mem.ram;
  return {
    d011:machine.vic2.regs[0x11], d018, screenBase, bitmapBase,
    screen:Array.from({length:1000},(_,i)=>ram[(screenBase+i)&0xffff]),
    bitmap:Array.from({length:8000},(_,i)=>ram[(bitmapBase+i)&0xffff]),
    colors:Array.from(machine.mem.colorRam),
    vic:Array.from(machine.vic2.regs.slice(0,0x30)),
    memBank:machine.mem.cartridge?.bank,
    pc:machine.cpu.pc,
  };
}
function diff(before,after) {
  const count=(x,y)=>x.reduce((n,v,i)=>n+(v!==y[i]),0);
  return {
    screen:count(before.screen,after.screen),bitmap:count(before.bitmap,after.bitmap),
    colors:count(before.colors,after.colors),vic:count(before.vic,after.vic),
    screenBaseChanged:before.screenBase!==after.screenBase,
    bitmapBaseChanged:before.bitmapBase!==after.bitmapBase,
  };
}
function progress(machine,frames) {
  for(let i=0;i<frames;i++) assert(machine.runFrame(),"PAL emulation must advance");
}
function key(machine,name,frames) {
  const matrix=KEY_MAP[name];
  assert(matrix,"Missing mapping for "+name);
  machine.cia1.setKey(...matrix,true);
  progress(machine,frames);
  machine.cia1.setKey(...matrix,false);
}
test("Bruce Lee 1984 actual CRT menu reacts to function keys",()=>{
  const machine=new C64Machine();
  machine.loadROMs(roms);
  const cart=machine.loadCartridge(crt);
  assert.equal(cart.hwType,19);
  // The cartridge FIRST shows its own year selector. It is not the game's
  // title screen; use FIRE in joystick port 2 to enter Bruce Lee 1984.
  let selectorFrame=-1;
  for(let i=0;i<600;i+=10) {
    progress(machine,10);
    if(screen(machine).includes("1984")) {selectorFrame=i+10;break;}
  }
  assert(selectorFrame>=0,"Trilogy year selector must appear");
  progress(machine,35);
  const picker=gameImage(machine);
  machine.joyPort2=0xef; // FIRE: select first entry, Bruce Lee 1984
  progress(machine,25);
  machine.joyPort2=0xff;
  // The Magic Desk cartridge decompresses the selected 1984 game before the
  // game's own menu appears. Don't mistake that timed loading transition for
  // an F-key response (an earlier permissive test did exactly that).
  let originalTitleFrame=-1;
  const stages=[];
  for(let f=0;f<1200;f+=10) {
    progress(machine,10);
    const current=gameImage(machine);
    const text=current.screen.map(c64Char).join("");
    if(f%100===0) stages.push({frame:f,screenBase:current.screenBase,
      bitmapMode:Boolean(current.d011&0x20),pc:current.pc,bank:current.memBank,
      text:text.replace(/ {2,}/g," ").slice(0,160)});
    if(/BRUCE.{0,40}LEE/.test(text) && /PLAYER|PRESS/.test(text)) {
      originalTitleFrame=f+10;
      break;
    }
  }
  const title=gameImage(machine);
  console.log("Bruce Lee load stages:",JSON.stringify(stages));
  console.log("Bruce Lee CRT selection:",JSON.stringify({
    selectorFrame,originalTitleFrame,yearSelectorScreenBase:picker.screenBase,
    gameScreenBase:title.screenBase,bitmapMode:Boolean(title.d011&0x20),
    screenModeChange:diff(picker,title),
    cartridgeBank:title.memBank,pc:title.pc,
  }));
  assert(originalTitleFrame!==-1,
    "Original Bruce Lee menu never became ready; cannot validate in-game F3/F5/F7");
  progress(machine,30);
  let prior=gameImage(machine);

  let active=null;const reads={};
  const originalRead=machine.cia1.read.bind(machine.cia1);
  machine.cia1.read=(reg)=>{
    if(active && ((reg&15)===0 || (reg&15)===1)) {
      const info=reads[active]||={portA:0,portB:0,samples:[]};
      if((reg&15)===0)info.portA++;else info.portB++;
      if(info.samples.length<8) info.samples.push({
        reg:reg&15,ddrA:machine.cia1.portADir,ddrB:machine.cia1.portBDir,
        latchA:machine.cia1.portA,latchB:machine.cia1.portB
      });
    }
    return originalRead(reg);
  };
  const results=[];
  for(const name of ["F3","F5","F7"]) {
    const before=prior;
    active=name;
    key(machine,name,50);
    const held=gameImage(machine);
    progress(machine,20);
    const after=gameImage(machine);
    active=null;
    const response={
      name,held:diff(before,held),after:diff(before,after),read:reads[name],
      pc:after.pc,mode:after.d011,bank:after.memBank,
    };
    results.push(response);
    console.log("Bruce Lee "+name+" input:",JSON.stringify(response));
    prior=after;
  }
  const visualChange = entry =>
    entry.after.screen+entry.after.bitmap+entry.after.colors > 0 ||
    entry.held.screen+entry.held.bitmap+entry.held.colors > 0 ||
    entry.after.screenBaseChanged || entry.held.screenBaseChanged;
  assert(visualChange(results[0]),"F3 does not change the Bruce Lee player-selection display");
  assert(visualChange(results[1]),"F5 does not change the Bruce Lee opponent-selection display");
  assert(visualChange(results[2]),"F7 does not start the original Bruce Lee game");
});
