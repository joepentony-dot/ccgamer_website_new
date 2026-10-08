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
console.log("Open ROM real CPU boot smoke finished");
