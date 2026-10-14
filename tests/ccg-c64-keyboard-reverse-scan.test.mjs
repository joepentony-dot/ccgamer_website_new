import assert from "node:assert/strict";
import test from "node:test";
import { CIA, KEY_MAP } from "../js/ccg-c64/core/cia.js";

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
