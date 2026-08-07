#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1 || !argv[index + 1]) return fallback;
  return argv[index + 1];
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function unescapeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function metaValue(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function hasNoindex(html) {
  const robots = metaValue(html, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  return robots
    .toLowerCase()
    .split(",")
    .map((token) => token.trim())
    .includes("noindex");
}

function hasIndexFollow(html) {
  const robots = metaValue(html, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  const tokens = robots
    .toLowerCase()
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.includes("index") && tokens.includes("follow") && !tokens.includes("noindex");
}

function extractSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => unescapeXml(match[1].trim()));
}

function extractLdJson(html) {
  const entries = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    entries.push(JSON.parse(raw));
  }
  return entries;
}

function expect(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateCanonicalPage(root, game, sitemapLocs, errors) {
  const slug = String(game?.slug || "").trim();
  const title = String(game?.title || "").trim();
  const rel = `games/${slug}/index.html`;
  const filePath = path.join(root, rel);
  const canonicalUrl = `${SITE_ORIGIN}/games/${slug}/`;

  expect(SLUG_PATTERN.test(slug), `${rel}: invalid slug.`, errors);
  expect(fs.existsSync(filePath), `${rel}: canonical page is missing.`, errors);
  if (!fs.existsSync(filePath)) return;

  const html = read(filePath);
  const canonical = metaValue(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const ogUrl = metaValue(html, /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  const pageTitle = metaValue(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaValue(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const heroTitle = metaValue(html, /<h1[^>]+id=["']gameHeroTitle["'][^>]*>([\s\S]*?)<\/h1>/i);

  expect(hasIndexFollow(html), `${rel}: canonical page must be index,follow.`, errors);
  expect(canonical === canonicalUrl, `${rel}: canonical mismatch (${canonical || "missing"}).`, errors);
  expect(ogUrl === canonicalUrl, `${rel}: og:url mismatch (${ogUrl || "missing"}).`, errors);
  expect(pageTitle.length > 0, `${rel}: title is missing.`, errors);
  expect(description.length > 0, `${rel}: meta description is missing.`, errors);
  expect(description.length <= 160, `${rel}: meta description exceeds 160 characters.`, errors);
  expect(heroTitle.length > 0, `${rel}: static H1 is missing.`, errors);
  expect(!/http-equiv=["']refresh["']/i.test(html), `${rel}: canonical page still contains a meta refresh.`, errors);
  expect(!/\/games\/game\.html\?id=/i.test(html), `${rel}: canonical page still points to the query-string game route.`, errors);
  expect(!/\bGame not found\b/i.test(html), `${rel}: canonical page contains crawlable Game not found copy.`, errors);
  expect(!/couldn(?:'|&apos;|&#39;|&amp;#39;)t match/i.test(html), `${rel}: canonical page contains crawlable failure copy.`, errors);
  expect(!/&amp;#(?:x?[0-9a-f]+);/i.test(pageTitle), `${rel}: title contains double-escaped HTML entities.`, errors);
  expect(!/\b(?:href|src|srcset)=["']\.\.\//i.test(html), `${rel}: canonical page contains broken parent-relative asset/navigation paths.`, errors);
  expect(sitemapLocs.has(canonicalUrl), `${rel}: canonical URL is missing from sitemap-games.xml.`, errors);

  const schemaEntries = (() => {
    try {
      return extractLdJson(html);
    } catch (error) {
      errors.push(`${rel}: invalid JSON-LD (${error.message}).`);
      return [];
    }
  })();
  expect(schemaEntries.length > 0, `${rel}: JSON-LD is missing.`, errors);

  const hasGame = schemaEntries.some((entry) => {
    if (entry?.["@type"] === "VideoGame" && entry?.url === canonicalUrl) return true;
    if (!Array.isArray(entry?.["@graph"])) return false;
    return entry["@graph"].some((node) => node?.["@type"] === "VideoGame" && node?.url === canonicalUrl);
  });
  const hasBreadcrumb = schemaEntries.some((entry) => {
    if (entry?.["@type"] === "BreadcrumbList") return true;
    if (!Array.isArray(entry?.["@graph"])) return false;
    return entry["@graph"].some((node) => node?.["@type"] === "BreadcrumbList");
  });
  expect(hasGame, `${rel}: VideoGame JSON-LD does not identify the canonical URL.`, errors);
  expect(hasBreadcrumb, `${rel}: BreadcrumbList JSON-LD is missing.`, errors);

  const expectedTitleText = title.toLowerCase() === "smash t.v." ? "Smash TV" : title;
  const normalizedHero = heroTitle
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
  expect(normalizedHero === expectedTitleText, `${rel}: static H1 does not match game title.`, errors);
}

function validateFlatStub(root, game, errors) {
  const slug = String(game?.slug || "").trim();
  const rel = `games/${slug}.html`;
  const filePath = path.join(root, rel);
  const canonicalUrl = `${SITE_ORIGIN}/games/${slug}/`;
  const target = `/games/${slug}/`;

  expect(fs.existsSync(filePath), `${rel}: legacy redirect stub is missing.`, errors);
  if (!fs.existsSync(filePath)) return;

  const html = read(filePath);
  const canonical = metaValue(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const refresh = metaValue(html, /<meta[^>]+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
  expect(hasNoindex(html), `${rel}: legacy stub must be noindex.`, errors);
  expect(canonical === canonicalUrl, `${rel}: canonical mismatch.`, errors);
  expect(refresh === target, `${rel}: redirect target mismatch (${refresh || "missing"}).`, errors);
  expect(!/\/games\/game\.html\?id=/i.test(html), `${rel}: legacy stub still redirects through game.html?id=.`, errors);
}

function validateUtilityRoutes(root, errors) {
  const queryRoute = path.join(root, "games", "game.html");
  const redirectRoute = path.join(root, "redirect.html");

  expect(fs.existsSync(queryRoute), "games/game.html is missing.", errors);
  if (fs.existsSync(queryRoute)) {
    expect(hasNoindex(read(queryRoute)), "games/game.html must remain noindex,follow.", errors);
  }

  expect(fs.existsSync(redirectRoute), "redirect.html is missing.", errors);
  if (fs.existsSync(redirectRoute)) {
    expect(hasNoindex(read(redirectRoute)), "redirect.html must remain noindex,follow.", errors);
  }
}

function run(options = {}) {
  const root = path.resolve(options.root || path.resolve(__dirname, ".."));
  const gamesPath = path.join(root, "games", "games.json");
  const sitemapPath = path.join(root, "sitemap-games.xml");
  const errors = [];

  expect(fs.existsSync(gamesPath), "games/games.json is missing from validation root.", errors);
  expect(fs.existsSync(sitemapPath), "sitemap-games.xml is missing from validation root.", errors);
  if (errors.length) return { root, games: 0, errors };

  const games = JSON.parse(read(gamesPath));
  const sitemapLocList = extractSitemapLocs(read(sitemapPath));
  const sitemapLocs = new Set(sitemapLocList);
  const slugs = new Set();

  expect(Array.isArray(games), "games/games.json must contain a top-level array.", errors);
  if (!Array.isArray(games)) return { root, games: 0, errors };

  for (const game of games) {
    const slug = String(game?.slug || "").trim();
    if (slugs.has(slug)) errors.push(`Duplicate game slug in games.json: ${slug}.`);
    slugs.add(slug);
    validateCanonicalPage(root, game, sitemapLocs, errors);
    validateFlatStub(root, game, errors);
  }

  const expectedGameUrls = new Set([...slugs].map((slug) => `${SITE_ORIGIN}/games/${slug}/`));
  const gameSitemapUrls = sitemapLocList.filter((loc) => loc.startsWith(`${SITE_ORIGIN}/games/`));
  const duplicateSitemapUrls = gameSitemapUrls.filter((loc, index, all) => all.indexOf(loc) !== index);
  expect(duplicateSitemapUrls.length === 0, `sitemap-games.xml contains duplicate URLs: ${[...new Set(duplicateSitemapUrls)].join(", ")}.`, errors);

  const unexpectedSitemapUrls = gameSitemapUrls.filter((loc) => !expectedGameUrls.has(loc));
  expect(unexpectedSitemapUrls.length === 0, `sitemap-games.xml contains unknown game URLs: ${unexpectedSitemapUrls.join(", ")}.`, errors);
  expect(gameSitemapUrls.length === expectedGameUrls.size, `sitemap-games.xml count mismatch. Expected ${expectedGameUrls.size}, found ${gameSitemapUrls.length}.`, errors);

  validateUtilityRoutes(root, errors);
  return { root, games: games.length, errors };
}

function main(argv = process.argv.slice(2)) {
  const root = readArg(argv, "--root", path.resolve(__dirname, ".."));
  const result = run({ root });
  console.log(`[validate-seo-game-routes] Validation root: ${result.root}`);
  console.log(`[validate-seo-game-routes] Games checked: ${result.games}`);
  console.log(`[validate-seo-game-routes] Errors: ${result.errors.length}`);

  if (result.errors.length) {
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("[validate-seo-game-routes] PASS — canonical game routes are indexable, direct, and crawler-safe.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-seo-game-routes] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { run };
