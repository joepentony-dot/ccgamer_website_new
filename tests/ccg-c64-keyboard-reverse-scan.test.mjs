import assert from "node:assert/strict";
import test from "node:test";
import { CIA, KEY_MAP, CHAR_MAP } from "../js/ccg-c64/core/cia.js";

const keys = ["F1", "F3", "F5", "F7"];

test("normal C64 Port A -> Port B scan still recognises every function key", () => {
  const cia = new CIA(1);
  cia.write(0x02, 0xFF); // PA output; PB input
  cia.write(0x03, 0x00);
  cia.write(0x00, 0xFE); // select PA0, home of the 4 odd F-keys
  for (const name of keys) {
    const [col, row] = KEY_MAP[name];
    assert.equal(col, 0);
    cia.setKey(col, row, true);
    assert.equal(cia.read(0x01) & (1 << row), 0, `${name} must reach $DC01`);
    cia.setKey(col, row, false);
    assert.notEqual(cia.read(0x01) & (1 << row), 0, `${name} must release`);
  }
});

test("reverse C64 Port B -> Port A scan detects all 4 function keys", () => {
  const cia = new CIA(1);
  cia.write(0x02, 0x00); // PA input
  cia.write(0x03, 0xFF); // PB output
  cia.write(0x00, 0xFF);
  for (const name of keys) {
    const [col, row] = KEY_MAP[name];
    cia.write(0x01, (0xFF ^ (1 << row))); // select corresponding row
    assert.equal(cia.read(0x00), 0xFF, "Idle keyboard port must read high");
    cia.setKey(col, row, true);
    assert.equal(cia.read(0x00) & (1 << col), 0,
      `Reverse keyboard scan must detect ${name}`);
    assert.equal(cia.peek(0x00) & (1 << col), 0,
      `Side-effect-free predecode must detect ${name}`);
    cia.write(0x01, 0xFF); // no row selected
    assert.equal(cia.read(0x00), 0xFF, "An unselected row must not produce a key");
    cia.setKey(col, row, false);
    cia.write(0x01, (0xFF ^ (1 << row)));
    assert.equal(cia.read(0x00), 0xFF, `Releasing ${name} clears reverse scan`);
  }
});

test("reverse scan only affects input pins and not other CIAs", () => {
  const a = new CIA(1);
  a.write(0x02, 0x01); // PA0 as driven output high; PA1 input
  a.write(0x00, 0xFF);
  a.write(0x03, 0xFF);
  a.write(0x01, 0xEF); // row 4 selected
  a.setKey(0, 4, true); // F1: must not override an output pin
  assert.equal(a.read(0x00) & 1, 1);
  a.setKey(1, 4, true); // this second column is an input
  assert.equal(a.read(0x00) & 2, 0);
  const b = new CIA(2);
  b.write(0x02, 0);
  b.write(0x03, 0xFF);
  b.write(0x01, 0xEF);
  b.setKey(0, 4, true);
  assert.equal(b.read(0x00), 0xFF, "CIA2 is not wired to the keyboard");
});

test("multiple simultaneously held keys on one active row pull multiple columns low", () => {
  const cia = new CIA(1);
  cia.write(0x02, 0);
  cia.write(0x03, 0xFF);
  cia.write(0x01, 0xEF);
  cia.setKey(0, 4, true);
  cia.setKey(2, 4, true);
  assert.equal(cia.read(0), 0xFA);
  cia.setKey(0, 4, false);
  cia.setKey(2, 4, false);
  assert.equal(cia.read(0), 0xFF);
});

test("Tab and F9 share the original RUN/STOP key on both CIA scan directions", () => {
  assert.deepEqual(KEY_MAP.Tab, KEY_MAP.F9);
  assert.deepEqual(KEY_MAP.Tab, [7, 7]);

  const cia = new CIA(1);
  cia.write(0x02, 0xFF); // Port A selects columns
  cia.write(0x03, 0);
  cia.write(0, 0x7F); // Select column 7
  cia.setKey(...KEY_MAP.Tab, true);
  assert.equal(cia.read(1) & 0x80, 0, "Tab must register as C64 RUN/STOP");
  cia.setKey(...KEY_MAP.Tab, false);
  assert.notEqual(cia.read(1) & 0x80, 0, "RUN/STOP must release on Tab key-up");

  cia.write(0x02, 0);
  cia.write(0x03, 0xFF); // Port B selects rows
  cia.write(1, 0x7F); // Select row 7
  cia.setKey(...KEY_MAP.F9, true);
  assert.equal(cia.read(0) & 0x80, 0, "F9 must remain mapped to RUN/STOP");
  cia.setKey(...KEY_MAP.F9, false);
  assert.notEqual(cia.read(0) & 0x80, 0, "F9 RUN/STOP must release");
});

test("desktop shortcut handler protects native input and AltGr", async () => {
  const { readFileSync } = await import("node:fs");
  const appSource = readFileSync(new URL("../js/ccg-c64/app.js", import.meta.url), "utf8");
  const start = appSource.indexOf("function handleC64Key(event, pressed)");
  const end = appSource.indexOf("function pollGamepad()", start);
  assert.ok(start >= 0 && end > start, "keyboard handler must exist");
  const handler = appSource.slice(start, end);

  assert.match(handler, /usesTextInput\(event\.target\)/);
  assert.match(handler, /usesTextInput\(document\.activeElement\)/);
  assert.match(handler, /event\.code === "Tab" &&/);
  assert.match(handler, /event\.shiftKey \|\| event\.ctrlKey \|\| event\.altKey \|\| event\.metaKey/);
  assert.match(handler, /!pressed && releaseHeldMatrixBinding\(event, "Tab"\)/);
  assert.match(handler, /event\.getModifierState\?\.\("AltGraph"\)/);
  assert.match(handler, /\["KeyJ", "KeyW"\]\.includes\(event\.code\)/);
  assert.match(handler, /event\.code === "KeyJ"\) swapJoystickPort\(\)/);
  assert.match(handler, /else toggleWarpLoad\(\)/);
  assert.match(handler, /keyboardJoystickKeys\.delete\(event\.code\)/);
  assert.match(handler, /releaseHeldMatrixBinding\(event, event\.code \|\|/);
  assert.match(handler, /else if \(!event\.repeat\)/);
  assert.match(handler, /event\.preventDefault\(\)/);
});

test("held F9 and Tab aliases retain RUN/STOP until both are released", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const appSource = readFileSync(new URL("../js/ccg-c64/app.js", import.meta.url), "utf8");
  const start = appSource.indexOf("function releaseHeldMatrixBinding(event, heldKey)");
  const end = appSource.indexOf("function usesNativeKeyboard(target)", start);
  assert.ok(start >= 0 && end > start, "release helper must be present");

  const cia = new CIA(1);
  const context = {
    machine: { cia1: cia },
    heldMatrixKeys: new Map(),
    touchFunctionKeyHolds: new Map(),
    mobileVirtualHeld: new Map(),
    inputStatus: null,
  };
  runInNewContext(appSource.slice(start, end), context);
  const [col, row] = KEY_MAP.F9;
  context.heldMatrixKeys.set("Tab", { col, row });
  context.heldMatrixKeys.set("F9", { col, row });
  cia.setKey(col, row, true);

  assert.equal(context.releaseHeldMatrixBinding({ shiftKey: false }, "Tab"), true);
  assert.equal(cia.isKeyDown(col, row), true, "F9 must keep RUN/STOP held after Tab releases");
  assert.equal(context.releaseHeldMatrixBinding({ shiftKey: false }, "F9"), true);
  assert.equal(cia.isKeyDown(col, row), false, "RUN/STOP must release after the last host key");

  // Existing touch-held keys are independent of physical host key release.
  context.touchFunctionKeyHolds.set("touch-stop", { col, row });
  context.heldMatrixKeys.set("F9", { col, row });
  cia.setKey(col, row, true);
  context.releaseHeldMatrixBinding({ shiftKey: false }, "F9");
  assert.equal(cia.isKeyDown(col, row), true, "touch-held RUN/STOP must remain pressed");

  context.touchFunctionKeyHolds.clear();
  context.mobileVirtualHeld.set('mobile-stop', { col, row });
  context.heldMatrixKeys.set('Tab', { col, row });
  cia.setKey(col, row, true);
  context.releaseHeldMatrixBinding({ shiftKey: false }, 'Tab');
  assert.equal(cia.isKeyDown(col, row), true, 'mobile virtual RUN/STOP must survive physical Tab release');
  context.heldMatrixKeys.set('F9', { col, row });
  context.releaseHeldMatrixBinding({ shiftKey: false }, 'F9');
  assert.equal(cia.isKeyDown(col, row), true, 'mobile virtual RUN/STOP must survive physical F9 release');
  // Run the real virtual release synchroniser, which owns the final release.
  runInNewContext(appSource.slice(appSource.indexOf('function syncMobileMatrixBit(col, row)'),
    appSource.indexOf('function releaseMobileVirtualKeys()')), context);
  context.mobileVirtualHeld.clear();
  context.syncMobileMatrixBit(col, row);
  assert.equal(cia.isKeyDown(col, row), false, 'last virtual holder release must clear RUN/STOP');
});

test("actual handler releases modified Tab and pre-held J/W, guards shortcuts and native editing", async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const app = readFileSync(new URL('../js/ccg-c64/app.js', import.meta.url), 'utf8');
  const cia = new CIA(1);
  const context = {
    machine: { cia1: cia }, running: true, setup: { hidden: true },
    document: { activeElement: null }, KEY_MAP, CHAR_MAP, inputStatus: null,
    heldMatrixKeys: new Map(), touchFunctionKeyHolds: new Map(),
    mobileVirtualHeld: new Map(),
    keyboardJoystickKeys: new Set(), keyboardJoystickEnabled: true,
    KEYBOARD_JOYSTICK_MASKS: { KeyW: 1 }, pollGamepad() {},
    applyJoystickInput() { context.joy = context.keyboardJoystickKeys.has('KeyW'); },
    swapJoystickPort() { context.swaps = (context.swaps || 0) + 1; },
    toggleWarpLoad() { context.warps = (context.warps || 0) + 1; },
  };
  runInNewContext(app.slice(app.indexOf('function physicalMatrixBinding(event)'), app.indexOf('function pollGamepad()')), context);
  const send = (code, pressed, modifiers = {}) => {
    const event = { code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code,
      preventDefault() { this.prevented = true; }, ...modifiers };
    context.handleC64Key(event, pressed);
    return event;
  };
  for (const modifier of ['shiftKey', 'ctrlKey', 'altKey', 'metaKey']) {
    send('Tab', true);
    assert(cia.isKeyDown(7, 7));
    send('Tab', false, { [modifier]: true });
    assert(!cia.isKeyDown(7, 7), modifier + ' must not strand RUN/STOP');
    assert(!context.heldMatrixKeys.has('Tab'));
    assert(!send('Tab', true, { [modifier]: true }).prevented);
  }
  for (const code of ['KeyJ', 'KeyW']) {
    send(code, true);
    assert(cia.isKeyDown(...KEY_MAP[code]));
    send(code, false, { altKey: true });
    assert(!cia.isKeyDown(...KEY_MAP[code]));
    assert(!context.keyboardJoystickKeys.has(code));
  }
  assert.equal(context.joy, false);
  for (const code of ['KeyJ', 'KeyW']) {
    send(code, true, { altKey: true });
    send(code, true, { altKey: true, repeat: true });
    send(code, false, { altKey: true });
    assert(!cia.isKeyDown(...KEY_MAP[code]));
  }
  assert.equal(context.swaps, 1);
  assert.equal(context.warps, 1);
  send('KeyJ', true, { altKey: true, ctrlKey: true, getModifierState: () => true });
  send('KeyJ', false, { altKey: true, ctrlKey: true, getModifierState: () => true });
  assert.equal(context.swaps, 1, 'AltGr must never invoke shortcuts');
  context.document.activeElement = { closest() { return { tagName: 'INPUT', type: 'text' }; } };
  assert(!send('Tab', true).prevented);
  assert(!send('KeyW', true, { altKey: true }).prevented);
  assert(!cia.isKeyDown(7, 7));
  assert.equal(context.warps, 1);
  context.document.activeElement = null;
  context.setup.hidden = false;
  assert(!send('Tab', true).prevented);
  assert(!send('KeyJ', true, { altKey: true }).prevented);
  assert.equal(context.swaps, 1);
});
