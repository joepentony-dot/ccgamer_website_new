#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const core = require("./normalize-public-header-shell-core.js");

const MUSIC_PAGE_PATTERN = /^music(?:-|$)/i;

function parseArgs(argv) {
  const args = { root: ".", check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      args.root = argv[index + 1] || args.root;
      index += 1;
    } else if (value === "--check") {
      args.check = true;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return args;
}

function pageType(html) {
  const htmlTag = String(html || "").match(/<html\b[^>]*>/i)?.[0] || "";
  return core.attributeFromTag
    ? core.attributeFromTag(htmlTag, "data-ccg-page")
    : (htmlTag.match(/\bdata-ccg-page\s*=\s*(["'])(.*?)\1/i)?.[2] || "");
}

function isMusicPage(html) {
  return MUSIC_PAGE_PATTERN.test(pageType(html));
}

function hasPublicHeader(html) {
  return /<header\b[^>]*\bdata-ccg-header\b/i.test(String(html || ""));
}

function isSourceRepositoryRoot(root) {
  const absoluteRoot = path.resolve(root);
  return fs.existsSync(path.join(absoluteRoot, ".git"))
    && fs.existsSync(path.join(absoluteRoot, "scripts", "normalize-public-header-shell-core.js"))
    && fs.existsSync(path.join(absoluteRoot, "js", "ccg-music-navigation.js"));
}

function extractMusicHeaderMarkup(root) {
  const sourcePath = path.join(path.resolve(root), "js", "ccg-music-navigation.js");
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Music navigation source is missing: ${sourcePath}`);
  }

  const source = fs.readFileSync(sourcePath, "utf8");
  const match = source.match(/function\s+headerMarkup\s*\(\)\s*\{\s*return\s*`([\s\S]*?)`;\s*\}/);
  if (!match) {
    throw new Error("Could not extract the canonical Music header markup from js/ccg-music-navigation.js.");
  }

  return match[1]
    .replace(
      'class="ccg-header ccg-header--music-injected" data-ccg-header data-ccg-music-header',
      'class="ccg-header ccg-header--music-static" data-ccg-header data-ccg-music-header data-ccg-music-static-header="true"'
    );
}

function insertAfterBodyOpen(html, markup) {
  const body = String(html || "").match(/<body\b[^>]*>/i);
  if (!body || typeof body.index !== "number") return html;
  const insertAt = body.index + body[0].length;
  return `${html.slice(0, insertAt)}\n${markup}\n${html.slice(insertAt)}`;
}

function prepareMusicFirstPaintShell(html, options = {}) {
  if (!isMusicPage(html) || hasPublicHeader(html)) {
    return { html, applicable: false, changed: false };
  }

  const root = options.root || path.resolve(__dirname, "..");
  const headerMarkup = options.musicHeaderMarkup || extractMusicHeaderMarkup(root);
  const output = insertAfterBodyOpen(html, headerMarkup);
  if (output === html || !hasPublicHeader(output)) {
    throw new Error("Music page has no usable <body> element for first-paint header insertion.");
  }

  return { html: output, applicable: true, changed: true };
}

function normaliseHtml(html, options = {}) {
  const staged = prepareMusicFirstPaintShell(html, options);
  const output = staged.changed ? staged.html : html;
  const result = core.normaliseHtml(output);

  if (!result.applicable) {
    return {
      ...result,
      html: result.html,
      changed: result.html !== html,
      musicStaticHeaderInserted: staged.changed
    };
  }

  return {
    ...result,
    changed: result.html !== html,
    musicStaticHeaderInserted: staged.changed
  };
}

function walkHtmlFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(absolute);
    });
  }
  return files.sort();
}

function processRoot(root, { check = false } = {}) {
  const absoluteRoot = path.resolve(root);
  if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
    throw new Error(`Root directory does not exist: ${absoluteRoot}`);
  }

  const sourceRepositoryRoot = isSourceRepositoryRoot(absoluteRoot);
  const summary = {
    scanned: 0,
    applicable: 0,
    changed: 0,
    musicHeadersInserted: 0,
    malformed: [],
    excluded: 0
  };

  let musicHeaderMarkup = "";
  walkHtmlFiles(absoluteRoot).forEach((filePath) => {
    const relative = path.relative(absoluteRoot, filePath).replace(/\\/g, "/");
    summary.scanned += 1;
    if (core.shouldExclude(relative)) {
      summary.excluded += 1;
      return;
    }

    const original = fs.readFileSync(filePath, "utf8");
    const musicNeedsHeader = !sourceRepositoryRoot && isMusicPage(original) && !hasPublicHeader(original);
    if (musicNeedsHeader && !musicHeaderMarkup) {
      musicHeaderMarkup = extractMusicHeaderMarkup(absoluteRoot);
    }

    const result = sourceRepositoryRoot
      ? core.normaliseHtml(original)
      : normaliseHtml(original, {
          root: absoluteRoot,
          musicHeaderMarkup: musicNeedsHeader ? musicHeaderMarkup : undefined
        });

    if (result.malformed) {
      summary.malformed.push(relative);
      return;
    }
    if (!result.applicable) return;

    summary.applicable += 1;
    if (result.musicStaticHeaderInserted) summary.musicHeadersInserted += 1;
    if (!result.changed) return;
    summary.changed += 1;
    if (!check) fs.writeFileSync(filePath, result.html, "utf8");
  });

  if (summary.malformed.length) {
    throw new Error(`Shared-header pages missing a replaceable nav/actions contract: ${summary.malformed.join(", ")}`);
  }

  return summary;
}

function printSummary(summary, check) {
  const mode = check ? "check" : "normalise";
  console.log(
    `Public header shell ${mode}: scanned ${summary.scanned} HTML files; ${summary.applicable} shared-header pages; ` +
    `${summary.musicHeadersInserted} Music first-paint header insertions; ${summary.changed} ${check ? "would change" : "changed"}; ` +
    `${summary.excluded} excluded.`
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/normalize-public-header-shell.js [--root <directory>] [--check]");
    return;
  }

  const summary = processRoot(args.root, { check: args.check });
  printSummary(summary, args.check);
  if (args.check && summary.changed > 0) {
    console.error(`Public header shell is not canonical on ${summary.changed} staged page(s).`);
    process.exitCode = 1;
  }
}

module.exports = {
  ...core,
  isMusicPage,
  hasPublicHeader,
  isSourceRepositoryRoot,
  extractMusicHeaderMarkup,
  prepareMusicFirstPaintShell,
  normaliseHtml,
  processRoot
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Public header shell normalisation failed: ${error.message}`);
    process.exit(1);
  }
}
