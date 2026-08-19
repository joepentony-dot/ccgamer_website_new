#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const STATIC_SHELL_VERSION = "2026-08-19-v1";

const PRIMARY_LINKS = Object.freeze([
  ["Home", "/home.html"],
  ["Browse Games", "/games/"],
  ["Browse by Genre", "/games/genres/"],
  ["Publishers", "/games/publishers/"],
  ["Collections", "/games/collections/"],
  ["Music Hub", "/music/"]
]);

const SECONDARY_LINKS = Object.freeze([
  ["Find Me a Game", "/games/discover/"],
  ["Zzap!64 Reviews & Awards", "/zzap64/"],
  ["Quiz", "/quiz/quiz.html"],
  ["Emulation", "/emulation.html"],
  ["Install CCG App", "/install-app.html"],
  ["About Me", "/about.html"],
  ["Contact", "/contact.html"]
]);

const REQUIRED_STYLES = Object.freeze([
  "/resources/css/ccg-nav.css",
  "/resources/css/ccg-nav-fit.css",
  "/resources/css/ccg-global-search.css",
  "/resources/css/ccg-socials.css",
  "/resources/css/ccg-community.css",
  "/resources/css/ccg-mode.css",
  "/resources/css/ccg-buttons.css"
]);

const REQUIRED_SCRIPTS = Object.freeze([
  "/js/ccg-nav.js",
  "/js/ccg-nav-core.js",
  "/js/ccg-mode-engine.js",
  "/js/ccg-nav-fit.js",
  "/js/ccg-header-auth-loader.js"
]);

const EXCLUDED_TOP_LEVEL = new Set(["admin", "auth", "supabase"]);
const AUTH_SNAPSHOT_KEY = "ccg_header_auth_snapshot";

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

function normaliseAssetPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname;
  } catch (_error) {}

  let cleaned = raw.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  cleaned = cleaned.replace(/^\.\//, "");
  while (cleaned.startsWith("../")) cleaned = cleaned.slice(3);
  if (cleaned.startsWith("resources/") || cleaned.startsWith("js/")) cleaned = `/${cleaned}`;
  return cleaned;
}

function classListFromTag(tagText) {
  const match = String(tagText || "").match(/\bclass\s*=\s*(["'])(.*?)\1/i);
  if (!match) return [];
  return match[2].split(/\s+/).map((value) => value.trim()).filter(Boolean);
}

function attributeFromTag(tagText, attributeName) {
  const pattern = new RegExp(`\\b${attributeName}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = String(tagText || "").match(pattern);
  return match ? match[2] : "";
}

function findBalancedElement(html, tagName, requiredClass) {
  const openPattern = new RegExp(`<${tagName}\\b[^>]*>`, "ig");
  let openMatch;
  while ((openMatch = openPattern.exec(html))) {
    if (!classListFromTag(openMatch[0]).includes(requiredClass)) continue;

    const start = openMatch.index;
    const tokenPattern = new RegExp(`<${tagName}\\b[^>]*>|<\\/${tagName}\\s*>`, "ig");
    tokenPattern.lastIndex = start;
    let depth = 0;
    let token;

    while ((token = tokenPattern.exec(html))) {
      if (token[0].startsWith("</")) depth -= 1;
      else depth += 1;

      if (depth === 0) {
        return { start, end: tokenPattern.lastIndex };
      }
    }
    return null;
  }
  return null;
}

function replaceBalancedElement(html, tagName, requiredClass, replacement) {
  const range = findBalancedElement(html, tagName, requiredClass);
  if (!range) return { html, replaced: false };
  return {
    html: `${html.slice(0, range.start)}${replacement}${html.slice(range.end)}`,
    replaced: true
  };
}

function linkMarkup([label, href]) {
  const installMarker = href === "/install-app.html" ? ' data-ccg-pwa-install-nav="true"' : "";
  return `                <li><a href="${href}" class="ccg-nav__link"${installMarker}>${label.replace("&", "&amp;")}</a></li>`;
}

function buildCanonicalNav() {
  return `<nav class="ccg-nav" aria-label="Primary navigation" id="ccg-primary-nav" data-ccg-static-shell="${STATIC_SHELL_VERSION}">
            <div class="ccg-nav__bar">
              <ul class="ccg-nav__list ccg-nav__list--primary" data-ccg-nav-primary>
${PRIMARY_LINKS.map(linkMarkup).join("\n")}
              </ul>
              <div class="ccg-nav__more">
                <button class="ccg-nav__more-toggle" type="button" aria-expanded="false" aria-controls="ccg-more-menu" data-ccg-more-toggle>
                  More <span aria-hidden="true">▾</span>
                </button>
                <div class="ccg-nav__more-menu" id="ccg-more-menu" data-ccg-more-menu hidden></div>
              </div>
            </div>
            <ul class="ccg-nav__list ccg-nav__list--secondary" data-ccg-nav-secondary>
${SECONDARY_LINKS.map(linkMarkup).join("\n")}
            </ul>
          </nav>`;
}

function buildAuthSnapshotBootstrap() {
  return `<script data-ccg-auth-snapshot-bootstrap="true">
              (function () {
                "use strict";
                try {
                  var script = document.currentScript;
                  var actions = script && script.parentElement;
                  var slot = actions && actions.querySelector(".ccg-auth-slot");
                  if (!slot) return;

                  var raw = sessionStorage.getItem("${AUTH_SNAPSHOT_KEY}");
                  if (!raw) return;
                  var snapshot = JSON.parse(raw);
                  if (!snapshot || typeof snapshot.loggedIn !== "boolean") return;

                  slot.textContent = "";
                  slot.removeAttribute("data-ccg-auth-pending");
                  slot.setAttribute("data-ccg-auth-provisional", "true");

                  if (snapshot.loggedIn) {
                    var username = String(snapshot.username || "@member").trim();
                    if (!username || /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(username)) username = "@member";

                    var profile = document.createElement("a");
                    profile.className = "ccg-btn ccg-btn-auth ccg-profile-link";
                    profile.id = "ccg-auth-identity";
                    profile.href = "/community/profile.html";
                    profile.setAttribute("aria-label", "Open profile for " + username);

                    var label = document.createElement("span");
                    label.className = "ccg-profile-link__label";
                    label.textContent = "Profile:";
                    var name = document.createElement("span");
                    name.className = "ccg-profile-link__name";
                    name.textContent = username;
                    profile.appendChild(label);
                    profile.appendChild(document.createTextNode(" "));
                    profile.appendChild(name);

                    var logout = document.createElement("button");
                    logout.type = "button";
                    logout.className = "ccg-btn ccg-btn-auth";
                    logout.id = "ccg-auth-logout";
                    logout.setAttribute("data-logout", "");
                    logout.textContent = "Logout";

                    slot.appendChild(profile);
                    slot.appendChild(logout);
                    return;
                  }

                  var login = document.createElement("button");
                  login.type = "button";
                  login.className = "ccg-btn ccg-btn-auth";
                  login.id = "join-login";
                  login.textContent = "Join / Login";
                  slot.appendChild(login);
                } catch (_error) {}
              })();
            </script>`;
}

function buildCanonicalActions() {
  return `<div class="ccg-header-actions" data-ccg-static-shell="${STATIC_SHELL_VERSION}">
            <div class="ccg-mode-hint">Try different modes</div>
            <button class="ccg-mode-toggle" type="button" aria-label="Toggle between C64 and Amiga modes" data-ccg-mode-toggle>
              <span class="ccg-mode-toggle__pill">
                <span class="ccg-mode-toggle__label ccg-mode-toggle__label--c64">C64 MODE</span>
                <span class="ccg-mode-toggle__label ccg-mode-toggle__label--amiga">AMIGA MODE</span>
                <span class="ccg-mode-toggle__thumb"></span>
              </span>
            </button>
            <div class="ccg-auth-slot" data-ccg-auth-pending="true"></div>
            <div class="ccg-header-socials" aria-label="Social links">
              <a href="https://www.youtube.com/@CheekyCommodoreGamer" aria-label="YouTube"><span class="ccg-socials__icon ccg-socials__icon--yt"></span></a>
              <a href="https://patreon.com/CheekyCommodoreGamer" aria-label="Patreon"><span class="ccg-socials__icon ccg-socials__icon--patreon"></span></a>
              <a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" aria-label="PayPal"><span class="ccg-socials__icon ccg-socials__icon--paypal"></span></a>
              <a href="https://twitter.com/CheekyC64Gamer" aria-label="X/Twitter"><span class="ccg-socials__icon ccg-socials__icon--x"></span></a>
              <a href="https://www.facebook.com/cheekycommodoregamer" aria-label="Facebook"><span class="ccg-socials__icon ccg-socials__icon--fb"></span></a>
              <a href="https://discord.gg/83Xw9ktAn4" aria-label="Discord"><span class="ccg-socials__icon ccg-socials__icon--discord"></span></a>
            </div>
            <div class="ccg-socials-fallback" hidden aria-hidden="true"></div>
            ${buildAuthSnapshotBootstrap()}
          </div>`;
}

function collectAttributeValues(html, tagName, attributeName) {
  const values = [];
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "ig");
  let tag;
  while ((tag = tagPattern.exec(html))) {
    const value = attributeFromTag(tag[0], attributeName);
    if (value) values.push(normaliseAssetPath(value));
  }
  return values;
}

function hasDirectStylesheet(html, assetPath) {
  const linkPattern = /<link\b[^>]*>/ig;
  let link;
  while ((link = linkPattern.exec(html))) {
    const href = normaliseAssetPath(attributeFromTag(link[0], "href"));
    if (href !== assetPath) continue;
    const rel = attributeFromTag(link[0], "rel").toLowerCase().split(/\s+/).filter(Boolean);
    if (rel.includes("stylesheet")) return true;
  }
  return false;
}

function insertBeforeHeadClose(html, markup) {
  const closingHead = html.search(/<\/head\s*>/i);
  if (closingHead < 0) return html;
  return `${html.slice(0, closingHead)}  ${markup}\n${html.slice(closingHead)}`;
}

function ensureDirectStylesheet(html, href) {
  if (hasDirectStylesheet(html, href)) return html;
  return insertBeforeHeadClose(
    html,
    `<link rel="stylesheet" href="${href}" data-ccg-static-shell-style="true">`
  );
}

function ensureHeadAsset(html, markup, assetPath, tagName, attributeName) {
  const values = collectAttributeValues(html, tagName, attributeName);
  if (values.includes(assetPath)) return html;
  return insertBeforeHeadClose(html, markup);
}

function ensureRequiredAssets(html) {
  let output = html;
  REQUIRED_STYLES.forEach((href) => {
    output = ensureDirectStylesheet(output, href);
  });

  REQUIRED_SCRIPTS.forEach((src) => {
    output = ensureHeadAsset(
      output,
      `<script src="${src}" defer data-ccg-static-shell-script="true"></script>`,
      src,
      "script",
      "src"
    );
  });
  return output;
}

function ensureSearchCommandSlot(html) {
  if (/\bdata-ccg-search-command-slot\s*=\s*["']true["']/i.test(html)) return html;
  if (/\bclass\s*=\s*["'][^"']*\bccg-home-search-command\b[^"']*["']/i.test(html)) return html;

  const tagPattern = /<([a-z][a-z0-9:-]*)\b[^>]*>/ig;
  let match;
  while ((match = tagPattern.exec(html))) {
    if (!classListFromTag(match[0]).includes("ccg-main")) continue;
    const markup = `
    <div class="ccg-home-search-command" role="search" aria-label="Search the CCG website" data-ccg-search-command-slot="true"></div>`;
    return `${html.slice(0, tagPattern.lastIndex)}${markup}${html.slice(tagPattern.lastIndex)}`;
  }
  return html;
}

function normaliseHtml(html) {
  if (!/<header\b[^>]*\bdata-ccg-header\b/i.test(html)) {
    return { html, applicable: false, changed: false };
  }

  let output = html;
  const navResult = replaceBalancedElement(output, "nav", "ccg-nav", buildCanonicalNav());
  output = navResult.html;
  const actionsResult = replaceBalancedElement(output, "div", "ccg-header-actions", buildCanonicalActions());
  output = actionsResult.html;

  if (!navResult.replaced || !actionsResult.replaced) {
    return { html, applicable: false, changed: false, malformed: true };
  }

  output = ensureRequiredAssets(output);
  output = ensureSearchCommandSlot(output);
  return { html: output, applicable: true, changed: output !== html, malformed: false };
}

function shouldExclude(relativePath) {
  const normalised = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const topLevel = normalised.split("/", 1)[0].toLowerCase();
  return EXCLUDED_TOP_LEVEL.has(topLevel);
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

  const summary = {
    scanned: 0,
    applicable: 0,
    changed: 0,
    malformed: [],
    excluded: 0
  };

  walkHtmlFiles(absoluteRoot).forEach((filePath) => {
    const relative = path.relative(absoluteRoot, filePath).replace(/\\/g, "/");
    summary.scanned += 1;
    if (shouldExclude(relative)) {
      summary.excluded += 1;
      return;
    }

    const original = fs.readFileSync(filePath, "utf8");
    const result = normaliseHtml(original);
    if (result.malformed) {
      summary.malformed.push(relative);
      return;
    }
    if (!result.applicable) return;

    summary.applicable += 1;
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
  console.log(`Public header shell ${mode}: scanned ${summary.scanned} HTML files; ${summary.applicable} shared-header pages; ${summary.changed} ${check ? "would change" : "changed"}; ${summary.excluded} excluded.`);
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
  STATIC_SHELL_VERSION,
  PRIMARY_LINKS,
  SECONDARY_LINKS,
  REQUIRED_STYLES,
  REQUIRED_SCRIPTS,
  AUTH_SNAPSHOT_KEY,
  normaliseAssetPath,
  normaliseHtml,
  ensureSearchCommandSlot,
  processRoot,
  shouldExclude
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Public header shell normalisation failed: ${error.message}`);
    process.exit(1);
  }
}
