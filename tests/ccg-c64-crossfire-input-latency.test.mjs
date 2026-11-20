// Crossfire input latency regression: cap main-thread PAL catch-up work only
// while the verified Arena preview is mounted. Other C64 games are unaffected.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const app = readFileSync(new URL("../js/ccg-c64/app.js", import.meta.url), "utf8");
const start = app.indexOf("function frameLoop(now) {");
const end = app.indexOf("function powerOff()", start);
assert(start >= 0 && end > start, "C64 frame loop must exist");
const frameLoop = app.slice(start, end) + "\nglobalThis.runTick = frameLoop;";

function runStallWithArena(arenaMounted) {
  let runFrames = 0;
  let observerFrames = 0;
  let blits = 0;
  let animationCallbacks = 0;
  const ctx = vm.createContext({
    machine: { runFrame() { runFrames++; } },
    activeArenaPreview: arenaMounted ? { mounted: true } : null,
    running: true, paused: false,
    warpLoadActive: false,
    lastFrameTime: 1000, frameAccumulator: 0,
    PAL_FRAME_MS: 1000 / 50.125,
    pollGamepad() {},
    observeArenaPreviewFrame() { observerFrames++; },
    serviceAutoStart() {},
    blitMachine() { blits++; },
    autoStartSteps: null,
    requestAnimationFrame() { animationCallbacks++; return 1; },
    frameHandle: 0, speedSampleTime: 0, speedSampleFrames: 0,
    emulatorSpeedStatus: { textContent: "", title: "" },
  });
  vm.runInContext(frameLoop, ctx);
  ctx.runTick(1250);
  return { runFrames, observerFrames, blits, animationCallbacks, debt: ctx.frameAccumulator };
}

test("Crossfire Arena yields to browser input after at most two PAL frames", () => {
  const result = runStallWithArena(true);
  assert.equal(result.runFrames, 2, "Do not stall input with a long 250ms catch-up burst");
  assert.equal(result.observerFrames, 2, "Arena still observes every executed PAL frame");
  assert.equal(result.blits, 1, "Present the final executed emulated frame");
  assert.equal(result.animationCallbacks, 1, "Continue regular RAF scheduling");
  assert(result.debt >= 0 && result.debt < 1000 / 50.125,
    "Discard excess catch-up debt without losing fractional PAL timing");
});

test("Other C64 titles retain their existing PAL catch-up policy", () => {
  const result = runStallWithArena(false);
  assert(result.runFrames >= 12, "Ordinary PAL catch-up is unchanged");
  assert.equal(result.runFrames, result.observerFrames);
  assert.equal(result.animationCallbacks, 1);
});
