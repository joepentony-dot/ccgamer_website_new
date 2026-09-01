#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const GAMES_DIR = path.join(ROOT, "games");
const GAMES_JSON = path.join(GAMES_DIR, "games.json");
const TEMPLATE = path.join(GAMES_DIR, "game.html");
const MAGAZINE_DATA_DIR = path.join(ROOT, "data", "magazine-game-reviews");
const ZZAP_DATA_DIR = path.join(ROOT, "data", "zzap64-game-reviews");
const CHECK_ONLY = process.argv.includes("--check");

const TEMPLATE_LOADER = '<script src="../js/load-single-game.js" defer></script>';
const TEMPLATE_RUNTIME = '<script src="../js/magazine-game-reviews-runtime.js" defer></script>';
const PAGE_LOADER = '<script src="/js/load-single-game.js" defer></script>';
const PAGE_RUNTIME = '<script src="/js/magazine-game-reviews-runtime.js" defer></script>';
const STATIC_START = "<!-- CCG_MAGAZINE_REVIEWS_STATIC_START -->";
const STATIC_END = "<!-- CCG_MAGAZINE_REVIEWS_STATIC_END -->";

function fail(message) {
  console.error(`[magazine-review-runtime] ${message}`);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function delegatesToGameTemplate(html) {
  const source = String(html || "");
  const hasRefresh = /<meta\b[^>]*http-equiv=(["'])refresh\1[^>]*content=(["'])[^"']*\/games\/game\.html\?id=[^"']+\2/i.test(source);
  const hasRedirect = /window\.location\.replace\(\s*(["'])\/games\/game\.html\?id=[^"']+\1\s*\)/i.test(source);
  return hasRefresh && hasRedirect;
}

function ensureScript(filePath, loader, runtime, options = {}) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (!fs.existsSync(filePath)) fail(`${relative}: canonical game page is missing.`);

  const html = fs.readFileSync(filePath, "utf8");
  if (html.includes(runtime)) return { checked: true, changed: false, delegated: false };

  if (options.allowTemplateDelegation && delegatesToGameTemplate(html)) {
    return { checked: true, changed: false, delegated: true };
  }

  if (!html.includes(loader)) fail(`${relative}: cannot find load-single-game.js insertion point.`);

  if (CHECK_ONLY) fail(`${relative}: magazine review runtime is missing.`);

  const updated = html.replace(loader, `${loader}\n${runtime}`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`[magazine-review-runtime] Added runtime to ${relative}`);
  return { checked: true, changed: true, delegated: false };
}

function readGames() {
  if (!fs.existsSync(GAMES_JSON)) fail("games/games.json is missing.");

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
  } catch (error) {
    fail(`Could not parse games/games.json: ${error.message}`);
  }

  const games = Array.isArray(payload) ? payload : (Array.isArray(payload?.games) ? payload.games : []);
  const valid = games.filter((game) => /^[a-z0-9-]+$/.test(String(game?.slug || "").trim()));
  if (!valid.length) fail("games/games.json did not contain any canonical game slugs.");
  return valid;
}

function canonicalPages(games = readGames()) {
  const seen = new Set();
  return games
    .map((game) => ({
      game,
      slug: String(game?.slug || "").trim(),
      filePath: path.join(GAMES_DIR, String(game?.slug || "").trim(), "index.html")
    }))
    .filter((entry) => {
      if (!entry.slug || seen.has(entry.slug)) return false;
      seen.add(entry.slug);
      return true;
    });
}

function systemKey(game) {
  const raw = String(game?.system || game?.platform || game?.computer || "").toLowerCase();
  return raw.includes("amiga") ? "amiga" : "c64";
}

function chunkName(slug) {
  const first = String(slug || "").charAt(0).toLowerCase();
  if (!first) return "";
  if (/\d/.test(first) || first < "e") return "0-d.json";
  if (first < "i") return "e-h.json";
  if (first < "m") return "i-l.json";
  if (first < "q") return "m-p.json";
  if (first < "u") return "q-t.json";
  return "u-z.json";
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT, filePath).replace(/\\/g, "/")}: invalid JSON (${error.message}).`);
  }
}

function zzapReviewUrl(issue, page) {
  const issueNumber = Number(issue);
  const pageNumber = Number(page);
  if (!Number.isInteger(issueNumber) || issueNumber < 1 || !Number.isInteger(pageNumber) || pageNumber < 1) return "";
  return `https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=${issueNumber}&page=${pageNumber}`;
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const key = [row.magazine, row.issue, row.page, row.url]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function reviewRowsForGame(game, slug) {
  const chunk = chunkName(slug);
  if (!chunk) return [];

  const system = systemKey(game);
  const magazineData = readJsonIfPresent(path.join(MAGAZINE_DATA_DIR, chunk));
  const magazineRows = Array.isArray(magazineData?.games?.[`${system}:${slug}`])
    ? magazineData.games[`${system}:${slug}`]
    : [];

  const zzapData = readJsonIfPresent(path.join(ZZAP_DATA_DIR, chunk));
  const zzapRows = Array.isArray(zzapData?.games?.[slug])
    ? zzapData.games[slug]
        .filter((row) => Array.isArray(row) && (system === "amiga" ? row[2] === "a" : row[2] === "c"))
        .map((row) => ({
          magazine: "Zzap!64",
          issue: String(row[0] || ""),
          date: "",
          page: Number(row[1]) || null,
          reviewer: "",
          score: "",
          scorePercent: null,
          url: zzapReviewUrl(row[0], row[1]),
          language: "English",
          scanStatus: "available",
          era: "contemporary"
        }))
    : [];

  return dedupeRows([...magazineRows, ...zzapRows]);
}

function scoreClass(percent) {
  if (percent === null || percent === "" || !Number.isFinite(Number(percent))) return "is-unscored";
  if (Number(percent) >= 90) return "is-excellent";
  if (Number(percent) >= 75) return "is-good";
  if (Number(percent) >= 60) return "is-mixed";
  return "is-low";
}

function reviewStats(rows) {
  const hasScore = (row) => row.scorePercent !== null && row.scorePercent !== "" && Number.isFinite(Number(row.scorePercent));
  const contemporary = rows.filter((row) => row.era !== "retrospective" && hasScore(row));
  const scored = contemporary.length ? contemporary : rows.filter(hasScore);
  if (!scored.length) return "Original review scans and issue references";
  const values = scored.map((row) => Number(row.scorePercent));
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return `Contemporary average ${average}% · range ${Math.min(...values)}–${Math.max(...values)}%`;
}

function safeExternalUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function renderStaticReview(row) {
  const details = [];
  if (row.issue) details.push(`Issue ${row.issue}`);
  if (row.date) details.push(String(row.date));
  if (row.page) details.push(`page ${row.page}`);
  if (row.language && row.language !== "English") details.push(String(row.language));
  if (row.era === "retrospective") details.push("modern retrospective");

  const hasScore = row.scorePercent !== null && row.scorePercent !== "" && Number.isFinite(Number(row.scorePercent));
  const score = hasScore
    ? `<span class="ccg-magazine-review__score ${scoreClass(row.scorePercent)}">${escapeHtml(row.score || `${row.scorePercent}%`)}</span>`
    : "";
  const reviewer = row.reviewer
    ? `<span class="ccg-magazine-review__reviewer">Reviewed by ${escapeHtml(row.reviewer)}</span>`
    : "";
  const url = safeExternalUrl(row.url);
  const action = url && row.scanStatus !== "missing"
    ? `<a class="game-pill ccg-magazine-review__link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer external">Read Original Review</a>`
    : '<span class="game-pill ccg-magazine-review__link" aria-disabled="true">Scan Not Available</span>';

  return [
    '          <article class="ccg-magazine-review">',
    score ? `            ${score}` : "",
    '            <div class="ccg-magazine-review__body">',
    `              <strong class="ccg-magazine-review__name">${escapeHtml(row.magazine || "Magazine review")}</strong>`,
    `              <span class="ccg-magazine-review__meta">${escapeHtml(details.join(" · ") || "Magazine review")}</span>`,
    reviewer ? `              ${reviewer}` : "",
    "            </div>",
    `            ${action}`,
    "          </article>"
  ].filter(Boolean).join("\n");
}

function renderStaticPanel(rows) {
  return [
    STATIC_START,
    '      <section class="ccg-magazine-reviews ccg-magazine-reviews--static" data-ccg-magazine-review-panel="static" data-ccg-static-magazine-reviews="true" aria-label="Magazine reviews">',
    '        <div class="ccg-magazine-reviews__heading">',
    `          <span class="ccg-magazine-reviews__title">Magazine Reviews · ${rows.length}</span>`,
    `          <span class="ccg-magazine-reviews__summary">${escapeHtml(reviewStats(rows))}</span>`,
    "        </div>",
    '        <div class="ccg-magazine-reviews__static-list">',
    ...rows.map(renderStaticReview),
    "        </div>",
    "      </section>",
    STATIC_END
  ].join("\n");
}

function stripStaticPanel(html) {
  const start = html.indexOf(STATIC_START);
  if (start < 0) return html;
  const end = html.indexOf(STATIC_END, start);
  if (end < 0) return html;
  return `${html.slice(0, start)}${html.slice(end + STATIC_END.length)}`;
}

function stripEmptyPlaceholder(html) {
  return html.replace(/\s*<p\b[^>]*class=(["'])[^"']*\bgame-review-empty\b[^"']*\1[^>]*>[\s\S]*?<\/p>\s*/gi, "\n");
}

function setElementHidden(html, ids, hidden) {
  let output = html;
  ids.forEach((id) => {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tagPattern = new RegExp(`<([a-z][a-z0-9:-]*)\\b([^>]*\\bid=(["'])${escapedId}\\3[^>]*)>`, "i");
    output = output.replace(tagPattern, (full, tagName, attrs) => {
      const withoutHidden = attrs.replace(/\s+hidden(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "");
      const nextAttrs = hidden ? `${withoutHidden} hidden` : withoutHidden;
      return `<${tagName}${nextAttrs}>`;
    });
  });
  return output;
}

function materializeMagazineReviewsHtml(html, rows) {
  let output = stripStaticPanel(String(html || ""));
  output = stripEmptyPlaceholder(output);

  const containerPattern = /(<(?:div|section)\b[^>]*\bid=(["'])(?:gameMagazineReviews|gameLemonLinks)\2[^>]*>)/i;
  const foundContainer = containerPattern.test(output);
  if (!foundContainer) return { html: output, changed: output !== html, foundContainer: false };

  if (rows.length) {
    output = output.replace(containerPattern, `$1\n${renderStaticPanel(rows)}`);
    output = setElementHidden(output, ["game-reading-section", "gameReadingSection"], false);
    output = setElementHidden(output, ["game-reading-card", "gameReadingCard"], false);
    output = setElementHidden(output, ["game-utility-hub-section"], false);
  }

  return { html: output, changed: output !== html, foundContainer: true };
}

function materializePage(filePath, game, slug, options = {}) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const html = fs.readFileSync(filePath, "utf8");
  if (options.delegated || delegatesToGameTemplate(html)) return { changed: false, rows: 0, delegated: true };

  const rows = reviewRowsForGame(game, slug);
  if (!rows.length) return { changed: false, rows: 0, delegated: false };

  const result = materializeMagazineReviewsHtml(html, rows);
  if (!result.foundContainer) {
    fail(`${relative}: ${rows.length} magazine review record(s) exist but no magazine review container is present.`);
  }

  if (!CHECK_ONLY && result.changed) {
    fs.writeFileSync(filePath, result.html, "utf8");
    console.log(`[magazine-review-runtime] Materialized ${rows.length} review(s) into ${relative}`);
  }
  return { changed: !CHECK_ONLY && result.changed, rows: rows.length, delegated: false };
}

function main() {
  let checked = 0;
  let changed = 0;
  let delegated = 0;
  let materializedPages = 0;
  let materializedReviews = 0;

  const templateResult = ensureScript(TEMPLATE, TEMPLATE_LOADER, TEMPLATE_RUNTIME);
  checked += templateResult.checked ? 1 : 0;
  changed += templateResult.changed ? 1 : 0;

  const games = readGames();
  const pages = canonicalPages(games);
  for (const entry of pages) {
    const result = ensureScript(entry.filePath, PAGE_LOADER, PAGE_RUNTIME, { allowTemplateDelegation: true });
    checked += result.checked ? 1 : 0;
    changed += result.changed ? 1 : 0;
    delegated += result.delegated ? 1 : 0;

    if (!CHECK_ONLY) {
      const materialized = materializePage(entry.filePath, entry.game, entry.slug, { delegated: result.delegated });
      changed += materialized.changed ? 1 : 0;
      if (materialized.rows) {
        materializedPages += 1;
        materializedReviews += materialized.rows;
      }
    }
  }

  if (CHECK_ONLY) {
    console.log(`[magazine-review-runtime] Verified runtime coverage for template and ${pages.length} canonical game pages (${delegated} delegated redirect wrapper(s)).`);
  } else {
    console.log(
      `[magazine-review-runtime] Checked template plus ${pages.length} canonical game pages; updated ${changed}; `
      + `${delegated} delegated to games/game.html; materialized ${materializedReviews} review records across ${materializedPages} game pages.`
    );
  }
}

if (require.main === module) main();

module.exports = {
  chunkName,
  dedupeRows,
  materializeMagazineReviewsHtml,
  renderStaticPanel,
  reviewRowsForGame,
  scoreClass,
  systemKey
};
