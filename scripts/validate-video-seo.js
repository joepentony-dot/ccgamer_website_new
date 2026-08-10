#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const metadataPath = path.join(repoRoot, "data", "video-metadata.json");
const overridesPath = path.join(repoRoot, "data", "game-video-overrides.json");
const sitemapPath = path.join(repoRoot, "sitemap-videos.xml");

function fail(message) {
  console.error(`[validate-video-seo] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function videoIdFor(game) {
  const value = String(game?.videoid || game?.videoId || "").trim();
  return /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : "";
}

function hasValidUploadDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text) && !Number.isNaN(Date.parse(text));
}

function schemaObjects(html) {
  const match = html.match(/<script\b(?=[^>]*type\s*=\s*(["'])application\/ld\+json\1)(?=[^>]*data-ccg-schema\s*=\s*(["'])game-graph\2)[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];
  try {
    const payload = JSON.parse(match[3].trim());
    return Array.isArray(payload?.["@graph"]) ? payload["@graph"] : [];
  } catch (error) {
    fail(`Invalid game graph JSON-LD: ${error.message}`);
  }
}

function typesOf(entry) {
  return Array.isArray(entry?.["@type"]) ? entry["@type"] : [entry?.["@type"]];
}

function sitemapBlockFor(sitemap, canonical) {
  return sitemap
    .split(/(?=<url>)/g)
    .find((block) => block.includes(`<loc>${canonical}</loc>`)) || "";
}

function main() {
  const gamesPayload = readJson(gamesPath, []);
  const games = Array.isArray(gamesPayload) ? gamesPayload : (gamesPayload.games || []);
  const metadataPayload = readJson(metadataPath, { videos: {} });
  const metadata = metadataPayload?.videos && typeof metadataPayload.videos === "object"
    ? metadataPayload.videos
    : {};
  const overridesPayload = readJson(overridesPath, { videos: {} });
  const overrides = overridesPayload?.videos && typeof overridesPayload.videos === "object"
    ? overridesPayload.videos
    : {};

  assert(fs.existsSync(sitemapPath), "sitemap-videos.xml is missing. Run scripts/generate-video-seo.js first.");
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  let expected = 0;
  let verifiedVideoObjects = 0;
  let externalVideos = 0;
  const expectedLocs = new Set();

  for (const game of games) {
    const slug = String(game?.slug || "").trim();
    const videoId = videoIdFor(game);
    if (!slug || !videoId) continue;
    const filePath = path.join(repoRoot, "games", slug, "index.html");
    if (!fs.existsSync(filePath)) continue;

    expected += 1;
    const canonical = `https://www.cheekycommodoregamer.co.uk/games/${slug}/`;
    expectedLocs.add(canonical);
    const html = fs.readFileSync(filePath, "utf8");
    const external = overrides[String(game?.id || "").trim()] || null;

    const sectionTag = (html.match(/<section\b[^>]*\bid=(["'])game-video-section\1[^>]*>/i) || [])[0] || "";
    assert(sectionTag, `${slug}: missing game-video-section.`);
    assert(!/\shidden(?:\s|>|\/)/i.test(sectionTag), `${slug}: video section is still hidden in static HTML.`);

    const iframeTag = (html.match(/<iframe\b[^>]*\bid=(["'])game-video-embed\1[^>]*>/i) || [])[0] || "";
    assert(iframeTag, `${slug}: missing game video iframe.`);
    if (external) {
      assert(iframeTag.includes(external.playerUrl), `${slug}: static iframe does not point to its external player URL.`);
      assert(iframeTag.includes(`data-video-provider="${external.provider || "external"}"`), `${slug}: external video provider marker is missing.`);
      externalVideos += 1;
    } else {
      assert(
        iframeTag.includes(`https://www.youtube-nocookie.com/embed/${videoId}`),
        `${slug}: static iframe does not point to its YouTube video ID.`
      );
    }
    assert(/\btitle=(["'])[^'"]+\1/i.test(iframeTag), `${slug}: video iframe is missing a descriptive title.`);

    const buttonTag = (html.match(/<a\b[^>]*\bid=(["'])gameVideoBtn\1[^>]*>/i) || [])[0] || "";
    if (external) {
      assert(buttonTag.includes(external.actionUrl.replace(/&/g, "&amp;")) || buttonTag.includes(external.actionUrl), `${slug}: external video action link is missing or incorrect.`);
      const sitemapBlock = sitemapBlockFor(sitemap, canonical);
      assert(sitemapBlock.includes(external.playerUrl), `${slug}: video sitemap does not point to the external player URL.`);
      assert(sitemapBlock.includes(external.thumbnailUrl), `${slug}: video sitemap does not use the configured external-video thumbnail.`);
    } else {
      assert(buttonTag.includes(`https://www.youtube.com/watch?v=${videoId}`), `${slug}: YouTube action link is missing or incorrect.`);
    }

    const objects = schemaObjects(html);
    const videoObjects = objects.filter((entry) => typesOf(entry).includes("VideoObject"));
    const verified = !external && hasValidUploadDate(metadata?.[videoId]?.uploadDate);
    if (verified) {
      assert(videoObjects.length === 1, `${slug}: verified video metadata exists but exactly one VideoObject was not emitted.`);
      const object = videoObjects[0];
      assert(object.name, `${slug}: VideoObject is missing name.`);
      assert(object.thumbnailUrl, `${slug}: VideoObject is missing thumbnailUrl.`);
      assert(hasValidUploadDate(object.uploadDate), `${slug}: VideoObject uploadDate is invalid.`);
      assert(object.embedUrl === `https://www.youtube.com/embed/${videoId}`, `${slug}: VideoObject embedUrl is incorrect.`);
      verifiedVideoObjects += 1;
    } else {
      assert(videoObjects.length === 0, `${slug}: VideoObject was emitted without verified YouTube metadata.`);
    }
  }

  assert(locs.length === expected, `sitemap-videos.xml contains ${locs.length} URLs; expected ${expected}.`);
  const locSet = new Set(locs);
  assert(locSet.size === locs.length, "sitemap-videos.xml contains duplicate page URLs.");
  for (const loc of expectedLocs) assert(locSet.has(loc), `sitemap-videos.xml is missing ${loc}.`);

  console.log(`[validate-video-seo] ${expected} video-enabled canonical game pages validated.`);
  console.log(`[validate-video-seo] ${verifiedVideoObjects} Google-eligible game VideoObjects validated from verified metadata.`);
  console.log(`[validate-video-seo] ${externalVideos} externally hosted game video override(s) validated.`);
}

main();
