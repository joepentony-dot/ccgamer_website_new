#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/lr-desktop-config.js";
import * as chromeLauncher from "chrome-launcher";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const RAW_EVIDENCE_LIMIT = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = args[index + 1];
  }
  const shardIndex = Number(result.shardIndex);
  const shardCount = Number(result.shardCount);
  if (!["mobile", "desktop"].includes(result.device)) {
    throw new Error("--device must be mobile or desktop");
  }
  if (!Number.isInteger(shardIndex) || shardIndex < 0) {
    throw new Error("--shard-index must be a non-negative integer");
  }
  if (!Number.isInteger(shardCount) || shardCount < 1 || shardIndex >= shardCount) {
    throw new Error("--shard-count must be greater than shard-index");
  }
  if (!result.output || !result.rawDir) {
    throw new Error("Usage: --device MODE --shard-index N --shard-count N --output FILE --raw-dir DIR");
  }
  return { ...result, shardIndex, shardCount };
}

function xmlLocs(source) {
  return [...String(source).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

function localSitemapPath(urlValue) {
  const url = new URL(urlValue);
  if (url.origin !== SITE_ORIGIN) return null;
  const name = path.posix.basename(url.pathname);
  if (!/^sitemap[^/]*\.xml$/i.test(name)) return null;
  return path.join(ROOT, name);
}

function discoverRoutes() {
  const rootSitemap = path.join(ROOT, "sitemap.xml");
  if (!fs.existsSync(rootSitemap)) throw new Error("sitemap.xml is missing");
  const childUrls = xmlLocs(fs.readFileSync(rootSitemap, "utf8"));
  const routes = new Set([SITE_ORIGIN + "/"]);

  for (const childUrl of childUrls) {
    const childPath = localSitemapPath(childUrl);
    if (!childPath || !fs.existsSync(childPath)) continue;
    for (const urlValue of xmlLocs(fs.readFileSync(childPath, "utf8"))) {
      try {
        const url = new URL(urlValue);
        if (url.origin !== SITE_ORIGIN) continue;
        url.hash = "";
        routes.add(url.toString());
      } catch {}
    }
  }

  return [...routes].sort((left, right) => left.localeCompare(right));
}

function pageFamily(urlValue) {
  const pathname = new URL(urlValue).pathname;
  if (pathname === "/" || pathname === "/home.html") return "home-entry";
  if (pathname === "/games/" || pathname === "/games/index.html") return "games-index";
  if (/^\/games\/genres\//.test(pathname)) return "genre";
  if (/^\/games\/publishers\//.test(pathname)) return "publisher";
  if (/^\/games\/developers\//.test(pathname)) return "developer";
  if (/^\/games\/years\//.test(pathname)) return "year";
  if (/^\/games\/platforms\//.test(pathname)) return "platform";
  if (/^\/games\/collections\//.test(pathname)) return "collection";
  if (/^\/games\/discover\//.test(pathname)) return "discovery";
  if (/^\/games\/ccg-games\//.test(pathname)) return "ccg-games";
  if (/^\/games\/[^/]+\/$/.test(pathname)) return "game";
  if (/^\/zzap64\//.test(pathname)) return "zzap64";
  if (/^\/music\//.test(pathname)) return "music";
  if (/^\/quiz\//.test(pathname)) return "quiz";
  if (/^\/retro-specials\//.test(pathname)) return "retro-special";
  if (/^\/retro-events\//.test(pathname)) return "retro-event";
  if (/^\/amiga-demo-music\//.test(pathname)) return "amiga-demo";
  if (/^\/community\//.test(pathname)) return "community";
  if (/^\/arcade\//.test(pathname)) return "arcade";
  return "other";
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
  return String(value).toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
}

function score(category) {
  return category?.score == null ? null : Math.round(category.score * 100);
}

function number(audits, id) {
  const value = audits?.[id]?.numericValue;
  return Number.isFinite(value) ? value : null;
}

function diagnostic(audits, ids) {
  for (const id of ids) {
    const audit = audits?.[id];
    if (!audit) continue;
    return {
      id,
      score: audit.score ?? null,
      displayValue: audit.displayValue ?? null,
      numericValue: Number.isFinite(audit.numericValue) ? audit.numericValue : null,
    };
  }
  return null;
}

function severity(result) {
  const perfPenalty = result.scores.performance == null ? 100 : 100 - result.scores.performance;
  const lcpPenalty = result.metrics.lcp_ms == null ? 0 : Math.max(0, result.metrics.lcp_ms - 2500) / 100;
  const clsPenalty = result.metrics.cls == null ? 0 : Math.max(0, result.metrics.cls - 0.1) * 100;
  const tbtPenalty = result.metrics.tbt_ms == null ? 0 : Math.max(0, result.metrics.tbt_ms - 200) / 50;
  return perfPenalty + lcpPenalty + clsPenalty + tbtPenalty;
}

async function main() {
  const args = parseArgs();
  const routes = discoverRoutes();
  const selected = routes.filter((_, index) => index % args.shardCount === args.shardIndex);
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.mkdirSync(args.rawDir, { recursive: true });

  const chromePath = findChrome();
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const results = [];
  const rawCandidates = [];
  try {
    for (let index = 0; index < selected.length; index += 1) {
      const url = selected[index];
      const startedAt = Date.now();
      try {
        const flags = {
          port: chrome.port,
          output: "json",
          logLevel: "error",
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
          maxWaitForLoad: 60000,
        };
        const config = args.device === "desktop"
          ? {
              ...desktopConfig,
              settings: {
                ...desktopConfig.settings,
                onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
              },
            }
          : undefined;

        const runner = await lighthouse(url, flags, config);
        const lhr = runner.lhr;
        const audits = lhr.audits;
        const result = {
          url,
          final_url: lhr.finalDisplayedUrl || lhr.finalUrl || url,
          family: pageFamily(url),
          device: args.device,
          scores: {
            performance: score(lhr.categories.performance),
            accessibility: score(lhr.categories.accessibility),
            best_practices: score(lhr.categories["best-practices"]),
            seo: score(lhr.categories.seo),
          },
          metrics: {
            fcp_ms: number(audits, "first-contentful-paint"),
            lcp_ms: number(audits, "largest-contentful-paint"),
            cls: number(audits, "cumulative-layout-shift"),
            tbt_ms: number(audits, "total-blocking-time"),
            speed_index_ms: number(audits, "speed-index"),
            total_bytes: number(audits, "total-byte-weight"),
          },
          diagnostics: [
            diagnostic(audits, ["render-blocking-insight", "render-blocking-resources"]),
            diagnostic(audits, ["forced-reflow-insight"]),
            diagnostic(audits, ["image-delivery-insight", "uses-responsive-images"]),
            diagnostic(audits, ["cls-culprits-insight", "layout-shift-elements"]),
            diagnostic(audits, ["font-display-insight", "font-display"]),
            diagnostic(audits, ["unused-css-rules"]),
            diagnostic(audits, ["unused-javascript"]),
            diagnostic(audits, ["third-parties-insight", "third-party-summary"]),
            diagnostic(audits, ["mainthread-work-breakdown"]),
          ].filter(Boolean),
          runtime_ms: Date.now() - startedAt,
        };
        results.push(result);

        const candidate = { result, lhr, severity: severity(result) };
        rawCandidates.push(candidate);
        rawCandidates.sort((left, right) => right.severity - left.severity);
        if (rawCandidates.length > RAW_EVIDENCE_LIMIT) rawCandidates.pop();

        console.log(JSON.stringify({
          progress: index + 1,
          total: selected.length,
          device: args.device,
          url,
          performance: result.scores.performance,
          lcp_ms: result.metrics.lcp_ms,
          cls: result.metrics.cls,
        }));
      } catch (error) {
        results.push({
          url,
          family: pageFamily(url),
          device: args.device,
          error: error.message,
          runtime_ms: Date.now() - startedAt,
        });
        console.error(`[sitewide-lighthouse] ${args.device} ${url}: ${error.message}`);
      }
    }
  } finally {
    await chrome.kill();
  }

  for (let index = 0; index < rawCandidates.length; index += 1) {
    const candidate = rawCandidates[index];
    const rawPath = path.join(args.rawDir, `${String(index + 1).padStart(2, "0")}-${slug(candidate.result.url)}.json`);
    fs.writeFileSync(rawPath, JSON.stringify(candidate.lhr, null, 2));
  }

  const payload = {
    generated_at: new Date().toISOString(),
    device: args.device,
    shard_index: args.shardIndex,
    shard_count: args.shardCount,
    discovered_routes: routes.length,
    audited_routes: selected.length,
    error_count: results.filter((item) => item.error).length,
    results,
  };
  fs.writeFileSync(args.output, JSON.stringify(payload, null, 2) + "\n");

  console.log(JSON.stringify({
    device: args.device,
    shard_index: args.shardIndex,
    discovered_routes: routes.length,
    audited_routes: selected.length,
    error_count: payload.error_count,
  }, null, 2));

  if (selected.length && results.every((item) => item.error)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
