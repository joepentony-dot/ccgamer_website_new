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


// The first release only prevented long PAL catch-up bursts. Browser key
// events were still double-routed through both the C64 CIA matrix and the
// virtual joystick. Exercise actual production functions on the same key edge.
const joystickStart = app.indexOf("function isCrossfireKeyboardJoystickActive()");
const joystickEnd = app.indexOf("function swapJoystickPort()", joystickStart);
const handlerStart = app.indexOf("const heldMatrixKeys = new Map();");
const handlerEnd = app.indexOf("function pollGamepad()", handlerStart);
assert(joystickStart >= 0 && joystickEnd > joystickStart &&
  handlerStart >= 0 && handlerEnd > handlerStart, "Production joystick and key handlers must exist");
const ciaCode = readFileSync(new URL("../js/ccg-c64/core/cia.js", import.meta.url), "utf8");
const { KEY_MAP, CHAR_MAP } = await import("data:text/javascript," + encodeURIComponent(ciaCode));

function keyboardHarness(arena = true) {
  const matrix = new Set();
  const element = { closest() { return null; } };
  const stageStatus = { textContent: "KEYBOARD JOYSTICK // ACTIVE" };
  const machine = {
    joyPort1: 0xff, joyPort2: 0xff,
    cia1: {
      setKey(col,row,pressed) {
        const id = col + ":" + row;
        if (pressed) matrix.add(id);
        else matrix.delete(id);
      },
      isKeyDown(col,row) { return matrix.has(col + ":" + row); },
    },
    _updateLightpen() {},
    setRestoreNmiLine() {},
  };
  const context = vm.createContext({
    KEY_MAP, CHAR_MAP,
    machine, running:true, paused:false,
    screen:element, document:{activeElement:element},
    setup:{hidden:true}, inputStatus:stageStatus,
    joystickPort:2, keyboardJoystickEnabled:true,
    keyboardJoystickKeys:new Set(),
    KEYBOARD_JOYSTICK_MASKS:{
      ArrowUp:1, KeyW:1, ArrowDown:2, KeyS:2,
      ArrowLeft:4, KeyA:4, ArrowRight:8, KeyD:8,
      Space:16, ControlLeft:16, ControlRight:16,
    },
    activeArenaPreview:arena ? {cancelOneClick(){},armFromUserF1(){}} : null,
    gamepadJoyByte:0xff, touchJoyByte:0xff,
    mobileVirtualHeld:new Map(), touchHeldButtons:new Map(),
    pollGamepad() {},
  });
  vm.runInContext(app.slice(joystickStart, joystickEnd) + "\n" +
    app.slice(handlerStart, handlerEnd) +
    "\nglobalThis.press = handleC64Key;", context);
  function edge(code,key,pressed,repeat=false) {
    const event = {
      code,key,target:element,repeat,
      shiftKey:false,ctrlKey:false,altKey:false,metaKey:false,
      getModifierState(){return false;},
      defaultPrevented:false,
      preventDefault(){this.defaultPrevented=true;},
    };
    context.press(event,pressed);
    return event;
  }
  return {context,machine,matrix,stageStatus,
    down:(code,key=code,repeat=false)=>edge(code,key,true,repeat),
    up:(code,key=code)=>edge(code,key,false)};
}

test("Crossfire joystick directions use latest physical key edge without matrix duplication", () => {
  const h = keyboardHarness();
  assert(h.down("ArrowLeft").defaultPrevented);
  assert.equal(h.machine.joyPort2,0xfb,"Left must reach joystick port 2 immediately");
  assert.equal(h.matrix.size,0,"ArrowLeft must not press any C64 matrix keys");
  assert.equal(h.stageStatus.textContent,"KEYBOARD JOYSTICK // ACTIVE",
    "Joystick movement must not update the DOM key-status text per edge");

  h.down("ArrowUp");
  assert.equal(h.machine.joyPort2,0xfe,
    "Fresh Up must override still-held Left, not send an ambiguous Up+Left diagonal");
  assert.equal(h.matrix.size,0,"ArrowUp must not synthesize C64 SHIFT+cursor");
  h.down("ArrowLeft","ArrowLeft",true);
  assert.equal(h.machine.joyPort2,0xfe,
    "Keyboard autorepeat cannot promote older Left over newer Up");
  h.up("ArrowLeft");
  assert.equal(h.machine.joyPort2,0xfe,"Releasing older Left must preserve Up");

  h.down("Space"," ");
  assert.equal(h.machine.joyPort2,0xee,"Fire must combine with Up");
  assert.equal(h.matrix.size,0,
    "C64 SPACE (native Crossfire stop) must not leak while acting as joystick FIRE");
  h.down("KeyS","s");
  assert.equal(h.machine.joyPort2,0xed,"New Down must override Up while fire is held");
  assert.equal(h.matrix.size,0,
    "S (native Crossfire fire-left) must not leak while acting as joystick DOWN");
  h.up("KeyS","s");
  assert.equal(h.machine.joyPort2,0xee,"Releasing Down restores held Up plus FIRE");
  h.up("Space"," ");
  assert.equal(h.machine.joyPort2,0xfe,"Releasing FIRE must retain Up");
  h.up("ArrowUp");
  assert.equal(h.machine.joyPort2,0xff,"Releasing last key returns to centred joystick");
  assert.equal(h.matrix.size,0,"No native CIA matrix key may remain stuck");
  assert.equal(h.stageStatus.textContent,"KEYBOARD JOYSTICK // ACTIVE");
});

test("Crossfire preserves independent gamepad input and native F1 controls", () => {
  const h = keyboardHarness();
  h.context.gamepadJoyByte=0xf7; // Physical gamepad RIGHT stays held.
  h.down("ArrowUp");
  assert.equal(h.machine.joyPort2,0xf6,
    "Keyboard UP must not erase an independently held gamepad RIGHT");
  h.up("ArrowUp");
  assert.equal(h.machine.joyPort2,0xf7);
  h.context.gamepadJoyByte=0xff;
  h.down("F1","F1");
  assert.equal(h.matrix.size,1,"F1 must still be a genuine C64 function key");
  h.up("F1","F1");
  assert.equal(h.matrix.size,0,"F1 must release cleanly");
});

test("Crossfire native-key mode and all other games retain the original CIA keyboard", () => {
  const h = keyboardHarness();
  h.context.keyboardJoystickEnabled=false;
  h.down("KeyJ","j");
  assert.equal(h.matrix.size,1,"Native Crossfire J movement must work with KEYBOARD JOY off");
  h.up("KeyJ","j");
  assert.equal(h.matrix.size,0);
  h.down("KeyS","s");
  assert.equal(h.matrix.size,1,"Native Crossfire S fire-left must work with KEYBOARD JOY off");
  h.up("KeyS","s");
  assert.equal(h.matrix.size,0);
  h.context.keyboardJoystickEnabled=true;
  h.context.activeArenaPreview=null; // Another C64 title.
  h.down("KeyS","s");
  assert.equal(h.machine.joyPort2,0xfd,"Other games retain keyboard joystick DOWN");
  assert.equal(h.matrix.size,1,"Other games retain existing simultaneous CIA matrix routing");
  h.up("KeyS","s");
  assert.equal(h.machine.joyPort2,0xff);
  assert.equal(h.matrix.size,0);
});
