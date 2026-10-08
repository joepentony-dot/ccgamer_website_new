#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { HOSTED_C64_ROMS, HOSTED_ROM_ROOT, fetchVerifiedHostedROMs, installHostedROMs } from "../js/ccg-c64/hosted-roms.js";
import { ROMVault } from "../js/ccg-c64/rom-vault.js";
import { C64Machine } from "../js/ccg-c64/core/machine.js";

const files = {};
for (const { key, file, bytes, sha256 } of HOSTED_C64_ROMS) {
  const buffer = fs.readFileSync("emulator/c64/firmware/" + file);
  assert.equal(buffer.length, bytes, key + " length");
  assert.equal(createHash("sha256").update(buffer).digest("hex"), sha256, key + " SHA-256");
  files[key] = buffer;
}

const digestImpl = async bytes => createHash("sha256").update(bytes).digest();
const fetchImpl = async (url, options) => {
  assert(url.startsWith(HOSTED_ROM_ROOT), "ROM must come from CCG same-origin path");
  assert.equal(options.credentials, "same-origin");
  const spec = HOSTED_C64_ROMS.find(entry => HOSTED_ROM_ROOT + entry.file === url);
  assert(spec, "Only verified original C64 ROM filenames may be fetched");
  return { ok: true, arrayBuffer: async () => files[spec.key] };
};

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

test("same three original verified firmware files load on desktop and mobile", async () => {
  const desktop = new ROMVault(new MemoryStorage());
  const mobile = new ROMVault(new MemoryStorage());
  for (const vault of [desktop, mobile]) {
    const bytes = await fetchVerifiedHostedROMs({ fetchImpl, digestImpl });
    const snapshot = installHostedROMs(vault, bytes);
    assert.equal(snapshot.requiredReady, 3);
    assert(snapshot.allRequiredReady);
  }
  for (const { key } of HOSTED_C64_ROMS) {
    assert.deepEqual(mobile.getBytes(key), desktop.getBytes(key), key + " must be identical");
  }
});

test("a truncated or substituted ROM can never replace the user's existing bank", async () => {
  const vault = new ROMVault(new MemoryStorage());
  const verified = await fetchVerifiedHostedROMs({ fetchImpl, digestImpl });
  installHostedROMs(vault, verified);
  const existing = vault.getBytes("kernal").slice();
  await assert.rejects(fetchVerifiedHostedROMs({
    fetchImpl: async url => {
      const spec = HOSTED_C64_ROMS.find(entry => url.endsWith(entry.file));
      const bytes = files[spec.key].slice();
      if (spec.key === "basic") bytes[0] ^= 0xff;
      return { ok: true, arrayBuffer: async () => bytes };
    }, digestImpl,
  }), /SHA-256/);
  assert.deepEqual(vault.getBytes("kernal"), existing);
  await assert.rejects(fetchVerifiedHostedROMs({
    fetchImpl: async url => {
      const spec = HOSTED_C64_ROMS.find(entry => url.endsWith(entry.file));
      return { ok: true, arrayBuffer: async () => spec.key === "kernal" ? files.kernal.slice(0,100) : files[spec.key] };
    }, digestImpl,
  }), /size/);
});

test("real Commodore BASIC V2 reaches READY screen through the machine's CPU", () => {
  const machine = new C64Machine();
  machine.loadROMs({
    kernal: new Uint8Array(files.kernal),
    basic: new Uint8Array(files.basic),
    charRom: new Uint8Array(files.charRom),
  });
  assert(machine.ready, "Real machine must initialise");
  const visitedPages = new Map(), visitedPCs = new Map();
  let basicInstructions = 0, pcFC = 0, pcFD = 0, pcEA = 0, pcE4 = 0;
  let firstTapeWait = null;
  const eaInstr = new Map(), eaClrRows = new Map(), sampleY = [];
  let firstBasicEntry = null, firstEaLoop = null, firstScreenWrite = null;
  const sampledCycles = [];
  const origClock = machine.cpu.clock;
  machine.cpu.clock = function () {
    if (this.atInstructionBoundary()) {
      const pc = this.pc;
      if (pc === 0xe4d8 && !firstTapeWait) {
        firstTapeWait = {
          frame: Math.floor((machine.busTraceFrame || 0)),
          sp: this.sp, a: this.a, x: this.x, y: this.y,
          topStack: Array.from(machine.mem.ram.slice(0x0100 + this.sp + 1, 0x0100 + this.sp + 20))
            .map(value=>value.toString(16).padStart(2,"0")).join(" "),
          jiffyAtStart: Array.from(machine.mem.ram.slice(0xa0,0xa3)),
          lastKey: machine.mem.ram[0x91],
          keyboardBuffer: machine.mem.ram[0xc6],
          vicControl: machine.vic2?.regs?.[0x11]
        };
      }
      const page = pc >>> 8;
      if (pc>=0xe9f0 && pc<=0xea45) {
        eaInstr.set(pc,(eaInstr.get(pc)||0)+1);
        if(pc===0xea07) {
          if (!firstEaLoop) firstEaLoop={frame:frames,sp:this.sp,a:this.a,x:this.x,y:this.y,
            stack:Array.from(machine.mem.ram.slice(0x0100+this.sp+1,0x0100+this.sp+10)),
            zp:Array.from(machine.mem.ram.slice(0xd1,0xd4)),ddr:machine.mem.cpuDDR};
          eaClrRows.set(this.x,(eaClrRows.get(this.x)||0)+1);
          if(sampleY.length<25) sampleY.push({frame:frames,x:this.x,y:this.y,sp:this.sp});
        }
      }
      if(!firstBasicEntry && pc>=0xa000 && pc<=0xbfff)
        firstBasicEntry={frame:frames,pc:pc.toString(16),a:this.a,x:this.x,y:this.y,sp:this.sp};
      if(!firstScreenWrite && machine.mem.ram[0x0400] !== 0x20 && frames>130)
        firstScreenWrite={frame:frames,code:machine.mem.ram[0x400],pc:pc.toString(16)};
      visitedPages.set(page,(visitedPages.get(page)||0)+1);
      if (pc>=0xA000 && pc<0xC000) basicInstructions++;
      if (page===0xfc) pcFC++;
      if (page===0xfd) pcFD++;
      if (page===0xea) pcEA++;
      if (page===0xe4) pcE4++;
      if (pc>=0xe4c0 && pc<0xe500) visitedPCs.set(pc,(visitedPCs.get(pc)||0)+1);
    }
    return origClock.call(this);
  };
  const ready = [18,5,1,4,25,46]; // C64 screen codes for READY.
  let frames=0, found=false;
  for (;frames<800;frames++) {
    assert(machine.runFrame(), "Emulation must advance PAL frames");
    const mem=machine.mem.ram;
    for(let i=0x0400;i<0x07fa;i++) {
      let matches=true;
      for(let j=0;j<ready.length;j++) if ((mem[i+j]&0x7f)!==ready[j]) {matches=false;break;}
      if(matches) {found=true;break;}
    }
    if(frames % 100 === 0) console.log("BASIC boot frame", frames, "PC", machine.cpu.pc?.toString(16), "CPU $01", machine.mem.cpuPort?.toString(16), "top", machine.mem.ram[0x0283]?.toString(16));
    if(found) break;
  }
  if (!found) {
    const ram = machine.mem.ram;
    console.log("BASIC execution statistics", JSON.stringify({
      basicInstructions,pcFC,pcFD,pcEA,pcE4,firstTapeWait,firstBasicEntry,firstEaLoop,firstScreenWrite,
      eaInstr:[...eaInstr.entries()].sort((a,b)=>b[1]-a[1]).slice(0,45).map(([pc,count])=>[pc.toString(16),count]),
      eaClrRows:[...eaClrRows.entries()].sort((a,b)=>a[0]-b[0]),
      sampleY,
      currentJiffy:Array.from(machine.mem.ram.slice(0xa0,0xa3)),
      lastKey:machine.mem.ram[0x91],
      keyboardBuffer:machine.mem.ram[0xc6],
      currentCPU:{a:machine.cpu.a,x:machine.cpu.x,y:machine.cpu.y,sp:machine.cpu.sp},
      screenBaseBank:machine.mem.ram[0x288],
      topPages:[...visitedPages.entries()].sort((a,b)=>b[1]-a[1]).slice(0,16).map(([page,count])=>[page.toString(16),count]),
      e4PCs:[...visitedPCs.entries()].sort((a,b)=>b[1]-a[1]).slice(0,16).map(([pc,count])=>[pc.toString(16),count]),
      irqVector:[machine.mem.ram[0x314],machine.mem.ram[0x315]],
      basicPointers:[...machine.mem.ram.slice(0x2b,0x34)],
      screenPointer:machine.mem.ram[0x288],
      ddr:machine.mem.cpuDDR,
    }));
    console.log("BASIC cold boot diagnostic: CPU PC", machine.cpu.pc?.toString(16),
      "CPU jammed", machine.cpu.jammed ?? machine.cpu.jam,
      "Reset vector", Array.from(files.kernal.slice(-4)).map(x => x.toString(16)));
    for (let row=0;row<12;row++) {
      const bytes=Array.from(ram.subarray(0x0400+row*40,0x0400+(row+1)*40));
      const decoded=bytes.map(value=>{const code=value&0x7f;return code===32?" ":code>=1&&code<=26?String.fromCharCode(code+64):code===46?".":`[${code.toString(16)}]`;}).join("");
      console.log("SCREEN",row,decoded,"hex",bytes.slice(0,12).map(b=>b.toString(16).padStart(2,"0")).join(" "));
    }
  }
  assert(found,"Original Commodore BASIC must render READY. into screen memory within 800 frames");
  console.log("Original BASIC READY reached in", frames+1,"PAL frames.");
});

test("CCG boots original firmware automatically before a selected game starts", () => {
  const app=fs.readFileSync("js/ccg-c64/app.js","utf8");
  const html=fs.readFileSync("emulator/c64/index.html","utf8");
  assert(app.includes("hostedFirmwareReadyPromise = bootWithHostedFirmware();"));
  assert(app.includes("await hostedFirmwareReadyPromise;"));
  assert(app.includes("fetchVerifiedHostedROMs()"));
  assert(app.includes("installHostedROMs(vault, files)"));
  assert(app.includes("await powerOn()"));
  assert(!app.includes("open-rom-bundle"));
  assert(html.includes("provided automatically by this website"));
});
