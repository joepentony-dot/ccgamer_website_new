#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const STYLE_HREF = "/resources/css/ccg-manual-viewer-polish.css";
const SCRIPT_SRC = "/js/ccg-manual-viewer-polish.js";

function readArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function injectManualViewerPolish(html) {
  let output = String(html || "");
  if (!/\bid=["']manualModal["']/i.test(output)) return output;

  if (!output.includes(STYLE_HREF)) {
    const link = `    <link rel="stylesheet" href="${STYLE_HREF}" data-ccg-manual-viewer-polish>`;
    output = /<\/head>/i.test(output)
      ? output.replace(/<\/head>/i, `${link}\n</head>`)
      : output;
  }

  if (!output.includes(SCRIPT_SRC)) {
    const script = `    <script src="${SCRIPT_SRC}" defer data-ccg-manual-viewer-polish></script>`;
    output = /<\/body>/i.test(output)
      ? output.replace(/<\/body>/i, `${script}\n</body>`)
      : output;
  }

  return output;
}

function canonicalGameFiles(root) {
  const gamesJsonPath = path.join(root, "games", "games.json");
  const files = [path.join(root, "games", "game.html")];

  if (!fs.existsSync(gamesJsonPath)) return files;

  const games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
  for (const game of Array.isArray(games) ? games : []) {
    const slug = String(game?.slug || "").trim();
    if (!slug) continue;
    files.push(path.join(root, "games", slug, "index.html"));
  }

  return files;
}

function run({ root, check = false } = {}) {
  const resolvedRoot = path.resolve(root || path.resolve(__dirname, ".."));
  let checked = 0;
  let changed = 0;
  const missing = [];

  for (const filePath of canonicalGameFiles(resolvedRoot)) {
    if (!fs.existsSync(filePath)) {
      missing.push(path.relative(resolvedRoot, filePath));
      continue;
    }

    const current = fs.readFileSync(filePath, "utf8");
    const next = injectManualViewerPolish(current);
    checked += 1;

    if (next === current) continue;
    changed += 1;
    if (!check) fs.writeFileSync(filePath, next, "utf8");
  }

  return { root: resolvedRoot, checked, changed, missing };
}

function main(argv = process.argv.slice(2)) {
  const root = readArg(argv, "--root", path.resolve(__dirname, ".."));
  const check = argv.includes("--check");
  const result = run({ root, check });

  console.log(`[manual-viewer-polish] Checked ${result.checked} game shell/page file(s).`);
  console.log(`[manual-viewer-polish] ${check ? "Would change" : "Changed"}: ${result.changed}.`);

  if (result.missing.length) {
    console.log(`[manual-viewer-polish] Missing generated pages: ${result.missing.length}.`);
  }

  if (check && result.changed > 0) {
    console.error("[manual-viewer-polish] Manual viewer assets are not fully materialized.");
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  SCRIPT_SRC,
  STYLE_HREF,
  injectManualViewerPolish,
  run,
};
