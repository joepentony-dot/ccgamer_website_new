#!/usr/bin/env node
import assert from "node:assert/strict";
import { C64Machine } from "../js/ccg-c64/core/machine.js";
import { readBundledOpenRoms } from "../js/ccg-c64/open-rom-bundle.js";

const roms=readBundledOpenRoms();
assert.equal(roms.kernal.length,8192);
assert.equal(roms.basic.length,8192);
assert.equal(roms.charRom.length,4096);
const machine=new C64Machine();
machine.loadROMs(roms);
for(let n=0;n<125;n++){machine.runFrame();if(n%25===24) {
  const r=machine.mem.ram;
  console.log("frame",n+1,"pc",machine.cpu.PC?.toString(16),"C6",r[0xc6],"CC",r[0xcc],"2C",r[0x2c]?.toString(16),"CUR",r[0xd3]);
}}
const r=machine.mem.ram;
const matrix=Array.from(r.subarray(0x400,0x400+80)).map(v=>String.fromCharCode(v<0x20?v+64:v)).join("");
console.log("first 80 screen codes:",Array.from(r.subarray(0x400,0x400+80)).join(","));
console.log("mapped:",matrix);
assert.equal(machine.ready,true);
const readyScreen = Array.from(r.subarray(0x0400, 0x0400+1000)).map(v=>v>=1&&v<=26 ? String.fromCharCode(v+64) : String.fromCharCode(v)).join("");
assert(readyScreen.includes("OPEN ROMS"), "An actual ROM executed and painted its startup screen");
assert(readyScreen.includes("READY"), "The emulated BASIC screen must reach READY");
console.log("Open ROM booted to genuine READY, keyboard buffer", r[0xc6], "BASIC pointer",r[0x2c].toString(16));
console.log("Open ROM real CPU boot smoke finished");

import fs from "node:fs";
import { parsePackedCatalog } from "../js/ccg-c64/game-catalog.js";

const catalogue=parsePackedCatalog(JSON.parse(fs.readFileSync("emulator/c64/media/blast/catalog.json","utf8")));
for(const entry of catalogue.entries.slice(0,4)){
  const pack=fs.readFileSync("emulator/c64/media/blast/"+entry.packFile);
  const prg=pack.subarray(entry.byteOffset,entry.byteOffset+entry.byteLength);
  const m=new C64Machine();m.loadROMs(roms);
  for(let i=0;i<80;i++)m.runFrame();
  const before=Array.from(m.mem.ram.subarray(0x400,0x7e8)).join(",");
  m.loadPRG(prg);
  // Diagnostic: this BASIC stub has SYS(2064); try sending SYS2064
  // directly instead of asking the replacement BASIC to parse RUN.
  if (entry.title === "10th Frame") m.injectSys(2064);
  else m.injectRun();
  for(let i=0;i<125;i++)m.runFrame();
  const after=Array.from(m.mem.ram.subarray(0x400,0x7e8)).join(",");
  console.log("PRG test",entry.title,"prg bytes",prg.length,"start",prg[0]|(prg[1]<<8),
    "screenChanged",before!==after,"C6",m.mem.ram[0xC6],
    "CPU",String(m.cpu.pc??m.cpu.PC??"?"),"head bytes",Array.from(prg.slice(0,24)));
  const screenRows = Array.from({length: 14}, (_, y) => {
    return Array.from(m.mem.ram.subarray(0x400+y*40,0x400+(y+1)*40))
      .map(v => v>=1&&v<=26?String.fromCharCode(v+64):v===32?" ":v===46?".":"_").join("");
  });
  console.log("AFTER LOAD "+entry.title+":", JSON.stringify(screenRows));
  if (entry.title === "10th Frame") {
    assert(!screenRows.some(row=>row.includes("SYNTAX ERROR")),
      "Direct SYS must not fall back to an Open ROM BASIC syntax error");
  }
  assert.equal(m.ready,true,"CPU must remain active after game load");
}
console.log("Open ROM representative PRG probes completed");
