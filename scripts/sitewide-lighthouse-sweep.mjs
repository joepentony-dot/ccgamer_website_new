#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/lr-desktop-config.js";
import * as chromeLauncher from "chrome-launcher";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DEFAULT_SITEMAPS = [
  "sitemap-pages.xml",
  "sitemap-games.xml",
  "sitemap-retro-videos.xml",
  "sitemap-videos.xml",
  "sitemap-commerce.xml",
  "sitemap-light-fantastic.xml",
];
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    output: "",
    rawDir: "",
    shardIndex: 0,
    shardCount: 1,
    modes: ["mobile", "desktop"],
    inventoryOnly: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--inventory-only") {
      out.inventoryOnly = true;
      continue;
    }
    const value = args[i + 1];
    if (arg === "--output") out.output = value;
    else if (arg === "--raw-dir") out.rawDir = value;
    else if (arg === "--shard-index") out.shardIndex = Number(value);
    else if (arg === "--shard-count") out.shardCount = Number(value);
    else if (arg === "--modes") out.modes = String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
    else continue;
    i += 1;
  }

  if (!out.output) throw new Error("--output is required");
  if (!out.inventoryOnly && !out.rawDir) throw new Error("--raw-dir is required unless --inventory-only is used");
  if (!Number.isInteger(out.shardIndex) || out.shardIndex < 0) throw new Error("Invalid --shard-index");
  if (!Number.isInteger(out.shardCount) || out.shardCount < 1) throw new Error("Invalid --shard-count");
  if (out.shardIndex >= out.shardCount) throw new Error("--shard-index must be less than --shard-count");
  if (!out.modes.length || out.modes.some((mode) => !["mobile", "desktop"].includes(mode))) {
    throw new Error("--modes must contain mobile and/or desktop");
  }
  return out;
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function classify(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/") return "entry";
  if (pathname === "/home.html") return "home";
  if (pathname === "/games") return "games-index";
  if (pathname === "/games/discover") return "game-discovery";
  if (pathname === "/games/genres") return "genres-index";
  if (pathname.startsWith("/games/genres/")) return "genre";
  if (pathname === "/games/publishers") return "publishers-index";
  if (pathname.startsWith("/games/publishers/")) return "publisher";
  if (pathname === "/games/collections") return "collections-index";
  if (pathname.startsWith("/games/collections/")) return "collection";
  if (/^\/games\/[^/]+$/.test(pathname)) return "game";
  if (pathname === "/music") return "music";
  if (pathname.startsWith("/zzap64")) return "zzap64";
  if (pathname.startsWith("/quiz/")) return "quiz";
  if (pathname === "/emulation.html") return "emulation";
  if (pathname === "/install-app.html") return "install-app";
  if (pathname === "/about.html") return "about";
  if (pathname === "/contact.html") return "contact";
  if (pathname.startsWith("/community/")) return "community";
  if (pathname.startsWith("/retro-specials/")) return "retro-special";
  if (pathname.startsWith("/retro-events/")) return "retro-event";
  if (pathname.startsWith("/amiga-demo-music/")) return "amiga-demo";
  if (pathname.startsWith("/arcade/")) return "arcade";
  return "other";
}

function collectUrls() {
  const urls = new Map();
  for (const relative of DEFAULT_SITEMAPS) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) continue;
    const xml = fs.readFileSync(file, "utf8");
    for (const match of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
      const raw = decodeXml(match[1].trim());
      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        continue;
      }
      if (parsed.origin !== SITE_ORIGIN) continue;
      parsed.hash = "";
      const normalized = parsed.toString();
      if (!urls.has(normalized)) {
        urls.set(normalized, {
          url: normalized,
          family: classify(normalized),
          sources: [relative],
        });
      } else {
        urls.get(normalized).sources.push(relative);
      }
    }
  }
  return [...urls.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome executable not found");
}

function slug(value) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function display(audit) {
  return audit?.displayValue ?? (audit?.numericValue == null ? "n/a" : String(audit.numericValue));
}

function compactAudit(audits, id) {
  const audit = audits[id];
  return {
    id,
    score: audit?.score ?? null,
    displayValue: audit?.displayValue ?? null,
    numericValue: audit?.numericValue ?? null,
  };
}

async function main() {
  const args = parseArgs();
  const inventory = collectUrls();
  const familyCounts = {};
  for (const item of inventory) familyCounts[item.family] = (familyCounts[item.family] || 0) + 1;

  if (args.inventoryOnly) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, JSON.stringify({
      generated_at: new Date().toISOString(),
      total_unique_urls: inventory.length,
      family_counts: familyCounts,
      urls: inventory,
    }, null, 2) + "\n");
    console.log(JSON.stringify({ total_unique_urls: inventory.length, family_counts: familyCounts }, null, 2));
    return;
  }

  const shardUrls = inventory.filter((_, index) => index % args.shardCount === args.shardIndex);
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.mkdirSync(args.rawDir, { recursive: true });

  const chromePath = findChrome();
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const results = [];
  const errors = [];
  try {
    for (const item of shardUrls) {
      for (const mode of args.modes) {
        try {
          const desktop = mode === "desktop";
          const flags = {
            port: chrome.port,
            output: "json",
            logLevel: "error",
            onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
            maxWaitForLoad: 60000,
          };
          const config = desktop
            ? {
                ...desktopConfig,
                settings: {
                  ...desktopConfig.settings,
                  onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
                },
              }
            : undefined;

          const runner = await lighthouse(item.url, flags, config);
          const lhr = runner.lhr;
          const rawFile = path.join(args.rawDir, `${slug(item.url)}-${mode}.json`);
          fs.writeFileSync(rawFile, JSON.stringify(lhr, null, 2));

          const audits = lhr.audits;
          results.push({
            url: item.url,
            family: item.family,
            mode,
            final_url: lhr.finalDisplayedUrl || lhr.finalUrl,
            scores: {
              performance: lhr.categories.performance?.score ?? null,
              accessibility: lhr.categories.accessibility?.score ?? null,
              best_practices: lhr.categories["best-practices"]?.score ?? null,
              seo: lhr.categories.seo?.score ?? null,
            },
            metrics: {
              fcp_ms: audits["first-contentful-paint"]?.numericValue ?? null,
              lcp_ms: audits["largest-contentful-paint"]?.numericValue ?? null,
              cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
              tbt_ms: audits["total-blocking-time"]?.numericValue ?? null,
              speed_index_ms: audits["speed-index"]?.numericValue ?? null,
              total_bytes: audits["total-byte-weight"]?.numericValue ?? null,
            },
            display: {
              fcp: display(audits["first-contentful-paint"]),
              lcp: display(audits["largest-contentful-paint"]),
              cls: display(audits["cumulative-layout-shift"]),
              tbt: display(audits["total-blocking-time"]),
              speed_index: display(audits["speed-index"]),
              total_bytes: display(audits["total-byte-weight"]),
            },
            diagnostics: [
              "render-blocking-resources",
              "unused-css-rules",
              "unused-javascript",
              "offscreen-images",
              "uses-responsive-images",
              "unsized-images",
              "font-display",
              "third-party-summary",
              "mainthread-work-breakdown",
              "forced-reflow-insight",
              "image-delivery-insight",
              "cls-culprits-insight",
              "lcp-discovery-insight",
            ].map((id) => compactAudit(audits, id)),
            raw_file: path.basename(rawFile),
          });
        } catch (error) {
          errors.push({ url: item.url, family: item.family, mode, error: error.message });
        }
      }
    }
  } finally {
    await chrome.kill();
  }

  const payload = {
    generated_at: new Date().toISOString(),
    shard_index: args.shardIndex,
    shard_count: args.shardCount,
    modes: args.modes,
    total_unique_urls: inventory.length,
    shard_url_count: shardUrls.length,
    completed_runs: results.length,
    errors,
    results,
  };
  fs.writeFileSync(args.output, JSON.stringify(payload, null, 2) + "\n");
  console.log(JSON.stringify({
    shard_index: args.shardIndex,
    shard_count: args.shardCount,
    shard_url_count: shardUrls.length,
    completed_runs: results.length,
    errors: errors.length,
  }, null, 2));

  if (shardUrls.length && results.length === 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
