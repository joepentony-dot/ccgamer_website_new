#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const core = require("./normalize-public-header-shell-core.js");

const MUSIC_PAGE_PATTERN = /^music(?:-|$)/i;
const MUSIC_GLOBAL_FIRST_PAINT_STYLES = Object.freeze([
  "/resources/css/ccg-mode-identity.css",
  "/resources/css/ccg-responsive-safety.css",
  "/resources/css/ccg-responsive-page-polish.css",
  "/resources/css/ccg-sitewide-layout-optimization.css"
]);
const PUBLIC_HEADER_FOUNDATION_STYLES = Object.freeze([
  "/resources/css/ccg-master.css"
]);
const PUBLIC_HEADER_FIRST_PAINT_STYLES = Object.freeze([
  "/resources/css/ccg-nav-labelled-bridge.css"
]);
const PUBLIC_HEADER_EXCLUDED_TOP_LEVEL = new Set(["arcade"]);
const PUBLIC_HEADER_EXCLUDED_FILES = new Set(["index.html", "app-launch.html", "offline.html"]);

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

function hasModeIdentityBar(html) {
  return /\bid\s*=\s*(["'])ccgModeIdentityBar\1/i.test(String(html || ""));
}

function isImmediateRedirectShell(html) {
  return /<meta\b(?=[^>]*\bhttp-equiv\s*=\s*(["'])refresh\1)[^>]*>/i.test(String(html || ""));
}

function isSourceRepositoryRoot(root) {
  const absoluteRoot = path.resolve(root);
  return fs.existsSync(path.join(absoluteRoot, ".git"))
    && fs.existsSync(path.join(absoluteRoot, "scripts", "normalize-public-header-shell-core.js"))
    && fs.existsSync(path.join(absoluteRoot, "js", "ccg-music-navigation.js"));
}

function normaliseRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function shouldInjectPublicHeader(relativePath, html) {
  if (hasPublicHeader(html)) return false;
  if (!/<body\b[^>]*>/i.test(String(html || ""))) return false;
  if (/\bdata-ccg-no-public-header\b/i.test(String(html || ""))) return false;
  if (isImmediateRedirectShell(html)) return false;

  const relative = normaliseRelativePath(relativePath);
  if (!relative) return true;
  if (core.shouldExclude(relative)) return false;
  if (PUBLIC_HEADER_EXCLUDED_FILES.has(relative.toLowerCase())) return false;

  const topLevel = relative.split("/", 1)[0].toLowerCase();
  return !PUBLIC_HEADER_EXCLUDED_TOP_LEVEL.has(topLevel);
}

function resolveMusicHeaderSource(root) {
  const requestedRoot = path.resolve(root);
  const repositoryRoot = path.resolve(__dirname, "..");
  const candidates = [
    path.join(requestedRoot, "js", "ccg-music-navigation.js"),
    path.join(repositoryRoot, "js", "ccg-music-navigation.js")
  ];
  return candidates.find((candidate, index) => fs.existsSync(candidate) && candidates.indexOf(candidate) === index) || "";
}

function readMusicNavigationSource(root) {
  const sourcePath = resolveMusicHeaderSource(root);
  if (!sourcePath) {
    throw new Error(`Music navigation source is missing for staged root: ${path.resolve(root)}`);
  }
  return fs.readFileSync(sourcePath, "utf8");
}

function extractMusicHeaderMarkup(root) {
  const source = readMusicNavigationSource(root);
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

function extractMusicStylePaths(root) {
  const source = readMusicNavigationSource(root);
  const match = source.match(/const\s+STYLES\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    throw new Error("Could not extract the Music stylesheet contract from js/ccg-music-navigation.js.");
  }

  const styles = Array.from(match[1].matchAll(/["'](\/resources\/css\/[^"']+\.css)["']/g), (entry) => entry[1]);
  if (!styles.length) {
    throw new Error("The Music stylesheet contract is empty.");
  }
  return Array.from(new Set(styles));
}

function rootAbsoluteUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(raw)) return raw;
  return `/${raw.replace(/^(?:(?:\.\.\/)+|\.\/)/, "")}`;
}

function rootAbsoluteSrcset(value) {
  return String(value || "")
    .split(",")
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return trimmed;
      const parts = trimmed.split(/\s+/);
      parts[0] = rootAbsoluteUrl(parts[0]);
      return parts.join(" ");
    })
    .join(", ");
}

function absolutiseMasterHeaderMarkup(markup) {
  return String(markup || "")
    .replace(/\b(href|src)\s*=\s*(["'])([^"']*)\2/gi, (_match, attribute, quote, value) => {
      return `${attribute}=${quote}${rootAbsoluteUrl(value)}${quote}`;
    })
    .replace(/\bsrcset\s*=\s*(["'])([^"']*)\1/gi, (_match, quote, value) => {
      return `srcset=${quote}${rootAbsoluteSrcset(value)}${quote}`;
    });
}

function extractMasterHeaderMarkup(root) {
  const sourcePath = path.join(path.resolve(root), "home.html");
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Canonical home header source is missing for staged root: ${sourcePath}`);
  }

  const source = fs.readFileSync(sourcePath, "utf8");
  const match = source.match(/<header\b[^>]*\bdata-ccg-header\b[^>]*>[\s\S]*?<\/header\s*>/i);
  if (!match) {
    throw new Error("Could not extract the canonical public header from home.html.");
  }
  return absolutiseMasterHeaderMarkup(match[0]);
}

function buildModeIdentityMarkup() {
  return `<aside id="ccgModeIdentityBar" class="ccg-mode-identity" role="status" aria-live="polite" aria-label="Current Commodore display mode" data-mode="c64" data-ccg-music-static-mode-identity="true">
  <div class="ccg-mode-identity__inner">
    <div class="ccg-mode-identity__name">
      <span class="ccg-mode-identity__icon" aria-hidden="true">
        <span class="ccg-mode-identity__c64-mark"><i></i><i></i><i></i><i></i></span>
        <span class="ccg-mode-identity__amiga-mark"><i></i></span>
      </span>
      <span class="ccg-mode-identity__eyebrow">COMMODORE 64 MODE</span>
      <span class="ccg-mode-identity__primary">READY.</span>
    </div>
    <div class="ccg-mode-identity__details">
      <span class="ccg-mode-identity__secondary">64K RAM SYSTEM</span>
      <span class="ccg-mode-identity__separator">•</span>
      <span class="ccg-mode-identity__tertiary">C64 ARCHIVE ONLINE</span>
    </div>
  </div>
</aside>`;
}

function insertAfterBodyOpen(html, markup) {
  const body = String(html || "").match(/<body\b[^>]*>/i);
  if (!body || typeof body.index !== "number") return html;
  const insertAt = body.index + body[0].length;
  return `${html.slice(0, insertAt)}\n${markup}\n${html.slice(insertAt)}`;
}

function insertIntoPageShellOrAfterBody(html, markup) {
  const source = String(html || "");
  const shell = source.match(/<div\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bccg-page\b[^"']*\1)[^>]*>/i);
  if (!shell || typeof shell.index !== "number") return insertAfterBodyOpen(source, markup);
  const insertAt = shell.index + shell[0].length;
  return `${source.slice(0, insertAt)}\n${markup}\n${source.slice(insertAt)}`;
}

function insertAfterPublicHeader(html, markup) {
  const source = String(html || "");
  const headerStart = source.search(/<header\b[^>]*\bdata-ccg-header\b[^>]*>/i);
  if (headerStart < 0) return html;
  const headerEndMatch = source.slice(headerStart).match(/<\/header\s*>/i);
  if (!headerEndMatch || typeof headerEndMatch.index !== "number") return html;
  const insertAt = headerStart + headerEndMatch.index + headerEndMatch[0].length;
  return `${source.slice(0, insertAt)}\n${markup}\n${source.slice(insertAt)}`;
}

function insertBeforeHeadClose(html, markup) {
  const closingHead = String(html || "").search(/<\/head\s*>/i);
  if (closingHead < 0) return html;
  return `${html.slice(0, closingHead)}  ${markup}\n${html.slice(closingHead)}`;
}

function hasDirectStylesheet(html, href) {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<link\\b(?=[^>]*\\brel\\s*=\\s*(["'])[^"']*stylesheet[^"']*\\1)(?=[^>]*\\bhref\\s*=\\s*(["'])${escaped}(?:[?#][^"']*)?\\2)[^>]*>`, "i");
  return pattern.test(String(html || ""));
}

function ensureStyles(html, stylePaths, marker) {
  let output = html;
  stylePaths.forEach((href) => {
    if (hasDirectStylesheet(output, href)) return;
    output = insertBeforeHeadClose(
      output,
      `<link rel="stylesheet" href="${href}" ${marker}="true">`
    );
  });
  return output;
}

function ensureMusicFirstPaintStyles(html, stylePaths) {
  return ensureStyles(html, stylePaths, "data-ccg-music-first-paint-style");
}

function ensurePublicHeaderFoundationStyles(html) {
  return ensureStyles(html, PUBLIC_HEADER_FOUNDATION_STYLES, "data-ccg-public-header-foundation-style");
}

function ensurePublicHeaderFirstPaintStyles(html) {
  if (!hasPublicHeader(html)) return html;
  return ensureStyles(html, PUBLIC_HEADER_FIRST_PAINT_STYLES, "data-ccg-public-header-first-paint-style");
}

function prepareMusicFirstPaintShell(html, options = {}) {
  if (!isMusicPage(html)) {
    return {
      html,
      applicable: false,
      changed: false,
      headerInserted: false,
      modeIdentityInserted: false
    };
  }

  const root = options.root || path.resolve(__dirname, "..");
  const musicStyles = options.musicStylePaths || extractMusicStylePaths(root);
  const stylePaths = Array.from(new Set([...musicStyles, ...MUSIC_GLOBAL_FIRST_PAINT_STYLES]));
  let output = ensureMusicFirstPaintStyles(html, stylePaths);
  let headerInserted = false;
  let modeIdentityInserted = false;

  if (!hasPublicHeader(output)) {
    const headerMarkup = options.musicHeaderMarkup || extractMusicHeaderMarkup(root);
    output = insertAfterBodyOpen(output, headerMarkup);
    headerInserted = true;
  }

  if (!hasPublicHeader(output)) {
    throw new Error("Music page has no usable <body> element for first-paint header insertion.");
  }

  if (!hasModeIdentityBar(output)) {
    output = insertAfterPublicHeader(output, buildModeIdentityMarkup());
    modeIdentityInserted = true;
  }

  if (!hasModeIdentityBar(output)) {
    throw new Error("Music page has no usable public header for first-paint mode identity insertion.");
  }

  return {
    html: output,
    applicable: true,
    changed: output !== html,
    headerInserted,
    modeIdentityInserted
  };
}

function preparePublicFirstPaintShell(html, options = {}) {
  const relativePath = options.relativePath || "";
  if (!shouldInjectPublicHeader(relativePath, html)) {
    return {
      html,
      applicable: hasPublicHeader(html),
      changed: false,
      headerInserted: false
    };
  }

  const root = options.root || path.resolve(__dirname, "..");
  const headerMarkup = options.masterHeaderMarkup || extractMasterHeaderMarkup(root);
  let output = ensurePublicHeaderFoundationStyles(html);
  output = insertIntoPageShellOrAfterBody(output, headerMarkup);

  if (!hasPublicHeader(output)) {
    throw new Error(`Public page has no usable insertion point for the canonical header: ${relativePath || "<inline HTML>"}`);
  }

  return {
    html: output,
    applicable: true,
    changed: output !== html,
    headerInserted: true
  };
}

function normaliseHtml(html, options = {}) {
  const stagedMusic = prepareMusicFirstPaintShell(html, options);
  let output = stagedMusic.changed ? stagedMusic.html : html;
  const stagedPublic = preparePublicFirstPaintShell(output, options);
  if (stagedPublic.changed) output = stagedPublic.html;

  const result = core.normaliseHtml(output);
  let finalHtml = result.html;
  if (result.applicable && hasPublicHeader(finalHtml)) {
    finalHtml = ensurePublicHeaderFirstPaintStyles(finalHtml);
  }

  return {
    ...result,
    html: finalHtml,
    changed: finalHtml !== html,
    musicStaticHeaderInserted: stagedMusic.headerInserted,
    musicStaticModeIdentityInserted: stagedMusic.modeIdentityInserted,
    publicHeaderInserted: stagedPublic.headerInserted
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
    musicModeIdentitiesInserted: 0,
    publicHeadersInserted: 0,
    malformed: [],
    excluded: 0
  };

  let musicHeaderMarkup = "";
  let musicStylePaths = null;
  let masterHeaderMarkup = "";
  walkHtmlFiles(absoluteRoot).forEach((filePath) => {
    const relative = path.relative(absoluteRoot, filePath).replace(/\\/g, "/");
    summary.scanned += 1;
    if (core.shouldExclude(relative)) {
      summary.excluded += 1;
      return;
    }

    const original = fs.readFileSync(filePath, "utf8");
    const stagedMusicPage = !sourceRepositoryRoot && isMusicPage(original);
    if (stagedMusicPage && !musicStylePaths) {
      musicStylePaths = extractMusicStylePaths(absoluteRoot);
      musicHeaderMarkup = extractMusicHeaderMarkup(absoluteRoot);
    }

    const stagedGenericPage = !sourceRepositoryRoot
      && !stagedMusicPage
      && shouldInjectPublicHeader(relative, original);
    if (stagedGenericPage && !masterHeaderMarkup) {
      masterHeaderMarkup = extractMasterHeaderMarkup(absoluteRoot);
    }

    const result = sourceRepositoryRoot
      ? core.normaliseHtml(original)
      : normaliseHtml(original, {
          root: absoluteRoot,
          relativePath: relative,
          masterHeaderMarkup: stagedGenericPage ? masterHeaderMarkup : undefined,
          musicHeaderMarkup: stagedMusicPage ? musicHeaderMarkup : undefined,
          musicStylePaths: stagedMusicPage ? musicStylePaths : undefined
        });

    if (result.malformed) {
      summary.malformed.push(relative);
      return;
    }
    if (!result.applicable) return;

    summary.applicable += 1;
    if (result.musicStaticHeaderInserted) summary.musicHeadersInserted += 1;
    if (result.musicStaticModeIdentityInserted) summary.musicModeIdentitiesInserted += 1;
    if (result.publicHeaderInserted) summary.publicHeadersInserted += 1;
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
    `${summary.publicHeadersInserted} site-wide public header insertions; ` +
    `${summary.musicHeadersInserted} Music first-paint header insertions; ` +
    `${summary.musicModeIdentitiesInserted} Music first-paint mode identity insertions; ` +
    `${summary.changed} ${check ? "would change" : "changed"}; ${summary.excluded} excluded.`
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
  MUSIC_GLOBAL_FIRST_PAINT_STYLES,
  PUBLIC_HEADER_FOUNDATION_STYLES,
  PUBLIC_HEADER_FIRST_PAINT_STYLES,
  PUBLIC_HEADER_EXCLUDED_TOP_LEVEL,
  PUBLIC_HEADER_EXCLUDED_FILES,
  isMusicPage,
  hasPublicHeader,
  hasModeIdentityBar,
  isImmediateRedirectShell,
  isSourceRepositoryRoot,
  normaliseRelativePath,
  shouldInjectPublicHeader,
  resolveMusicHeaderSource,
  readMusicNavigationSource,
  extractMusicHeaderMarkup,
  extractMusicStylePaths,
  rootAbsoluteUrl,
  rootAbsoluteSrcset,
  absolutiseMasterHeaderMarkup,
  extractMasterHeaderMarkup,
  buildModeIdentityMarkup,
  ensureMusicFirstPaintStyles,
  ensurePublicHeaderFoundationStyles,
  ensurePublicHeaderFirstPaintStyles,
  prepareMusicFirstPaintShell,
  preparePublicFirstPaintShell,
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
