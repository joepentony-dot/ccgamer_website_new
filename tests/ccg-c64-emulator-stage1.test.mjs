#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const html = read("emulator/c64/index.html");
const css = read("resources/css/ccg-c64-emulator.css");
const app = read("js/ccg-c64/app.js");
const audioWorklet = read("js/ccg-c64/audio-worklet.js");
const vault = read("js/ccg-c64/rom-vault.js");
const headers = read("_headers");
const emulation = read("emulation.html");

assert(html.includes("CCG OMEGA LAB"), "CCG identity is required");
assert(!/C64 READY\.?/i.test(html), "Upstream product branding must not appear in the CCG emulator UI");
assert(html.includes('width="384" height="272"'), "Native C64 canvas dimensions must be reserved");
assert(html.includes("webkitdirectory"), "VICE-folder ROM setup must exist");
assert(!/<iframe\b/i.test(html), "Stage 1 must not introduce eager third-party frames");
assert(!/<script[^>]+https?:/i.test(html), "Emulator shell must not load third-party scripts");
assert(css.includes(".ccg-c64-command-grid"), "Original command-deck layout must be present");
assert(css.includes("@media (max-width: 760px)"), "Mobile command-deck layout is required");
assert(vault.includes("ccg.emulator.c64.rom.kernal"), "CCG-local ROM namespace is required");
assert(vault.includes("sizes: [8192]"), "KERNAL/BASIC size validation is required");
assert(vault.includes("sizes: [4096]"), "CHARGEN size validation is required");
assert(vault.includes("sizes: [16384, 16386]"), "1541 size validation is required");
assert(app.includes("vault.restore()"), "Cached ROM restoration must be wired");
assert(app.includes('import { C64Machine } from "./core/machine.js"'), "Machine core must be wired into the CCG app");
assert(app.includes("machine.runFrame()"), "PAL frame execution must be wired");
assert(app.includes("machine.loadPRG(bytes)"), "Stage 2 quick PRG loading must be wired");
assert(app.includes('import { KEY_MAP, CHAR_MAP } from "./core/cia.js"'), "C64 keyboard matrix maps must be wired");
assert(app.includes("machine.cia1.setKey"), "Physical keyboard input must reach the CIA1 matrix");
assert(app.includes("machine.setRestoreNmiLine"), "RESTORE/NMI keyboard handling must be wired");
assert(app.includes("navigator.getGamepads"), "Gamepad polling must be wired");
assert(app.includes("machine.joyPort2 = byte"), "Gamepad input must route to C64 joystick port 2");
assert(app.includes('import { D64, d64Variant } from "./core/media/d64.js"'), "D64 parser must be wired into the media bay");
assert(app.includes("machine.setD64(disk)"), "Drive 8 disk mounting must reach the machine core");
assert(app.includes("machine.injectLoadAndRun()"), "The first D64 quick-load route must queue LOAD/RUN");
assert(html.includes("data-load-disk"), "The CCG media bay must expose its D64 load control");
assert(html.includes("data-input-status"), "The command deck must expose live input state");
assert(html.includes("data-audio-status"), "The command deck must expose SID audio state");
assert(html.includes("data-audio-toggle"), "The command deck must expose SID mute control");
assert(app.includes("audioWorklet.addModule(SID_WORKLET_URL)"), "SID AudioWorklet module must be loaded");
assert(app.includes("shared: machine.sidShared"), "SID worklet must receive the machine SharedArrayBuffer");
assert(audioWorklet.includes('registerProcessor("ccg-sid-processor"'), "CCG SID processor must be registered");
assert(audioWorklet.includes("computeSyncPulses"), "SID voice synchronization must be retained in audio rendering");
assert(!/C64 READY\.?/i.test(audioWorklet), "Audio adapter must not contain upstream product branding");
assert(headers.includes("/emulator/c64/*"), "Emulator-specific headers are required");
assert(headers.includes("Cross-Origin-Embedder-Policy: require-corp"), "COEP must be scoped for SharedArrayBuffer");
assert(emulation.includes('href="/emulator/c64/"'), "Emulation hub must link to the CCG browser emulator");

console.log("CCG browser C64 Stage 1 contract passed.");
