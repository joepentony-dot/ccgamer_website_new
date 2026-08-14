#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  mergeGameDescriptionEnrichments,
  readGameDescriptionEnrichments,
} = require("./lib/game-description-enrichments");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const VIDEO_SITEMAP_NS = "http://www.google.com/schemas/sitemap-video/1.1";
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const metadataPath = path.join(repoRoot, "data", "video-metadata.json");
const sitemapPath = path.join(repoRoot, "sitemap-videos.xml");

function fail(message) {
  console.error(`[video-seo] ${message}`);
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
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

function truncate(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function platformLong(game) {
  const raw = String(game?.system || game?.platform || "").trim().toLowerCase();
  return raw.includes("amiga") ? "Amiga" : "Commodore 64";
}

function platformShort(game) {
  return platformLong(game) === "Amiga" ? "Amiga" : "C64";
}

function videoIdFor(game) {
  const value = String(game?.videoid || game?.videoId || "").trim();
  return /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : "";
}

function loadMetadata() {
  const payload = readJson(metadataPath, { version: 1, videos: {} });
  if (payload && typeof payload === "object" && payload.videos && typeof payload.videos === "object") {
    return payload.videos;
  }
  return payload && typeof payload === "object" ? payload : {};
}

function validUploadDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text)) return "";
  return Number.isNaN(Date.parse(text)) ? "" : text;
}

function validDuration(value) {
  const text = String(value || "").trim();
  return /^P(?=\d|T\d)(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(text)
    ? text
    : "";
}

function durationSeconds(isoDuration) {
  const value = validDuration(isoDuration);
  if (!value) return null;
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) return null;
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  const total = Math.round(days * 86400 + hours * 3600 + minutes * 60 + seconds);
  return total > 0 && total <= 28800 ? total : null;
}

function videoPresentation(game, metadata) {
  const title = stripHtml(game?.title || "Retro game");
  const generatedTitle = `${title} – ${platformShort(game)} Gameplay & Review | Cheeky Commodore Gamer`;
  const metaTitle = stripHtml(metadata?.title || "");
  const videoTitle = truncate(metaTitle || generatedTitle, 100);
  const gameDescription = stripHtml(game?.description || game?.desc || "");
  const fallback = `Watch ${title} on ${platformLong(game)} with gameplay and commentary from Cheeky Commodore Gamer.`;
  const description = truncate(gameDescription || fallback, 2000);
  return { title, videoTitle, description };
}

function youtubeThumbnail(videoId, metadata) {
  const value = String(metadata?.thumbnailUrl || "").trim();
  if (/^https:\/\//i.test(value)) return value;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function setAttribute(tag, name, value) {
  const attrRe = new RegExp(`\\s${name}\\s*=\\s*(["']).*?\\1`, "i");
  const escaped = escapeHtml(value);
  if (attrRe.test(tag)) return tag.replace(attrRe, ` ${name}="${escaped}"`);
  return tag.replace(/\s*>$/, ` ${name}="${escaped}">`);
}

function removeBooleanAttribute(tag, name) {
  const attrRe = new RegExp(`\\s${name}(?=\\s|>|/)`, "gi");
  return tag.replace(attrRe, "");
}

function enhanceVideoSection(html, game, videoId, metadata) {
  const presentation = videoPresentation(game, metadata);
  const sectionRe = /(<section\b[^>]*\bid=(["'])game-video-section\2[^>]*>)([\s\S]*?)(<\/section>)/i;
  const match = html.match(sectionRe);
  if (!match) return html;

  let opening = removeBooleanAttribute(match[1], "hidden");
  let body = match[3];

  const headingRe = /<h2\b([^>]*\bclass=(["'])[^'"]*\bgame-section__title\b[^'"]*\2[^>]*)>[\s\S]*?<\/h2>/i;
  const heading = `<h2 class="game-section__title">${escapeHtml(presentation.videoTitle)}</h2>`;
  if (headingRe.test(body)) body = body.replace(headingRe, heading);

  const descriptionHtml = `<p class="ccg-section__intro" data-ccg-video-description>${escapeHtml(presentation.description)}</p>`;
  const existingDescriptionRe = /<p\b[^>]*data-ccg-video-description[^>]*>[\s\S]*?<\/p>/i;
  if (existingDescriptionRe.test(body)) {
    body = body.replace(existingDescriptionRe, () => descriptionHtml);
  } else {
    body = body.replace(heading, `${heading}\n            ${descriptionHtml}`);
  }

  const iframeRe = /<iframe\b[^>]*\bid=(["'])game-video-embed\1[^>]*>/i;
  const iframeMatch = body.match(iframeRe);
  if (iframeMatch) {
    let iframe = iframeMatch[0];
    iframe = setAttribute(iframe, "src", `https://www.youtube-nocookie.com/embed/${videoId}`);
    iframe = setAttribute(iframe, "title", `${presentation.title} ${platformShort(game)} video by Cheeky Commodore Gamer`);
    iframe = setAttribute(iframe, "data-video-id", videoId);
    iframe = setAttribute(iframe, "loading", "lazy");
    iframe = removeBooleanAttribute(iframe, "hidden");
    body = body.replace(iframeRe, iframe);
  }

  const buttonRe = /<a\b[^>]*\bid=(["'])gameVideoBtn\1[^>]*>/i;
  const buttonMatch = body.match(buttonRe);
  if (buttonMatch) {
    let button = buttonMatch[0];
    button = setAttribute(button, "href", `https://www.youtube.com/watch?v=${videoId}`);
    button = removeBooleanAttribute(button, "hidden");
    body = body.replace(buttonRe, button);
  }

  return html.replace(sectionRe, () => `${opening}${body}${match[4]}`);
}

function enhanceGameGraph(html, game, videoId, metadata) {
  const scriptRe = /<script\b(?=[^>]*type\s*=\s*(["'])application\/ld\+json\1)(?=[^>]*data-ccg-schema\s*=\s*(["'])game-graph\2)[^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(scriptRe);
  if (!match) return html;

  let payload;
  try {
    payload = JSON.parse(match[3].trim());
  } catch (error) {
    console.warn(`[video-seo] Skipping invalid game graph for ${game.slug}: ${error.message}`);
    return html;
  }

  const canonicalUrl = `${SITE_ORIGIN}/games/${game.slug}/`;
  const graph = Array.isArray(payload?.["@graph"]) ? payload["@graph"] : [];
  const withoutVideo = graph.filter((entry) => {
    const types = Array.isArray(entry?.["@type"]) ? entry["@type"] : [entry?.["@type"]];
    return !types.includes("VideoObject");
  });

  const uploadDate = validUploadDate(metadata?.uploadDate);
  if (uploadDate) {
    const presentation = videoPresentation(game, metadata);
    const videoObject = {
      "@type": "VideoObject",
      "@id": `${canonicalUrl}#video`,
      name: presentation.videoTitle,
      description: presentation.description,
      thumbnailUrl: youtubeThumbnail(videoId, metadata),
      uploadDate,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      url: canonicalUrl,
      about: { "@id": `${canonicalUrl}#game` }
    };
    const duration = validDuration(metadata?.duration);
    if (duration) videoObject.duration = duration;

    const gameObject = withoutVideo.find((entry) => {
      const types = Array.isArray(entry?.["@type"]) ? entry["@type"] : [entry?.["@type"]];
      return types.includes("VideoGame");
    });
    if (gameObject) gameObject.subjectOf = { "@id": videoObject["@id"] };

    const gameIndex = withoutVideo.indexOf(gameObject);
    if (gameIndex >= 0) withoutVideo.splice(gameIndex + 1, 0, videoObject);
    else withoutVideo.push(videoObject);
  } else {
    const gameObject = withoutVideo.find((entry) => {
      const types = Array.isArray(entry?.["@type"]) ? entry["@type"] : [entry?.["@type"]];
      return types.includes("VideoGame");
    });
    if (gameObject?.subjectOf?.["@id"] === `${canonicalUrl}#video`) delete gameObject.subjectOf;
  }

  payload["@context"] = payload["@context"] || "https://schema.org";
  payload["@graph"] = withoutVideo;
  const json = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const replacement = match[0].replace(match[3], () => json);
  return html.replace(scriptRe, () => replacement);
}

function buildVideoSitemap(entries) {
  const rows = entries.map(({ game, videoId, metadata }) => {
    const presentation = videoPresentation(game, metadata);
    const canonicalUrl = `${SITE_ORIGIN}/games/${game.slug}/`;
    const lines = [
      "  <url>",
      `    <loc>${escapeXml(canonicalUrl)}</loc>`,
      "    <video:video>",
      `      <video:thumbnail_loc>${escapeXml(youtubeThumbnail(videoId, metadata))}</video:thumbnail_loc>`,
      `      <video:title>${escapeXml(presentation.videoTitle)}</video:title>`,
      `      <video:description>${escapeXml(presentation.description)}</video:description>`,
      `      <video:player_loc>${escapeXml(`https://www.youtube.com/embed/${videoId}`)}</video:player_loc>`
    ];
    const duration = durationSeconds(metadata?.duration);
    if (duration) lines.push(`      <video:duration>${duration}</video:duration>`);
    const publicationDate = validUploadDate(metadata?.uploadDate);
    if (publicationDate) lines.push(`      <video:publication_date>${escapeXml(publicationDate)}</video:publication_date>`);
    lines.push("    </video:video>", "  </url>");
    return lines.join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="${VIDEO_SITEMAP_NS}">`,
    ...rows,
    "</urlset>",
    ""
  ].join("\n");
}

function main() {
  const gamesPayload = readJson(gamesJsonPath, []);
  const sourceGames = Array.isArray(gamesPayload) ? gamesPayload : (gamesPayload.games || []);
  const games = mergeGameDescriptionEnrichments(
    sourceGames,
    readGameDescriptionEnrichments(repoRoot)
  );
  const metadataById = loadMetadata();
  const entries = [];
  let updatedPages = 0;
  let videoObjects = 0;
  const skipped = [];

  for (const game of games) {
    const slug = String(game?.slug || "").trim();
    const videoId = videoIdFor(game);
    if (!slug || !videoId) continue;

    const pagePath = path.join(repoRoot, "games", slug, "index.html");
    if (!fs.existsSync(pagePath)) {
      skipped.push(`${slug}: canonical page missing`);
      continue;
    }

    const metadata = metadataById[videoId] || {};
    let html = fs.readFileSync(pagePath, "utf8");
    const before = html;
    html = enhanceVideoSection(html, game, videoId, metadata);
    html = enhanceGameGraph(html, game, videoId, metadata);

    if (validUploadDate(metadata?.uploadDate)) videoObjects += 1;
    if (html !== before && writeFileIfChanged(pagePath, html)) updatedPages += 1;
    entries.push({ game, videoId, metadata });
  }

  if (!entries.length) fail("No canonical game pages with valid video IDs were found.");
  entries.sort((a, b) => String(a.game.slug).localeCompare(String(b.game.slug)));
  writeFileIfChanged(sitemapPath, buildVideoSitemap(entries));

  console.log(`[video-seo] Video sitemap entries: ${entries.length}`);
  console.log(`[video-seo] Canonical game pages updated: ${updatedPages}`);
  console.log(`[video-seo] Game VideoObjects with verified upload dates: ${videoObjects}`);
  if (skipped.length) {
    console.warn(`[video-seo] Skipped ${skipped.length} video records without canonical pages.`);
    skipped.slice(0, 20).forEach((item) => console.warn(`  - ${item}`));
  }
}

if (require.main === module) main();

module.exports = {
  buildVideoSitemap,
  enhanceGameGraph,
  enhanceVideoSection,
  videoPresentation,
  validDuration,
  validUploadDate
};
