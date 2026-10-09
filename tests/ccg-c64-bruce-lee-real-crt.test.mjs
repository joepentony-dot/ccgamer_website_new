import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { C64Machine } from "../js/ccg-c64/core/machine.js";
import { KEY_MAP } from "../js/ccg-c64/core/cia.js";

// Load the precise, user-approved Magic Desk cartridge that is served
// to website visitors, NOT the withdrawn packed Bruce Lee PRG.
const firmware = (key) => new Uint8Array(fs.readFileSync(
  { kernal: "emulator/c64/firmware/kernal-901227-03.bin",
    basic: "emulator/c64/firmware/basic-901226-01.bin",
    charRom: "emulator/c64/firmware/chargen-901225-01.bin" }[key]));
const cartridge = new Uint8Array(fs.readFileSync("emulator/c64/media/bruce-lee-trilogy.crt"));

const c64Char = (value) => {
  const v = value & 0x7f;
  if (v === 32 || v === 0x60) return " ";
  if (v >= 1 && v <= 26) return String.fromCharCode(64 + v);
  if (v >= 48 && v <= 57) return String.fromCharCode(v);
  return v === 46 ? "." : " ";
};
const screen = machine => {
  const bank = machine.cia2.vicBank;
  const base = (bank + ((machine.vic2.regs[0x18] >>> 4) & 15) * 1024) & 0xffff;
  const bytes = Array.from({ length: 1000 }, (_, i) => machine.mem.ram[(base + i) & 0xffff]);
  return {
    base, bytes,
    rows: Array.from({length:25},(_,i)=>
      bytes.slice(i*40,(i+1)*40).map(c64Char).join("")
    ),
  };
};
const formatScreen = state =>
  state.rows.map((row,i)=>String(i).padStart(2,"0")+": "+row).join("\n");

test("real Bruce Lee Trilogy cartridge receives function keys and changes game state", () => {
  const machine = new C64Machine();
  machine.loadROMs({
    kernal: firmware("kernal"), basic: firmware("basic"), charRom: firmware("charRom")
  });
  const cart = machine.loadCartridge(cartridge);
  assert.equal(cart.hwType, 19, "Bruce Lee Trilogy should load as Magic Desk hardware");
  assert.equal(cart.mode, "magicdesk");

  let ciaReads = {A:0,B:0}, readsByKey={};
  let activeKey = null;
  const originalCIARead = machine.cia1.read.bind(machine.cia1);
  machine.cia1.read = reg => {
    if (activeKey) {
      const r = reg & 15;
      if (r === 0 || r === 1) {
        if (r===0) ciaReads.A++; else ciaReads.B++;
        const x = readsByKey[activeKey] ||= {A:0,B:0,samples:[]};
        if (r===0) x.A++; else x.B++;
        if (x.samples.length < 8) x.samples.push({
          reg:r,ddrA:machine.cia1.portADir,ddrB:machine.cia1.portBDir,
          latchA:machine.cia1.portA,latchB:machine.cia1.portB
        });
      }
    }
    return originalCIARead(reg);
  };
  let titleSeen = false, titleFrame=-1;
  for (let frame=0;frame<350;frame++) {
    assert(machine.runFrame(), "C64 PAL emulation should advance");
    if (frame % 5 !== 0) continue;
    const s = screen(machine);
    if (/BRUCE.*LEE/.test(s.rows.join(" "))) {
      titleSeen = true;titleFrame=frame;break;
    }
  }
  const initial = screen(machine);
  console.log("Bruce Lee CRT title:",JSON.stringify({titleSeen,titleFrame,screenBase:initial.base,
    bank:machine.mem.cartridge?.bank,ciaA:machine.cia1.portA,ciaB:machine.cia1.portB,
    ddrA:machine.cia1.portADir,ddrB:machine.cia1.portBDir}));
  console.log("Initial screen:\n"+formatScreen(initial));
  assert(titleSeen, "The actual hosted Bruce Lee cartridge must reach its in-game title/menu screen");

  let previous = initial;
  const results = [];
  for (const name of ["F3","F5","F7"]) {
    const [col,row] = KEY_MAP[name];
    activeKey=name;
    machine.cia1.setKey(col,row,true);
    for(let frame=0;frame<30;frame++) assert(machine.runFrame());
    const during = screen(machine);
    machine.cia1.setKey(col,row,false);
    for(let frame=0;frame<10;frame++) assert(machine.runFrame());
    const after = screen(machine);
    activeKey=null;
    const changed = previous.bytes.reduce((n,v,i)=>n+(v!==after.bytes[i]),0);
    const duringChanged = previous.bytes.reduce((n,v,i)=>n+(v!==during.bytes[i]),0);
    const observation={key:name,changed,duringChanged,reads:readsByKey[name],
      rows:after.rows.slice(5,19)};
    results.push(observation);
    console.log("Bruce Lee "+name+": "+JSON.stringify(observation));
    previous=after;
  }
  console.log("Bruce Lee actual-cartridge results:",JSON.stringify(results.map(x=>({
    key:x.key,changed:x.changed,duringChanged:x.duringChanged,portA:x.reads?.A,portB:x.reads?.B
  }))));
  assert(results.some(x=>x.changed>0 || x.duringChanged>0),
    "Bruce Lee F3/F5/F7 do not change the displayed game state; do not merge");
});
