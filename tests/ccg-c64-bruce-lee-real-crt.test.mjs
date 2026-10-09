import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { C64Machine } from "../js/ccg-c64/core/machine.js";
import { KEY_MAP } from "../js/ccg-c64/core/cia.js";

const firmware = {
  kernal: "emulator/c64/firmware/kernal-901227-03.bin",
  basic: "emulator/c64/firmware/basic-901226-01.bin",
  charRom: "emulator/c64/firmware/chargen-901225-01.bin",
};
const roms = Object.fromEntries(Object.entries(firmware).map(([name,path]) =>
  [name, new Uint8Array(fs.readFileSync(path))]));
const cartFile = new Uint8Array(fs.readFileSync("emulator/c64/media/bruce-lee-trilogy.crt"));
const formatChar = (value) => {
  const x=value & 0x7f;
  if (x === 32 || x===0x60) return " ";
  if (x>=1 && x<=26) return String.fromCharCode(x+64);
  if (x>=48 && x<=57) return String.fromCharCode(x);
  return x===46 ? "." : " ";
};
function screen(machine) {
  const base = (machine.cia2.vicBank +
    ((machine.vic2.regs[0x18] >> 4) & 15) * 1024) & 0xffff;
  const bytes = Array.from({length:1000}, (_,i)=>machine.mem.ram[(base+i)&0xffff]);
  const rows = Array.from({length:25},(_,row)=>
    bytes.slice(row*40,row*40+40).map(formatChar).join(""));
  return {base,bytes,rows,text:rows.join(" ")};
}
function run(machine,frames) {
  for(let n=0;n<frames;n++) assert(machine.runFrame(),"Emulator must continue running");
}
function pressKey(machine, key, frames=25) {
  const coords=KEY_MAP[key];
  assert(coords,"Missing matrix binding for "+key);
  machine.cia1.setKey(coords[0],coords[1],true);
  run(machine,frames);
  machine.cia1.setKey(coords[0],coords[1],false);
}
function boot() {
  const machine=new C64Machine();
  machine.loadROMs(roms);
  const attached=machine.loadCartridge(cartFile);
  assert.equal(attached.hwType,19);
  return machine;
}
const menuText = s=>s.rows.slice(2,20).join(" ").replace(/ {2,}/g," ");

test("select Bruce Lee 1984 from real Magic Desk trilogy, then exercise game F-keys",()=>{
  const attempts=[
    {label:"port2 FIRE",joy:2},
    {label:"port1 FIRE",joy:1},
    {label:"RETURN",key:"Enter"},
    {label:"SPACE",key:"Space"},
    {label:"1",key:"Digit1"},
    {label:"UP+port2 FIRE",joy:2,up:true},
  ];
  let selected=null;
  for(const a of attempts) {
    const machine=boot();
    run(machine,160);
    const intro=screen(machine);
    assert(/1984/.test(intro.text),"The hosted cartridge must boot to the 1984/2015/2019 game-selection menu");
    if(a.key) pressKey(machine,a.key,20);
    else {
      if(a.joy===1) machine.joyPort1=a.up?0xee:0xef;
      else machine.joyPort2=a.up?0xee:0xef;
      run(machine,25);
      machine.joyPort1=0xff;machine.joyPort2=0xff;
    }
    let found=false;
    for(let f=0;f<260;f+=20) {
      run(machine,20);
      const s=screen(machine);
      if(s.text.includes("BRUCE") && s.text.includes("LEE") &&
          s.rows.some(row=>row.includes("PLAYER") || row.includes("PRESS"))) {
        found=true;
        break;
      }
    }
    const after=screen(machine);
    console.log("Trilogy selection "+a.label+": "+JSON.stringify({
      gameMenuFound:found,bank:machine.mem.cartridge?.bank,
      screenBase:after.base,menuText:menuText(after),
      firstRows:after.rows.slice(2,20)
    }));
    if (found) { selected={machine,via:a.label};break; }
  }
  assert(selected,"Couldn't reach Bruce Lee 1984 from the hosted Trilogy CRT. Don't claim key fix.");
  const machine=selected.machine;
  const readCounts={};
  let active=null;
  const origRead=machine.cia1.read.bind(machine.cia1);
  machine.cia1.read=(reg)=>{
    if(active && ((reg&15)===0 || (reg&15)===1)) {
      const r=readCounts[active]||={portA:0,portB:0,ddrB:[],samples:[]};
      if((reg&15)===0)r.portA++;else r.portB++;
      if(r.samples.length<10)r.samples.push({
        port:reg&15,ddrA:machine.cia1.portADir,ddrB:machine.cia1.portBDir,
        latchA:machine.cia1.portA,latchB:machine.cia1.portB
      });
    }
    return origRead(reg);
  };
  console.log("Bruce Lee title before keys:",JSON.stringify({
    chosenVia:selected.via,rows:screen(machine).rows.slice(5,19)}));
  const outputs=[];
  let last=screen(machine);
  for (const key of ["F3","F5","F7"]) {
    active=key;
    pressKey(machine,key,45);
    let after=screen(machine);
    const duringChanges=last.bytes.filter((b,i)=>b!==after.bytes[i]).length;
    run(machine,20);
    after=screen(machine);
    active=null;
    const afterChanges=last.bytes.filter((b,i)=>b!==after.bytes[i]).length;
    outputs.push({key,changes:afterChanges,duringChanges,reads:readCounts[key],
      rows:after.rows.slice(5,19)});
    console.log("Bruce Lee "+key+" observed:",JSON.stringify(outputs.at(-1)));
    last=after;
  }
  assert(readCounts.F3?.portA + readCounts.F3?.portB > 0,
    "The game must scan the CIA while F3 is held");
  assert(outputs[0].changes>0 || outputs[0].duringChanges>0,
    "F3 did not change player selection in Bruce Lee");
  assert(outputs[1].changes>0 || outputs[1].duringChanges>0,
    "F5 did not change opponent selection in Bruce Lee");
  assert(outputs[2].changes>0 || outputs[2].duringChanges>0,
    "F7 did not start Bruce Lee gameplay");
});
