#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const coreRoot = path.join(root, "js", "ccg-c64", "core");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(coreRoot).filter((file) => file.endsWith(".js"));
assert(files.length >= 25, "Expected the machine dependency graph to be vendored");

const importPattern = /(?:import\s+(?:[^'"]+?\s+from\s+)?|export\s+[^'"]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  assert(
    source.includes("SPDX-License-Identifier: GPL-3.0-or-later"),
    `${path.relative(root, file)} must retain its GPL SPDX notice`
  );

  let match;
  while ((match = importPattern.exec(source)) !== null) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) continue;

    let target = path.resolve(path.dirname(file), specifier);
    if (!path.extname(target)) target += ".js";

    assert(
      target.startsWith(coreRoot + path.sep) || target === coreRoot,
      `${path.relative(root, file)} must not escape the isolated emulator core: ${specifier}`
    );
    assert(
      fs.existsSync(target),
      `Missing emulator-core import: ${path.relative(root, file)} -> ${specifier}`
    );
  }
}

console.log(`CCG C64 core import closure passed for ${files.length} modules.`);
