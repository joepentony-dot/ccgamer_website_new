#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const VIDEO_SITEMAP_NS = "http://www.google.com/schemas/sitemap-video/1.1";
const RETRO_SPECIAL_MAX_SLUG_LENGTH = 55;
const RETRO_SPECIAL_FILLER_WORDS = new Set(["the", "about", "these", "this", "a", "an"]);
const metadataPath = path.join(repoRoot, "data", "video-metadata.json");
const sitemapPath = path.join(repoRoot, "sitemap-retro-videos.xml");

const DATASETS = [
  {
    dataPath: path.join(repoRoot, "data", "retro-specials.json"),
    outputDir: path.join(repoRoot, "retro-specials"),
    pagePrefix: "/retro-specials/",
    label: "retro-specials"
  },
  {
    dataPath: path.join(repoRoot, "data", "retro-events.json"),
    outputDir: path.join(repoRoot, "retro-events"),
    pagePrefix: "/retro-events/",
    label: "retro-events"
  },
  {
    dataPath: path.join(repoRoot, "data", "amiga-demo-music.json"),
    outputDir: path.join(repoRoot, "amiga-demo-music"),
    pagePrefix: "/amiga-demo-music/",
    label: "amiga-demo-music"
  }
];

function fail(message) {
  console.error(`[retro-video-seo] ${message}`);
  process.exit(1);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
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

function normalizeKebab(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortenRetroSpecialSlug(baseSlug, fallbackValue) {
  const normalized = normalizeKebab(baseSlug || fallbackValue);
  if (!normalized) return "";
  if (normalized.length <= RETRO_SPECIAL_MAX_SLUG_LENGTH) return normalized;

  const parts = normalized.split("-").filter(Boolean);
  const filtered = parts.filter((part) => !RETRO_SPECIAL_FILLER_WORDS.has(part));
  const source = filtered.length ? filtered : parts;
  const kept = [];

  for (const token of source) {
    const candidate = kept.length ? `${kept.join("-")}-${token}` : token;
    if (candidate.length > RETRO_SPECIAL_MAX_SLUG_LENGTH) break;
    kept.push(token);
  }

  if (kept.length) return kept.join("-");
  return normalized.slice(0, RETRO_SPECIAL_MAX_SLUG_LENGTH).replace(/-+$/g, "");
}

function normalizeRetroSlug(entry, datasetLabel) {
  const source = String(entry?.slug || entry?.id || entry?.title || "").trim();
  if (!source) return "";
  if (datasetLabel !== "retro-specials") return normalizeKebab(source);
  return shortenRetroSpecialSlug(source, entry?.title || entry?.id || source);
}

function videoIdFor(entry) {
  const value = String(
    entry?.youtubeId ||
    entry?.youtube_video_id ||
    entry?.videoId ||
    entry?.videoid ||
    entry?.youtube ||
    ""
  )
    .trim()
    .replace(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/i, "")
    .replace(/[?&].*$/, "");
  return /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : "";
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

function validUploadDate(value) {
  const text = String(value || "").trim();
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

function loadMetadata() {
  const payload = readJson(metadataPath, { version: 1, videos: {} });
  return payload?.videos && typeof payload.videos === "object" ? payload.videos : {};
}

function verifiedMetadata(record) {
  return Boolean(
    record &&
    record.verifiedBy === "youtube-data-api-v3" &&
    validUploadDate(record.uploadDate)
  );
}

function canonicalUrlFor(config, slug) {
  return `${SITE_ORIGIN}${config.pagePrefix}${slug}/`;
}

function thumbnailFor(entry, videoId, metadata) {
  const verified = String(metadata?.thumbnailUrl || "").trim();
  if (/^https:\/\//i.test(verified)) return verified;
  const supplied = String(entry?.thumbnail || "").trim();
  if (/^https:\/\//i.test(supplied)) return supplied;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function titleFor(entry, metadata) {
  return truncate(stripHtml(metadata?.title || entry?.title || "Cheeky Commodore Gamer video"), 100);
}

function descriptionFor(entry) {
  return truncate(
    stripHtml(entry?.seo?.description || entry?.description || entry?.summary || entry?.title || "Cheeky Commodore Gamer video feature."),
    2000
  );
}

function buildVideoObject(entry, videoId, canonicalUrl, metadata) {
  if (!verifiedMetadata(metadata)) return "";

  const object = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${canonicalUrl}#video`,
    name: titleFor(entry, metadata),
    description: descriptionFor(entry),
    thumbnailUrl: thumbnailFor(entry, videoId, metadata),
    uploadDate: validUploadDate(metadata.uploadDate),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "Cheeky Commodore Gamer",
      url: `${SITE_ORIGIN}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/resources/images/ccgamer-logo.png`
      }
    }
  };

  const duration = validDuration(metadata.duration);
  if (duration) object.duration = duration;

  return `<script type="application/ld+json" data-ccg-schema="retro-video">\n${JSON.stringify(object, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")}\n</script>`;
}

function removeVideoObjectScripts(html) {
  return html.replace(
    /\s*<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>[\s\S]*?"@type"\s*:\s*"VideoObject"[\s\S]*?<\/script>\s*/gi,
    "\n"
  );
}

function injectVideoSchema(html, schemaBlock) {
  const marker = "<!-- CCG_VIDEO_SCHEMA -->";
  if (html.includes(marker)) {
    return html.replace(marker, schemaBlock || marker);
  }
  if (!schemaBlock) return html;

  const breadcrumbScript = /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>[\s\S]*?"@type"\s*:\s*"BreadcrumbList"/i;
  const match = html.match(breadcrumbScript);
  if (match && Number.isInteger(match.index)) {
    return `${html.slice(0, match.index)}${schemaBlock}\n    ${html.slice(match.index)}`;
  }
  return html.replace("</head>", `    ${schemaBlock}\n</head>`);
}

function ensureRobotsMeta(html, indexable) {
  const tag = indexable
    ? '<meta name="robots" content="index,follow,max-video-preview:-1,max-image-preview:large,max-snippet:-1" />'
    : '<meta name="robots" content="noindex,follow" />';
  const robotsRe = /<meta\b[^>]*name\s*=\s*(["'])robots\1[^>]*>/i;
  if (robotsRe.test(html)) return html.replace(robotsRe, tag);
  return html.replace(/(<meta\b[^>]*name\s*=\s*(["'])description\2[^>]*>)/i, `$1\n    ${tag}`);
}

function ensureVideoMeta(html, videoId) {
  const additions = [
    `<meta property="og:video:type" content="text/html" />`,
    `<meta property="og:video:width" content="1280" />`,
    `<meta property="og:video:height" content="720" />`,
    `<link rel="preconnect" href="https://www.youtube-nocookie.com" />`,
    `<link rel="preconnect" href="https://i.ytimg.com" crossorigin />`
  ].filter((line) => !html.includes(line));

  if (additions.length) {
    const anchor = `<meta property="og:video:secure_url" content="https://www.youtube.com/embed/${videoId}" />`;
    if (html.includes(anchor)) html = html.replace(anchor, `${anchor}\n    ${additions.join("\n    ")}`);
    else html = html.replace("</head>", `    ${additions.join("\n    ")}\n</head>`);
  }

  return html;
}

function markWatchPage(html, entry, videoId) {
  html = html.replace(
    /<html\b([^>]*)>/i,
    (match, attrs) => /data-ccg-video-watch=/i.test(attrs)
      ? match
      : `<html${attrs} data-ccg-video-watch="true">`
  );

  html = html.replace(
    /<article\b([^>]*class=(["'])[^"']*\bretro-video-page\b[^"']*\2[^>]*)>/i,
    (match, attrs) => /data-ccg-primary-video=/i.test(attrs)
      ? match
      : `<article${attrs} data-ccg-primary-video="${escapeHtml(videoId)}">`
  );

  const iframeRe = /<iframe\b[^>]*src=(["'])https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]+)[^>]*>/i;
  const iframeMatch = html.match(iframeRe);
  if (iframeMatch && iframeMatch[2] === videoId) {
    let iframe = iframeMatch[0]
      .replace("https://www.youtube.com/embed/", "https://www.youtube-nocookie.com/embed/")
      .replace(/\sloading=(["'])lazy\1/i, " loading=\"eager\"");
    if (!/\sdata-ccg-primary-video(?:=|\s|>)/i.test(iframe)) {
      iframe = iframe.replace(/>$/, ` data-ccg-primary-video="true">`);
    }
    const title = `${stripHtml(entry?.title || "Cheeky Commodore Gamer video")} — watch on Cheeky Commodore Gamer`;
    if (/\stitle=(["']).*?\1/i.test(iframe)) {
      iframe = iframe.replace(/\stitle=(["']).*?\1/i, ` title="${escapeHtml(title)}"`);
    } else {
      iframe = iframe.replace(/>$/, ` title="${escapeHtml(title)}">`);
    }
    html = html.replace(iframeRe, iframe);
  }

  return html;
}

function enhancePage(html, context) {
  const { entry, videoId, canonicalUrl, metadata, indexable } = context;
  let next = removeVideoObjectScripts(html);
  next = ensureRobotsMeta(next, indexable);
  next = ensureVideoMeta(next, videoId);
  next = markWatchPage(next, entry, videoId);
  next = injectVideoSchema(next, buildVideoObject(entry, videoId, canonicalUrl, metadata));
  return next;
}

function buildVideoSitemap(entries) {
  const rows = entries.map(({ entry, videoId, canonicalUrl, metadata }) => {
    const lines = [
      "  <url>",
      `    <loc>${escapeXml(canonicalUrl)}</loc>`,
      "    <video:video>",
      `      <video:thumbnail_loc>${escapeXml(thumbnailFor(entry, videoId, metadata))}</video:thumbnail_loc>`,
      `      <video:title>${escapeXml(titleFor(entry, metadata))}</video:title>`,
      `      <video:description>${escapeXml(descriptionFor(entry))}</video:description>`,
      `      <video:player_loc>${escapeXml(`https://www.youtube.com/embed/${videoId}`)}</video:player_loc>`
    ];

    const duration = durationSeconds(metadata?.duration);
    if (duration) lines.push(`      <video:duration>${duration}</video:duration>`);
    const publicationDate = verifiedMetadata(metadata) ? validUploadDate(metadata.uploadDate) : "";
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
  const metadataById = loadMetadata();
  const sitemapEntries = [];
  let updatedPages = 0;
  let processedPages = 0;
  let verifiedObjects = 0;
  let membersOnlyExcluded = 0;
  const missingPages = [];

  for (const config of DATASETS) {
    const payload = readJson(config.dataPath, []);
    const entries = Array.isArray(payload) ? payload : [];

    entries.forEach((entry) => {
      const slug = normalizeRetroSlug(entry, config.label);
      const videoId = videoIdFor(entry);
      if (!slug || !videoId) return;

      const pagePath = path.join(config.outputDir, slug, "index.html");
      if (!fs.existsSync(pagePath)) {
        missingPages.push(`${config.label}:${slug}`);
        return;
      }

      const canonicalUrl = canonicalUrlFor(config, slug);
      const metadata = metadataById[videoId] || {};
      const indexable = entry?.membersOnly !== true;
      const before = fs.readFileSync(pagePath, "utf8");
      const after = enhancePage(before, { entry, videoId, canonicalUrl, metadata, indexable });

      if (after !== before && writeFileIfChanged(pagePath, after)) updatedPages += 1;
      processedPages += 1;
      if (verifiedMetadata(metadata)) verifiedObjects += 1;

      if (indexable) {
        sitemapEntries.push({ entry, videoId, canonicalUrl, metadata });
      } else {
        membersOnlyExcluded += 1;
      }
    });
  }

  sitemapEntries.sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));
  if (!sitemapEntries.length) fail("No public retro watch pages with valid YouTube video IDs were found.");
  writeFileIfChanged(sitemapPath, buildVideoSitemap(sitemapEntries));

  console.log(`[retro-video-seo] Watch pages processed: ${processedPages}`);
  console.log(`[retro-video-seo] Watch pages updated: ${updatedPages}`);
  console.log(`[retro-video-seo] Public video sitemap entries: ${sitemapEntries.length}`);
  console.log(`[retro-video-seo] Verified VideoObjects: ${verifiedObjects}`);
  if (membersOnlyExcluded) {
    console.log(`[retro-video-seo] Members-only pages excluded from video sitemap: ${membersOnlyExcluded}`);
  }
  if (missingPages.length) {
    console.warn(`[retro-video-seo] Missing generated pages: ${missingPages.length}`);
    missingPages.slice(0, 20).forEach((item) => console.warn(`  - ${item}`));
  }
}

if (require.main === module) main();

module.exports = {
  buildVideoObject,
  buildVideoSitemap,
  enhancePage,
  normalizeRetroSlug,
  verifiedMetadata
};
