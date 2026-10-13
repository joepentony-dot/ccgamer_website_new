#!/usr/bin/env node
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("emulation.html", "utf8");
const css = fs.readFileSync("resources/css/emulation.css", "utf8");
const emulator = fs.readFileSync("emulator/c64/index.html", "utf8");

test("Emulation hero gives the playable C64 emulator first-class priority", () => {
  const hero = html.indexOf('id="emulation-hero-title"');
  const feature = html.indexOf('class="emu-play-now"');
  const launch = html.indexOf('class="emu-play-now__launch"');
  const picker = html.indexOf('id="smart-picker"');
  assert(hero >= 0 && feature > hero && launch > feature && picker > launch,
    "A prominent browser-play panel must appear before the setup picker");
  assert.match(html, /href="\/emulator\/c64\/" aria-label="Play Commodore 64 games now in the CCG browser emulator"/);
  assert.match(html, /<h1[^>]*>Play Commodore 64 games online/);
  assert.match(html, /No separate install/);
  assert.match(html, /Save &amp; restore progress/);
  assert.match(html, /aria-labelledby="emu-play-now-title"/);
  assert.match(html, /id="emu-play-now-title"/);
});

test("No lost external emulator or CCG game discovery routes", () => {
  for (const target of ["#smart-picker", "#c64-options", "#amiga-options",
    "#video-tutorials", "#emulation-community", "games/index.html",
    "games/genres/index.html", "games/collections/index.html",
    "https://vice-emu.sourceforge.io/", "https://www.ccs64.com/"]) {
    assert(html.includes('href="' + target + '"'), "Preserve guide or navigation link: " + target);
  }
  assert(emulator.includes('data-online-library-search'), "C64 emulator search must exist at its linked route");
  assert(emulator.includes('data-vault-save'), "Game Vault save control must exist");
});

test("C64 spotlight styling is scoped to emulation page and keyboard accessible", () => {
  assert.match(css, /\.ccg-page--emulation \.emu-play-now \{/);
  assert.match(css, /\.ccg-page--emulation \.emu-play-now__launch \{/);
  assert.match(css, /\.ccg-page--emulation \.emu-play-now__launch:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert(!html.includes('<iframe'), "Do not regress emulation hub performance with an eager embedded emulator");
});
