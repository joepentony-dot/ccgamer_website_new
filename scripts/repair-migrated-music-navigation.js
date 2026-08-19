#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../js/ccg-music-navigation.js");
let source = fs.readFileSync(file, "utf8");

const brokenOpen = "        return \\\n\\`<header";
const fixedOpen = "        return `<header";
const brokenClose = "</header>\\`;";
const fixedClose = "</header>`;";

if (source.includes(brokenOpen)) {
    source = source.replace(brokenOpen, fixedOpen);
}
if (source.includes(brokenClose)) {
    source = source.replace(brokenClose, fixedClose);
}

if (/return \\\r?\n/.test(source) || source.includes("\\`<header") || source.includes("</header>\\`;")) {
    throw new Error("Legacy music fallback still contains escaped template-literal syntax.");
}

fs.writeFileSync(file, source, "utf8");
console.log("Legacy music fallback template syntax normalized.");
