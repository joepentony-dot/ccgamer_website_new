#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const start = app.indexOf("function basicReady() {");
const end = app.indexOf("// A fresh game must not inherit a previous disk", start);
assert.ok(start > 0 && end > start, "Automatic loader state machine must be present");
const source = app.slice(start, end);

function harness({ media = "disk", trueDrive = false } = {}) {
  let basic = true;
  let driveIdle = true;
  let frames = 0;
  let warpStarts = 0;
  let warpStops = 0;
  const machine = {
    mem: { ram: new Uint8Array(256) },
    bufferKeyboardText(value) { return value.length; },
    onLoadTrap: null,
    truedriveEnabled: trueDrive,
    drive1541: trueDrive ? { canIdleSkip: () => driveIdle } : null,
    datasette: { motorOn: false, playPressed: false, atEnd: false },
  };
  const context = vm.createContext({
    machine, running: true, paused: false, stageNote: { textContent: "" },
    autoStartSteps: null, autoStartTypeRest: "", autoStartSawBusy: false,
    autoStartBudget: 0, autoWarpFrameCount: 0, autoWarpPostRunStart: null,
    autoWarpLastActivity: 0, autoWarpObservedLoads: 0,
    autoWarpLoadEvents: 0, autoWarpTrackedMachine: null,
    autoWarpPreviousLoadTrap: null,
    automaticWarpActive: false, automaticWarpFramesRemaining: 0,
    warpLoadActive: false,
    AUTO_WARP_POST_RUN_MIN_FRAMES: 300,
    AUTO_WARP_POST_RUN_QUIET_FRAMES: 125,
    AUTO_WARP_POST_RUN_MAX_FRAMES: 12000,
    setWarpLoad(value) {
      context.warpLoadActive = value;
      if (value) warpStarts++;
      else warpStops++;
    },
  });
  vm.runInContext(
    source + "\nglobalThis.load = queueAutoStart; globalThis.advance = serviceAutoStart;" +
      "\nglobalThis.pending = () => !!autoStartSteps;",
    context,
  );
  function step(n = 4) {
    frames += n;
    vm.runInContext("autoWarpFrameCount += " + n, context);
    context.advance();
  }
  function startLoad() {
    context.load([
      { ready: true }, { type: 'LOAD"*",8,1\r' }, { loadDone: true },
      { type: "RUN\r" }, { postRun: media },
    ]);
    assert.equal(context.warpLoadActive, true);
    context.advance(); // READY
    context.advance(); // type LOAD
    basic = false;
    machine.mem.ram[0x2C] = 0;
    context.advance(); // observe loading
    machine.mem.ram[0x2C] = 0x08; // BASIC returns
    context.advance(); // loading done
    context.advance(); // type RUN
    context.advance(); // begin post-RUN observation
    assert.equal(context.pending(), true, "RUN must not complete automatic warp");
  }
  machine.mem.ram[0x2C] = 0x08;
  return {
    context, machine, startLoad, step,
    drives: { idle(value) { driveIdle = value; } },
    runs: () => frames, starts: () => warpStarts, stops: () => warpStops,
  };
}

test("After RUN, automatic warp observes six seconds before stopping", () => {
  const h = harness();
  h.startLoad();
  h.step(298);
  assert.equal(h.context.warpLoadActive, true, "typed RUN is not game-loaded");
  h.step(4);
  assert.equal(h.context.warpLoadActive, false);
  assert.equal(h.context.pending(), false);
  assert.equal(h.stops(), 1);
});

test("A second-stage KERNAL disk LOAD extends warp until disk access settles", () => {
  const h = harness();
  h.startLoad();
  h.step(244);
  h.machine.onLoadTrap(8);
  h.step(4);
  assert.equal(h.context.warpLoadActive, true);
  h.step(60);
  assert.equal(h.context.warpLoadActive, true, "a second load near the end must extend warp");
  h.step(65);
  assert.equal(h.context.warpLoadActive, false, "warp stops after quiet disk period");
  assert.equal(h.machine.onLoadTrap, null, "load-event hook must be cleaned up");
});

test("True 1541 active load keeps warp on beyond minimum; idle drive releases it", () => {
  const h = harness({ trueDrive: true });
  h.startLoad();
  h.drives.idle(false);
  h.step(550);
  assert.equal(h.context.warpLoadActive, true, "active 1541 motor/bus work must continue warp");
  h.drives.idle(true);
  h.step(60);
  assert.equal(h.context.warpLoadActive, true);
  h.step(65);
  assert.equal(h.context.warpLoadActive, false);
});

test("TAP transport activity extends warp while the tape plays", () => {
  const h = harness({ media: "tape" });
  h.startLoad();
  h.machine.datasette.motorOn = true;
  h.machine.datasette.playPressed = true;
  h.step(500);
  assert.equal(h.context.warpLoadActive, true);
  h.machine.datasette.motorOn = false;
  h.step(125);
  assert.equal(h.context.warpLoadActive, false);
});

test("Bounded safety limit ends warp for a loader which never settles", () => {
  const h = harness({ trueDrive: true });
  h.startLoad();
  h.drives.idle(false);
  h.step(11996);
  assert.equal(h.context.warpLoadActive, true);
  h.step(4);
  assert.equal(h.context.warpLoadActive, false);
});

test("Explicit manual override remains authoritative", () => {
  const h = harness();
  h.startLoad();
  h.context.automaticWarpActive = false;
  h.context.warpLoadActive = true; // manual user choice
  h.step(310);
  assert.equal(h.context.warpLoadActive, true);
});

test("Real disk and tape load queues include a post-RUN settle stage", () => {
  const diskStart = app.indexOf('if (["d64", "d71", "d81", "g64"].includes(type))');
  const tapeStart = app.indexOf('if (type === "tap")');
  assert.ok(diskStart >= 0 && tapeStart > diskStart);
  assert.match(app.slice(diskStart, tapeStart), /{ type: "RUN\\r" },\s*{ postRun: "disk" }/);
  assert.match(app.slice(tapeStart), /{ type: "RUN\\r" },\s*{ postRun: "tape" }/);
  assert.match(app, /if \(autoStartSteps\) autoWarpFrameCount\+\+/);
  assert.match(app, /if \(autoWarpTrackedMachine\) {\s*autoWarpTrackedMachine\.onLoadTrap = autoWarpPreviousLoadTrap/);
});
