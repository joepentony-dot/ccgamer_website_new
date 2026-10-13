#!/usr/bin/env node
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");

function buildController() {
  const start = app.indexOf("function noteAutomaticWarpLoadActivity()");
  const end = app.indexOf("// A fresh game must not inherit", start);
  assert(start >= 0 && end > start, "The post-RUN load controller must exist");
  const ctx = {
    automaticWarpActive: false, automaticWarpFramesRemaining: 0,
    automaticWarpPostRunFrames: -1, automaticWarpIdleFrames: 0,
    automaticWarpMediaType: "d64", warpLoadActive: false,
    autoStartSteps: null, autoStartTypeRest: "", autoStartSawBusy: false,
    autoStartBudget: 0, stageNote: { textContent: "" },
    machine: { bufferKeyboardText(text) { return text.length; } },
    running: true, paused: false, basicReady: () => true,
    setWarpLoad(v) { ctx.warpLoadActive = v; },
  };
  vm.runInNewContext(app.slice(start, end) +
    "\nglobalThis.begin=beginAutomaticWarp;globalThis.settle=settleAutomaticWarpAfterRun;" +
    "globalThis.tick=tickAutomaticWarpAfterRun;globalThis.activity=noteAutomaticWarpLoadActivity;" +
    "globalThis.queue=queueAutoStart;globalThis.service=serviceAutoStart;" +
    "globalThis.connect=connectAutoWarpLoadActivity;globalThis.finish=finishAutomaticWarp;", ctx);
  return ctx;
}

test("Disk warp does NOT finish the moment RUN is entered or after four emulated seconds", () => {
  const c = buildController();
  c.queue([{ ready: true }, { type: 'LOAD"*",8,1\\r' },
    { loadDone: true }, { type: "RUN\\r" }], "d64");
  c.connect(c.machine);
  c.service(); // READY
  c.service(); // type LOAD
  // The fast drive loads between polling ticks. The hook must acknowledge it.
  c.machine.onLoadTrap(8);
  assert.equal(c.autoStartSawBusy, true);
  c.service(); // load finished, BASIC READY
  c.service(); // RUN queued, then post-run guard
  assert.equal(c.autoStartSteps, null);
  assert.equal(c.automaticWarpPostRunFrames, 0);
  for (let i = 0; i < 749; i++) c.tick();
  assert.equal(c.warpLoadActive, true, "Musketeer must not fall out of warp after 4 seconds");
  c.tick();
  assert.equal(c.warpLoadActive, false, "Idle disk should eventually return to 1× and audible SID");
});

test("A subsequent C64 disk load extends warp until an idle settling window", () => {
  const c = buildController();
  c.begin();
  c.automaticWarpMediaType = "d64";
  c.settle();
  for (let i = 0; i < 730; i++) c.tick();
  c.activity(); // A game loader requests another file.
  for (let i = 0; i < 250; i++) c.tick();
  assert.equal(c.warpLoadActive, true, "New load activity must prevent premature warp exit");
  for (let i = 0; i < 150; i++) c.tick();
  assert.equal(c.warpLoadActive, false, "Warp ends after activity is quiet for 8 seconds");
});

test("Warp guard has a finite fallback, direct PRG settles sooner, and manual stop stays off", () => {
  const c = buildController();
  c.begin();
  c.automaticWarpMediaType = "prg";
  c.settle();
  for (let i = 0; i < 149; i++) c.tick();
  assert.equal(c.warpLoadActive, true);
  c.tick();
  assert.equal(c.warpLoadActive, false);
  c.begin();
  c.automaticWarpMediaType = "d64";
  c.settle();
  for (let i = 0; i < 6000; i++) {
    c.activity(); // Malfunctioning loader never goes quiet.
    c.tick();
  }
  assert.equal(c.warpLoadActive, false, "Warp must never spin forever");
  assert.match(app, /automaticWarpPostRunFrames = -1;[\s\S]*?setWarpLoad\(!warpLoadActive\);/);
});

test("SID UI indicates suspended sound and listens for recovery gestures", () => {
  assert.match(app, /TAP TO ENABLE SOUND/);
  assert.match(app, /addEventListener\("pointerdown", unlockSidAudioFromGesture/);
  assert.match(app, /addEventListener\("keydown", \(event\) => \{/);
  assert.match(app, /connectAutoWarpLoadActivity\(machine\)/);
  assert.match(app, /connectAutoWarpLoadActivity\(fresh\)/);
});

test("Musketeer D64 is the intended uploaded game and is not a missing file", () => {
  const manifest = JSON.parse(fs.readFileSync("emulator/c64/library.json", "utf8"));
  const item = manifest.entries.find(e => e.id === "musketeer");
  assert(item && item.approved && item.format === "d64");
  assert.equal(item.bytes, 174848);
  const disk = fs.readFileSync("emulator/c64/media/musketeer.d64");
  assert.equal(disk.length, item.bytes);
});
