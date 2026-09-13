#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const overridesPath = path.join(repoRoot, "data", "game-video-overrides.json");
const sitemapPath = path.join(repoRoot, "sitemap-videos.xml");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";

function fail(message) {
  console.error(`[game-video-overrides] ${message}`);
  process.exit(1);
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function writeFileIfChanged(filePath, content) {
  const next = String(content);
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === next) return false;
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function setAttribute(tag, name, value) {
  const attrRe = new RegExp(`\\s${name}\\s*=\\s*(["']).*?\\1`, "i");
  const escaped = escapeHtml(value);
  if (attrRe.test(tag)) return tag.replace(attrRe, ` ${name}="${escaped}"`);
  return tag.replace(/\s*>$/, ` ${name}="${escaped}">`);
}

function removeAttribute(tag, name) {
  const attrRe = new RegExp(`\\s${name}\\s*=\\s*(["']).*?\\1`, "gi");
  return tag.replace(attrRe, "");
}

function removeBooleanAttribute(tag, name) {
  const attrRe = new RegExp(`\\s${name}(?=\\s|>|/)`, "gi");
  return tag.replace(attrRe, "");
}

function patchGamePage(html, override) {
  const sectionRe = /(<section\b[^>]*\bid=(["'])game-video-section\2[^>]*>)([\s\S]*?)(<\/section>)/i;
  const sectionMatch = html.match(sectionRe);
  if (!sectionMatch) fail(`${override.slug}: game-video-section was not found.`);

  let opening = removeBooleanAttribute(sectionMatch[1], "hidden");
  let body = sectionMatch[3];

  const iframeRe = /<iframe\b[^>]*\bid=(["'])game-video-embed\1[^>]*>/i;
  const iframeMatch = body.match(iframeRe);
  if (!iframeMatch) fail(`${override.slug}: game video iframe was not found.`);

  let iframe = iframeMatch[0];
  iframe = setAttribute(iframe, "src", override.playerUrl);
  iframe = setAttribute(iframe, "data-video-provider", override.provider || "external");
  iframe = removeAttribute(iframe, "data-video-id");
  iframe = removeBooleanAttribute(iframe, "hidden");
  body = body.replace(iframeRe, iframe);

  const buttonRe = /<a\b[^>]*\bid=(["'])gameVideoBtn\1[^>]*>[\s\S]*?<\/a>/i;
  const buttonMatch = body.match(buttonRe);
  if (!buttonMatch) fail(`${override.slug}: game video action link was not found.`);

  let button = buttonMatch[0];
  const openingTag = button.match(/^<a\b[^>]*>/i)?.[0] || "";
  if (!openingTag) fail(`${override.slug}: game video action link opening tag was invalid.`);
  let nextOpeningTag = setAttribute(openingTag, "href", override.actionUrl);
  nextOpeningTag = removeBooleanAttribute(nextOpeningTag, "hidden");
  const label = escapeHtml(override.actionLabel || "Open Video");
  button = `${nextOpeningTag}${label}</a>`;
  body = body.replace(buttonRe, button);

  return html.replace(sectionRe, `${opening}${body}${sectionMatch[4]}`);
}

function patchSitemap(sitemap, override) {
  const canonical = `${SITE_ORIGIN}/games/${override.slug}/`;
  const escapedCanonical = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRe = new RegExp(`<url>\\s*<loc>${escapedCanonical}<\\/loc>[\\s\\S]*?<\\/url>`, "i");
  const match = sitemap.match(blockRe);
  if (!match) fail(`${override.slug}: video sitemap entry was not found.`);

  let block = match[0];
  block = block.replace(
    /<video:thumbnail_loc>[^<]*<\/video:thumbnail_loc>/i,
    `<video:thumbnail_loc>${escapeXml(override.thumbnailUrl)}</video:thumbnail_loc>`
  );
  block = block.replace(
    /<video:player_loc>[^<]*<\/video:player_loc>/i,
    `<video:player_loc>${escapeXml(override.playerUrl)}</video:player_loc>`
  );
  block = block.replace(/\s*<video:duration>[^<]*<\/video:duration>/gi, "");
  block = block.replace(/\s*<video:publication_date>[^<]*<\/video:publication_date>/gi, "");

  return sitemap.replace(blockRe, block);
}

function main() {
  const payload = readJson(overridesPath, { videos: {} });
  const overrides = payload?.videos && typeof payload.videos === "object"
    ? Object.entries(payload.videos)
    : [];

  if (!overrides.length) {
    console.log("[game-video-overrides] No external video overrides configured.");
    return;
  }

  let sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  if (!sitemap) fail("sitemap-videos.xml is missing. Run generate-video-seo first.");

  let updatedPages = 0;
  for (const [gameId, raw] of overrides) {
    const override = { gameId, ...raw };
    if (!override.slug || !override.playerUrl || !override.actionUrl || !override.thumbnailUrl) {
      fail(`${gameId}: override requires slug, playerUrl, actionUrl and thumbnailUrl.`);
    }

    const pagePath = path.join(repoRoot, "games", override.slug, "index.html");
    if (!fs.existsSync(pagePath)) fail(`${override.slug}: canonical game page is missing.`);

    const html = fs.readFileSync(pagePath, "utf8");
    const nextHtml = patchGamePage(html, override);
    if (writeFileIfChanged(pagePath, nextHtml)) updatedPages += 1;
    sitemap = patchSitemap(sitemap, override);
  }

  const sitemapUpdated = writeFileIfChanged(sitemapPath, sitemap);
  console.log(`[game-video-overrides] ${overrides.length} external video override(s) applied; ${updatedPages} page(s) updated; sitemap ${sitemapUpdated ? "updated" : "already current"}.`);
}

main();
