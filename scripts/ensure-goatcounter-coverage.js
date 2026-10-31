#!/usr/bin/env node
"use strict";

/*
 * CCG site-wide GoatCounter publishing safeguard.
 *
 * Run after all static pages have been staged/generated, before uploading the
 * GitHub Pages artifact. This changes only the requested --root tree; it does
 * not rewrite source templates, approved game reviews, or the intro loader.
 *
 * node scripts/ensure-goatcounter-coverage.js --root _site
 * node scripts/ensure-goatcounter-coverage.js --root _site --check
 */
const fs = require("node:fs");
const path = require("node:path");

const ENDPOINT = "https://cheekycommodoregamer.goatcounter.com/count";
const SCRIPT_SOURCE = "https://gc.zgo.at/count.js";
const SCRIPT_TAGS = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const SKIP_DIRS = new Set([".git", ".github", "node_modules", "_site"]);

function publicPath(root, file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  let route = "/" + relative;
  if (route.endsWith("/index.html")) route = route.slice(0, -10) || "/";
  return encodeURI(route);
}

function trackingSnippet(route) {
  // A fixed path avoids sending private query parameters from admin/preview URLs.
  const settings = JSON.stringify({ path: route }).replace(/'/g, "&#39;");
  return "\n<!-- GoatCounter pageview tracking: deployment-managed -->\n" +
    '<script data-goatcounter="' + ENDPOINT + '"' +
    " data-goatcounter-settings='" + settings + "'" +
    ' async src="' + SCRIPT_SOURCE + '"></script>\n';
}

function evaluateHtml(html, route) {
  if (!/<html(?:\s|>)/i.test(html)) return { html, status: "fragment" };

  const scripts = [...html.matchAll(SCRIPT_TAGS)];
  const related = scripts.filter((match) => {
    const open = match[0].match(/^<script\b[^>]*>/i);
    return open && (/\bdata-goatcounter(?:\s|=)/i.test(open[0]) ||
      /(?:https?:)?\/\/gc\.zgo\.at\/count(?:\.v\d+)?\.js/i.test(open[0]));
  });

  for (const match of related) {
    const open = match[0].match(/^<script\b[^>]*>/i)[0];
    const endpoint = /\bdata-goatcounter\s*=\s*(["'])https:\/\/cheekycommodoregamer\.goatcounter\.com\/count\1/i.test(open);
    const src = /\bsrc\s*=\s*(["'])https:\/\/gc\.zgo\.at\/count\.js\1/i.test(open);
    if (!endpoint || !src) {
      throw new Error("Unexpected GoatCounter script/endpoint on " + route +
        "; refusing to alter another tracking integration");
    }
  }

  if (related.length === 1) return { html, status: "present" };

  if (related.length > 1) {
    let result = html;
    for (let i = related.length - 1; i >= 1; i--) {
      const match = related[i];
      result = result.slice(0, match.index) +
        result.slice(match.index + match[0].length);
    }
    return { html: result, status: "deduplicated" };
  }

  const marker = /<\/body\s*>/i.test(html) ? /<\/body\s*>/i :
    /<\/head\s*>/i.test(html) ? /<\/head\s*>/i :
    /<\/html\s*>/i.test(html) ? /<\/html\s*>/i : null;
  if (!marker) {
    throw new Error("HTML page has no closing body/head/html: " + route);
  }
  return {
    html: html.replace(marker, trackingSnippet(route) + "$&"),
    status: "added"
  };
}

// Source of truth for recovered public game history: the frozen export
// snapshots already embedded in the shared visitor runtime. Parse only JSON,
// never evaluate website JavaScript or import confidential GoatCounter records.
function historicalGameTotals() {
  const source = fs.readFileSync(path.join(__dirname, "../js/ccg-visitor-metrics.js"), "utf8");
  function readMap(variable) {
    const match = source.match(new RegExp("var " + variable + " = (\\{[^\\n]+\\});"));
    if (!match) throw new Error("Missing exported GoatCounter map: " + variable);
    const map = JSON.parse(match[1]);
    if (!map || typeof map !== "object" || Array.isArray(map)) {
      throw new Error("Invalid exported GoatCounter map: " + variable);
    }
    return map;
  }
  const direct = readMap("HISTORICAL_GAME_HITS");
  const legacy = readMap("HISTORICAL_LEGACY_QUERY_HITS");
  const totals = Object.create(null);
  for (const [slug, visits] of Object.entries(direct)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        !Number.isSafeInteger(visits) || visits < 0) {
      throw new Error("Invalid exported GoatCounter slug or count: " + slug);
    }
    totals[slug] = visits;
  }
  for (const [slug, visits] of Object.entries(legacy)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        !Number.isSafeInteger(visits) || visits < 0) {
      throw new Error("Invalid legacy GoatCounter slug or count: " + slug);
    }
    totals[slug] = (totals[slug] || 0) + visits;
  }
  return totals;
}

// Insert an actual static, styled badge in the deployment output of EVERY
// canonical game page. History is present before JavaScript or any remote
// GoatCounter request, and the browser runtime refreshes the existing node.
function ensureGameViewMarkup(html, route, totals) {
  if (!/^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(route) ||
      !/<html\b[^>]*\bdata-ccg-page\s*=\s*(["'])single-game\1/i.test(html)) {
    return html;
  }
  const slug = route.slice("/games/".length, -1);
  const count = totals[slug] || 0;
  const footer = /<footer\b[^>]*class\s*=\s*(["'])[^"']*\bccg-footer--game\b[^"']*\1[^>]*>/i;
  const match = footer.exec(html);
  if (!match) throw new Error("Missing canonical game footer: " + route);
  if (/id=["']ccg-game-view-count["']/i.test(html)) return html;
  const endIndex = html.indexOf("</footer>", match.index + match[0].length);
  if (endIndex < 0) throw new Error("Unclosed canonical game footer: " + route);
  const visible = [
    "\n        <div class=\"ccg-game-views\" aria-label=\"Recorded game page views\"",
    "             title=\"Recovered historical game views, updated from GoatCounter\">",
    "            <span class=\"ccg-game-views__label\">Game views</span>",
    "            <span id=\"ccg-game-view-count\" class=\"ccg-game-views__count\"",
    "                  data-ccg-counter-loaded=\"true\" data-ccg-counter-source=\"historical\">",
    "                " + count.toLocaleString("en-GB"),
    "            </span>",
    "        </div>\n    "
  ].join("\n");
  return html.slice(0, endIndex) + visible + html.slice(endIndex);
}

// Canonical game views are raw page loads, not GoatCounter's default
// once-per-path/eight-hour visits. Instrument only the deployed copy of
// canonical game routes, after the publisher-owned source parity audit.
function enforceGameRawViews(html, route) {
  const canonical = /^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(route);
  const gameDocument = /<html\b[^>]*\bdata-ccg-page\s*=\s*(["'])single-game\1/i.test(html);
  if (!canonical || !gameDocument) return html;

  const matches = [...html.matchAll(SCRIPT_TAGS)].filter((m) => {
    const open = m[0].match(/^<script\b[^>]*>/i);
    return open && /\bdata-goatcounter\s*=/i.test(open[0]);
  });
  if (matches.length !== 1) throw new Error("Expected one game tracker at " + route);

  const match = matches[0];
  const open = match[0].match(/^<script\b[^>]*>/i)[0];
  const pattern = /\bdata-goatcounter-settings\s*=\s*(["'])(.*?)\1/i;
  const previous = open.match(pattern);
  let settings = {};
  if (previous) {
    try { settings = JSON.parse(previous[2]); }
    catch (_) { throw new Error("Invalid GoatCounter game settings on " + route); }
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      throw new Error("Unexpected GoatCounter game settings on " + route);
    }
  }
  if (settings.path && settings.path !== route) {
    throw new Error("Mismatched canonical game analytics path on " + route);
  }
  settings.path = route;
  settings.no_session = true;
  const attribute = "data-goatcounter-settings='" + JSON.stringify(settings) + "'";
  const nextOpen = previous ? open.replace(pattern, attribute) :
    open.replace(/>$/, " " + attribute + ">");
  if (open === nextOpen) return html;
  const start = match.index;
  return html.slice(0, start) + nextOpen + html.slice(start + open.length);
}

function ensureMetricsRuntime(html, route) {
  if (!/<html(?:\s|>)/i.test(html)) return html;

  const scriptTag = '<script defer src="/js/ccg-visitor-metrics.js" data-ccg-visitor-metrics></script>';
  const scripts = [...html.matchAll(SCRIPT_TAGS)].filter((match) => {
    const open = match[0].match(/^<script\b[^>]*>/i);
    return open && /\bsrc\s*=\s*(["'])\/js\/ccg-visitor-metrics\.js\1/i.test(open[0]);
  });
  if (scripts.length > 1) throw new Error("Duplicate CCG metrics scripts on " + route);
  if (scripts.length === 1) return html;

  const marker = /<\/body\s*>/i.test(html) ? /<\/body\s*>/i :
    /<\/head\s*>/i.test(html) ? /<\/head\s*>/i :
    /<\/html\s*>/i.test(html) ? /<\/html\s*>/i : null;
  if (!marker) throw new Error("No closing HTML tag for metrics on " + route);

  return html.replace(marker, "\n" + scriptTag + "\n$&");
}

function htmlFiles(root) {
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(full);
      } else if (entry.isFile() && /\.html$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  visit(root);
  return files;
}

function run(argv) {
  const rootFlag = argv.indexOf("--root");
  if (rootFlag < 0 || !argv[rootFlag + 1]) {
    throw new Error("Usage: node scripts/ensure-goatcounter-coverage.js --root PATH [--check]");
  }
  const root = path.resolve(argv[rootFlag + 1]);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("Missing site output directory: " + root);
  }
  const check = argv.includes("--check");
  const historicalTotals = historicalGameTotals();
  const counts = { checked: 0, present: 0, added: 0, deduplicated: 0, fragment: 0 };
  const gaps = [];
  for (const file of htmlFiles(root)) {
    const route = publicPath(root, file);
    const before = fs.readFileSync(file, "utf8");
    const result = evaluateHtml(before, route);
    const withGameViews = enforceGameRawViews(result.html, route);
    const withBadge = ensureGameViewMarkup(withGameViews, route, historicalTotals);
    const withMetrics = ensureMetricsRuntime(withBadge, route);
    counts.checked++;
    counts[result.status]++;
    if (withMetrics !== before) {
      gaps.push(route);
      if (!check) fs.writeFileSync(file, withMetrics, "utf8");
    }
  }

  console.log("[goatcounter] " + (check ? "CHECK" : "APPLY") + " " + JSON.stringify(counts));
  if (check && gaps.length) {
    console.error("[goatcounter] Missing/duplicate tracking on " + gaps.length +
      " HTML pages. Examples: " + gaps.slice(0, 12).join(", "));
    process.exitCode = 1;
  }
  return { counts, gaps };
}

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (error) {
    console.error("[goatcounter] " + error.message);
    process.exitCode = 1;
  }
}

module.exports = { publicPath, trackingSnippet, evaluateHtml, enforceGameRawViews, historicalGameTotals, ensureGameViewMarkup, ensureMetricsRuntime, htmlFiles, run };
