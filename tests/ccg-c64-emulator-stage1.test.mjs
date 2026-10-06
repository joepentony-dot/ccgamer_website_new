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
assert(headers.includes("/emulator/c64/*"), "Emulator-specific headers are required");
assert(headers.includes("Cross-Origin-Embedder-Policy: require-corp"), "COEP must be scoped for SharedArrayBuffer");
assert(emulation.includes('href="/emulator/c64/"'), "Emulation hub must link to the CCG browser emulator");

console.log("CCG browser C64 Stage 1 contract passed.");
