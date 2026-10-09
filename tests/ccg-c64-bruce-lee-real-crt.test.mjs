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
  // The 1984 entry still passes through a static bitmap splash, then a
  // secondary title. The original game scans F3/F5/F7 at its own menu,
  // not during the splash or while the cartridge bank is unpacking.
  const stages=[];
  const record=(name)=>{
    const image=gameImage(machine);
    stages.push({name,pc:image.pc,screenBase:image.screenBase,
      bitmap:Boolean(image.d011&0x20),bank:image.memBank,
      words:image.screen.map(c64Char).join("").replace(/ {2,}/g," ").slice(0,260)});
  };
  progress(machine,260);record("1984 bitmap splash");
  key(machine,"F3",35); // first confirmation advances the splash
  progress(machine,320);record("after splash");
  machine.joyPort2=0xef;
  progress(machine,35);
  machine.joyPort2=0xff;
  progress(machine,320);record("1984 own menu before start");
  const originalTitleFrame="after 1984 splash confirmed";
  const title=gameImage(machine);
  console.log("Bruce Lee stuck-loop RAM:",JSON.stringify({
    pc:machine.cpu.pc,bytes:[...machine.mem.ram.slice(0xA30,0xA55)]}));
  console.log("Bruce Lee load stages:",JSON.stringify(stages));
  console.log("Bruce Lee CRT selection:",JSON.stringify({
    selectorFrame,originalTitleFrame,yearSelectorScreenBase:picker.screenBase,
    gameScreenBase:title.screenBase,bitmapMode:Boolean(title.d011&0x20),
    screenModeChange:diff(picker,title),
    cartridgeBank:title.memBank,pc:title.pc,
  }));
  assert(title.screenBase!==picker.screenBase && !(title.d011&0x20),
    "Didn't reach the selected 1984 game's character-display phase");
  const idleBefore=gameImage(machine);
  progress(machine,40);
  const idleAfter=gameImage(machine);
  console.log("Bruce Lee idle screen changes:",JSON.stringify(diff(idleBefore,idleAfter)));
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
  const reverseScan=machine.cia1._readKeyboardColumns;
  for(const name of ["F3","F5","F7"]) {
    // Play exactly the same keypress twice from the same emulated frame:
    // first with reverse-matrix sensing disabled (original deployed CIA),
    // then with the corrected bidirectional key matrix.
    const save=machine.serializeState();
    const before=gameImage(machine);
    machine.cia1._readKeyboardColumns=()=>0xff;
    active="baseline-"+name;
    key(machine,name,50);
    const oldHeld=gameImage(machine);
    progress(machine,20);
    const oldAfter=gameImage(machine);
    active=null;
    machine.restoreState(save);
    machine.cia1._readKeyboardColumns=reverseScan;
    active=name;
    key(machine,name,50);
    const held=gameImage(machine);
    progress(machine,20);
    const after=gameImage(machine);
    active=null;
    const response={
      name,baselineHeld:diff(before,oldHeld),baselineAfter:diff(before,oldAfter),
      held:diff(before,held),after:diff(before,after),read:reads[name],
      baselineReads:reads["baseline-"+name],pc:after.pc,mode:after.d011,bank:after.memBank,
    };
    results.push(response);
    console.log("Bruce Lee "+name+" A/B:",JSON.stringify(response));
    prior=after;
  }
  const visualChange = entry =>
    entry.after.screen+entry.after.bitmap+entry.after.colors > 0 ||
    entry.held.screen+entry.held.bitmap+entry.held.colors > 0 ||
    entry.after.screenBaseChanged || entry.held.screenBaseChanged;
  assert(visualChange(results[0]),"F3 does not change the Bruce Lee player-selection display");
  assert(visualChange(results[1]),"F5 does not change the Bruce Lee opponent-selection display");
  assert(visualChange(results[2]),"F7 does not start the original Bruce Lee game");
  for(const entry of results) {
    const amount=(d)=>d.screen+d.bitmap+d.colors;
    const fixed=Math.max(amount(entry.held),amount(entry.after));
    const baseline=Math.max(amount(entry.baselineHeld),amount(entry.baselineAfter));
    console.log("Bruce Lee "+entry.name+" matrix benefit:",JSON.stringify({fixed,baseline}));
    assert(fixed>baseline,
      entry.name+" has no stronger game response with reverse CIA scanning; this change is not a verified fix");
  }
});
