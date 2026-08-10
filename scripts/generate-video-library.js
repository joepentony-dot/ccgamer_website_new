#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { applyTemplate, readTemplate } = require("./template-engine");
const { normalizeRetroSlug, verifiedMetadata } = require("./generate-retro-video-seo");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const templatePath = path.join(repoRoot, "admin", "templates", "video-library-template.html");
const gamesPath = path.join(repoRoot, "games", "games.json");
const metadataPath = path.join(repoRoot, "data", "video-metadata.json");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const outputDir = path.join(repoRoot, "videos");
const outputHtmlPath = path.join(outputDir, "index.html");
const outputIndexPath = path.join(outputDir, "video-index.json");

const DATASETS = [
  {
    dataPath: path.join(repoRoot, "data", "retro-specials.json"),
    outputDir: path.join(repoRoot, "retro-specials"),
    pagePrefix: "/retro-specials/",
    label: "retro-specials",
    collectionLabel: "Retro Specials",
    badge: "Retro Special"
  },
  {
    dataPath: path.join(repoRoot, "data", "retro-events.json"),
    outputDir: path.join(repoRoot, "retro-events"),
    pagePrefix: "/retro-events/",
    label: "retro-events",
    collectionLabel: "Retro Events",
    badge: "Retro Event"
  },
  {
    dataPath: path.join(repoRoot, "data", "amiga-demo-music.json"),
    outputDir: path.join(repoRoot, "amiga-demo-music"),
    pagePrefix: "/amiga-demo-music/",
    label: "amiga-demo-music",
    collectionLabel: "Amiga Demo Music",
    badge: "Amiga Demo"
  }
];

function fail(message) {
  console.error(`[video-library] ${message}`);
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

function videoIdFor(entry) {
  const value = String(
    entry?.videoid ||
    entry?.videoId ||
    entry?.youtubeId ||
    entry?.youtube_video_id ||
    entry?.youtube ||
    ""
  )
    .trim()
    .replace(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/i, "")
    .replace(/[?&].*$/, "");
  return /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function truncate(value, maxLength) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function youtubeThumbnail(videoId, metadata) {
  const verified = String(metadata?.thumbnailUrl || "").trim();
  return /^https:\/\//i.test(verified)
    ? verified
    : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Math.max(0, Number(raw));

  const parts = raw.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2 && parts[0] >= 0 && parts[1] >= 0 && parts[1] < 60) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && parts[0] >= 0 && parts[1] >= 0 && parts[1] < 60 && parts[2] >= 0 && parts[2] < 60) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function normalizeChapters(chapters) {
  const normalized = [];
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    const start = parseTimestamp(chapter?.startOffset ?? chapter?.start ?? chapter?.time ?? chapter?.timestamp);
    const name = stripHtml(chapter?.name || chapter?.title || chapter?.label || "");
    if (start === null || !name) continue;
    normalized.push({ start, name });
  }
  normalized.sort((a, b) => a.start - b.start || a.name.localeCompare(b.name));
  return normalized.filter((chapter, index, all) => index === 0 || chapter.start !== all[index - 1].start);
}

function chaptersFromDescription(description) {
  const chapters = [];
  const lines = String(description || "").split(/\r?\n/);
  const timestampRe = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*(?:[-–—|:]\s*)?(.+?)\s*$/;

  for (const line of lines) {
    const match = line.match(timestampRe);
    if (!match) continue;
    const start = parseTimestamp(match[1]);
    const name = stripHtml(match[2]);
    if (start === null || !name) continue;
    chapters.push({ start, name });
  }

  return normalizeChapters(chapters);
}

function chaptersFor(entry, metadata) {
  const manual = normalizeChapters(entry?.chapters);
  if (manual.length >= 2) return manual;
  const synced = chaptersFromDescription(metadata?.description || "");
  return synced.length >= 2 ? synced : [];
}

function durationSeconds(isoDuration) {
  const value = String(isoDuration || "").trim();
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) return null;
  const total = Math.round(
    Number(match[1] || 0) * 86400 +
    Number(match[2] || 0) * 3600 +
    Number(match[3] || 0) * 60 +
    Number(match[4] || 0)
  );
  return total > 0 ? total : null;
}

function featuredGamesFor(entry, metadata, gamesBySlug, games) {
  const selected = [];
  const seen = new Set();
  const add = (game) => {
    if (!game || seen.has(game.slug)) return;
    seen.add(game.slug);
    selected.push(game);
  };

  for (const slug of Array.isArray(entry?.featuredGameSlugs) ? entry.featuredGameSlugs : []) {
    add(gamesBySlug.get(String(slug || "").trim()));
  }

  const source = normalizeSearchText([
    entry?.title,
    entry?.summary,
    entry?.description,
    metadata?.description
  ].filter(Boolean).join(" "));
  const paddedSource = ` ${source} `;

  const candidates = games
    .map((game) => ({ game, needle: normalizeSearchText(game.title) }))
    .filter(({ needle }) => needle.length >= 4)
    .sort((a, b) => b.needle.length - a.needle.length || a.game.title.localeCompare(b.game.title));

  for (const { game, needle } of candidates) {
    if (selected.length >= 30) break;
    if (paddedSource.includes(` ${needle} `)) add(game);
  }

  return selected.slice(0, 30);
}

function buildDiscoveryHtml(chapters, featuredGames, canonicalUrl) {
  if (!chapters.length && !featuredGames.length) {
    return '<p class="retro-video-page__guide-empty">Watch the full feature above, then continue through the related CCG pages below.</p>';
  }

  const panels = [];

  if (chapters.length) {
    const chapterItems = chapters.map((chapter) => {
      const time = formatTimestamp(chapter.start);
      const url = `${canonicalUrl}?t=${chapter.start}#watch-video`;
      return `<li><a class="retro-video-page__chapter-link" href="${escapeHtml(url)}" data-video-chapter="${chapter.start}"><span class="retro-video-page__chapter-time">${escapeHtml(time)}</span><span class="retro-video-page__chapter-name">${escapeHtml(chapter.name)}</span></a></li>`;
    }).join("\n");

    panels.push(`<div class="retro-video-page__discovery-panel${featuredGames.length ? "" : " retro-video-page__discovery-panel--wide"}"><h3 class="retro-video-page__discovery-title">Video chapters</h3><ol class="retro-video-page__chapters">${chapterItems}</ol></div>`);
  }

  if (featuredGames.length) {
    const gameItems = featuredGames.map((game) => (
      `<li><a class="retro-video-page__featured-game-link" href="/games/${escapeHtml(game.slug)}/">${escapeHtml(game.title)}</a></li>`
    )).join("\n");

    panels.push(`<div class="retro-video-page__discovery-panel${chapters.length ? "" : " retro-video-page__discovery-panel--wide"}"><h3 class="retro-video-page__discovery-title">Games linked in the CCG archive</h3><ul class="retro-video-page__featured-games">${gameItems}</ul></div>`);
  }

  return `<div class="retro-video-page__discovery">${panels.join("\n")}</div>`;
}

function replaceDiscoveryMarker(html, content) {
  const re = /(<!-- CCG_VIDEO_DISCOVERY_START -->)([\s\S]*?)(<!-- CCG_VIDEO_DISCOVERY_END -->)/;
  if (!re.test(html)) return html;
  return html.replace(re, `$1\n      ${content}\n      $3`);
}

function enhanceVideoObjectClips(html, chapters, canonicalUrl, metadata) {
  const scriptRe = /<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*data-ccg-schema=(["'])retro-video\2[^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(scriptRe);
  if (!match) return html;

  let object;
  try {
    object = JSON.parse(match[3].trim());
  } catch (error) {
    return html;
  }

  if (object?.["@type"] !== "VideoObject") return html;
  delete object.hasPart;

  if (verifiedMetadata(metadata) && chapters.length >= 2) {
    const totalDuration = durationSeconds(metadata.duration);
    object.hasPart = chapters.map((chapter, index) => {
      const next = chapters[index + 1];
      const clip = {
        "@type": "Clip",
        name: chapter.name,
        startOffset: chapter.start,
        url: `${canonicalUrl}?t=${chapter.start}`
      };
      const end = next?.start || totalDuration;
      if (Number.isFinite(end) && end > chapter.start) clip.endOffset = end;
      return clip;
    });
  }

  const json = JSON.stringify(object, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return html.replace(match[0], match[0].replace(match[3], `\n${json}\n`));
}

function buildCard(item) {
  return `<article class="video-library-card"><a class="video-library-card__link" href="${escapeHtml(item.url)}"><span class="video-library-card__media"><img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)} video thumbnail" loading="lazy" decoding="async" /><span class="video-library-card__badge">${escapeHtml(item.badge)}</span></span><span class="video-library-card__copy"><span class="video-library-card__title">${escapeHtml(item.title)}</span><span class="video-library-card__description">${escapeHtml(item.description)}</span><span class="video-library-card__meta">${item.platform ? `<span>${escapeHtml(item.platform)}</span>` : ""}${item.year ? `<span>${escapeHtml(item.year)}</span>` : ""}${!item.platform && item.collectionLabel ? `<span>${escapeHtml(item.collectionLabel)}</span>` : ""}</span></span></a></article>`;
}

function buildLibrarySchema(items) {
  const canonical = `${SITE_ORIGIN}/videos/`;
  const listed = items.slice(0, 50);
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#page`,
        url: canonical,
        name: "Commodore 64 & Amiga Video Library | Cheeky Commodore Gamer",
        description: "Browse Cheeky Commodore Gamer videos covering Commodore 64 and Amiga games, Zzap!64 awards, retro features, events and Amiga demo music.",
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Video Library", item: canonical }
        ]
      },
      {
        "@type": "ItemList",
        "@id": `${canonical}#videos`,
        numberOfItems: listed.length,
        itemListElement: listed.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.title,
          url: `${SITE_ORIGIN}${item.url}`
        }))
      }
    ]
  };

  return JSON.stringify(payload, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function ensureStaticRegistry() {
  const entries = readJson(staticPagesPath, []);
  if (!Array.isArray(entries)) fail("tools/seo/static-pages.json must contain an array.");
  const target = "videos/index.html";
  if (entries.includes(target)) return false;

  const insertAfter = entries.indexOf("home.html");
  if (insertAfter >= 0) entries.splice(insertAfter + 1, 0, target);
  else entries.push(target);
  return writeFileIfChanged(staticPagesPath, `${JSON.stringify(entries, null, 2)}\n`);
}

function buildGameLibraryItems(games, metadataById) {
  return games.flatMap((game) => {
    const videoId = videoIdFor(game);
    const slug = String(game?.slug || "").trim();
    if (!videoId || !slug) return [];
    const metadata = metadataById[videoId] || {};
    const platform = /amiga/i.test(String(game?.system || game?.platform || "")) ? "Amiga" : "Commodore 64";
    const filter = platform === "Amiga" ? "amiga" : "c64";
    const publisher = Array.isArray(game?.credits?.publisher)
      ? game.credits.publisher.join(", ")
      : String(game?.credits?.publisher || game?.publisher || "");

    return [{
      id: videoId,
      kind: "game",
      filter,
      badge: platform === "Amiga" ? "Amiga Game" : "C64 Game",
      title: stripHtml(metadata?.title || game?.title || "Retro game"),
      description: truncate(game?.description || `Watch ${game?.title || "this game"} on ${platform}.`, 190),
      url: `/games/${slug}/`,
      thumbnail: youtubeThumbnail(videoId, metadata),
      platform,
      year: game?.year || "",
      publisher: stripHtml(publisher),
      rating: Number(game?.ccg_rating || 0),
      uploadDate: String(metadata?.uploadDate || "")
    }];
  });
}

function buildRetroLibraryItems(metadataById) {
  const items = [];
  for (const config of DATASETS) {
    const entries = readJson(config.dataPath, []);
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (entry?.membersOnly === true) continue;
      const slug = normalizeRetroSlug(entry, config.label);
      const videoId = videoIdFor(entry);
      if (!slug || !videoId) continue;
      const metadata = metadataById[videoId] || {};
      items.push({
        id: videoId,
        kind: "retro",
        filter: config.label,
        badge: config.badge,
        title: stripHtml(metadata?.title || entry?.title || "Retro feature"),
        description: truncate(entry?.summary || entry?.description || "Cheeky Commodore Gamer video feature.", 190),
        url: `${config.pagePrefix}${slug}/`,
        thumbnail: youtubeThumbnail(videoId, metadata),
        platform: "",
        year: "",
        publisher: "",
        collectionLabel: config.collectionLabel,
        createdAt: String(entry?.created_at || ""),
        uploadDate: String(metadata?.uploadDate || "")
      });
    }
  }
  return items;
}

function sortAllItems(items) {
  return [...items].sort((a, b) => {
    const aDate = Date.parse(a.uploadDate || a.createdAt || "") || 0;
    const bDate = Date.parse(b.uploadDate || b.createdAt || "") || 0;
    if (aDate !== bDate) return bDate - aDate;
    if (a.kind !== b.kind) return a.kind === "retro" ? -1 : 1;
    if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
    return a.title.localeCompare(b.title);
  });
}

function enhanceRetroPages(games, metadataById) {
  const gamesBySlug = new Map(games.map((game) => [String(game?.slug || "").trim(), game]).filter(([slug]) => slug));
  let pagesUpdated = 0;
  let chapterPages = 0;
  let linkedGamePages = 0;

  for (const config of DATASETS) {
    const entries = readJson(config.dataPath, []);
    for (const entry of Array.isArray(entries) ? entries : []) {
      const slug = normalizeRetroSlug(entry, config.label);
      const videoId = videoIdFor(entry);
      if (!slug || !videoId) continue;
      const pagePath = path.join(config.outputDir, slug, "index.html");
      if (!fs.existsSync(pagePath)) continue;

      const metadata = metadataById[videoId] || {};
      const canonicalUrl = `${SITE_ORIGIN}${config.pagePrefix}${slug}/`;
      const chapters = entry?.membersOnly === true ? [] : chaptersFor(entry, metadata);
      const featuredGames = entry?.membersOnly === true ? [] : featuredGamesFor(entry, metadata, gamesBySlug, games);
      let html = fs.readFileSync(pagePath, "utf8");
      const before = html;
      html = replaceDiscoveryMarker(html, buildDiscoveryHtml(chapters, featuredGames, canonicalUrl));
      html = enhanceVideoObjectClips(html, chapters, canonicalUrl, metadata);

      if (html !== before && writeFileIfChanged(pagePath, html)) pagesUpdated += 1;
      if (chapters.length) chapterPages += 1;
      if (featuredGames.length) linkedGamePages += 1;
    }
  }

  return { pagesUpdated, chapterPages, linkedGamePages };
}

function main() {
  if (!fs.existsSync(templatePath)) fail("admin/templates/video-library-template.html is missing.");
  const gamesPayload = readJson(gamesPath, []);
  const games = Array.isArray(gamesPayload) ? gamesPayload : (gamesPayload.games || []);
  const metadataPayload = readJson(metadataPath, { videos: {} });
  const metadataById = metadataPayload?.videos && typeof metadataPayload.videos === "object"
    ? metadataPayload.videos
    : {};

  const retroStats = enhanceRetroPages(games, metadataById);
  const gameItems = buildGameLibraryItems(games, metadataById);
  const retroItems = buildRetroLibraryItems(metadataById);
  const allItems = sortAllItems([...retroItems, ...gameItems]);
  if (!allItems.length) fail("No public video items were found for the CCG video library.");

  const featured = [...retroItems]
    .sort((a, b) => (Date.parse(b.uploadDate || b.createdAt || "") || 0) - (Date.parse(a.uploadDate || a.createdAt || "") || 0))
    .slice(0, 6);
  const initial = allItems.slice(0, 48);
  const template = readTemplate(templatePath);
  const html = applyTemplate(template, {
    SCHEMA_JSON: buildLibrarySchema(allItems),
    VIDEO_TOTAL: String(allItems.length),
    GAME_VIDEO_TOTAL: String(gameItems.length),
    RETRO_VIDEO_TOTAL: String(retroItems.length),
    C64_VIDEO_TOTAL: String(gameItems.filter((item) => item.filter === "c64").length),
    AMIGA_VIDEO_TOTAL: String(gameItems.filter((item) => item.filter === "amiga").length),
    INITIAL_RESULT_COUNT: String(initial.length),
    FEATURED_CARDS: featured.map(buildCard).join("\n"),
    INITIAL_CARDS: initial.map(buildCard).join("\n")
  });

  writeFileIfChanged(outputHtmlPath, html);
  writeFileIfChanged(outputIndexPath, `${JSON.stringify({
    version: 1,
    counts: {
      total: allItems.length,
      gameVideos: gameItems.length,
      retroVideos: retroItems.length,
      c64GameVideos: gameItems.filter((item) => item.filter === "c64").length,
      amigaGameVideos: gameItems.filter((item) => item.filter === "amiga").length
    },
    items: allItems.map(({ rating, uploadDate, createdAt, ...item }) => item)
  }, null, 2)}\n`);
  const registryUpdated = ensureStaticRegistry();

  console.log(`[video-library] Library entries: ${allItems.length} (${gameItems.length} game videos, ${retroItems.length} retro features).`);
  console.log(`[video-library] Retro pages updated with discovery markup: ${retroStats.pagesUpdated}.`);
  console.log(`[video-library] Retro pages with chapters: ${retroStats.chapterPages}.`);
  console.log(`[video-library] Retro pages with linked game pages: ${retroStats.linkedGamePages}.`);
  console.log(`[video-library] Static page registry ${registryUpdated ? "updated" : "already current"}.`);
}

if (require.main === module) main();

module.exports = {
  chaptersFor,
  chaptersFromDescription,
  featuredGamesFor,
  normalizeChapters,
  parseTimestamp
};
