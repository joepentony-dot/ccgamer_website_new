#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { ROMVault } from "../js/ccg-c64/rom-vault.js";
import { readBundledOpenRoms } from "../js/ccg-c64/open-rom-bundle.js";
const app=fs.readFileSync("js/ccg-c64/app.js","utf8");
const a=app.indexOf("async function queueMedia(media, { freshBoot = false } = {}) {");
const b=app.indexOf("async function queueMediaFile(",a);
assert(a>=0&&b>a);
assert(app.includes("render(startupRoms, { suppressStatus: startupRoms.allRequiredReady })"),
  "First-time boot must not show the old Omega placeholder before READY.");
const storage={getItem(){return null},setItem(){},removeItem(){}};
const vault=new ROMVault(storage);
vault.restore();
vault.useBundledOpenRoms(readBundledOpenRoms());
assert.equal(vault.snapshot().allRequiredReady,true);
const calls={setup:0,boot:0,mount:0,reset:0};
const ctx=vm.createContext({
  vault, pendingMedia:null, running:false, machine:null, initialPowerOn:Promise.resolve(),
  stageNote:{textContent:""}, SUPPORTED_MEDIA_TYPES:new Set(["prg","d64","crt"]),
  showSetup(){calls.setup++},
  mediaTypeFromName(){return "prg"},
  async powerOn(){calls.boot++;ctx.running=true;ctx.machine={}},
  async prepareFreshGameSession(){calls.reset++},
  async openMediaBytes(item){calls.mount++;ctx.last=item;return true},
});
vm.runInContext(app.slice(a,b)+"\nglobalThis.load = queueMedia;",ctx);
const data=new Uint8Array([1,8,0,0,0,0]);
assert.equal(await ctx.load({name:"1942.prg",type:"prg",bytes:data},{freshBoot:true}),true);
assert.equal(calls.setup,0,"Selecting LOAD must never open the ROM setup");
assert.equal(calls.boot,1,"LOAD must boot if the machine has not already started");
assert.equal(calls.mount,1,"LOAD must mount the selected game exactly once");
assert.equal(ctx.last.name,"1942.prg");
assert.equal(ctx.pendingMedia,null);
assert.equal(await ctx.load({name:"Paradroid.d64",type:"d64",bytes:data},{freshBoot:true}),true);
assert.equal(calls.setup,0);
assert.equal(calls.reset,1,"Loading a second game must cold-boot into its own session");
assert.equal(calls.mount,2);
console.log("PASS: first visit starts with bundled firmware and LOAD mounts the game without opening ROM setup.");
