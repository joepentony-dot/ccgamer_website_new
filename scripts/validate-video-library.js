#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { normalizeRetroSlug, verifiedMetadata } = require("./generate-retro-video-seo");
const { chaptersFor } = require("./generate-video-library");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const gamesPath = path.join(repoRoot, "games", "games.json");
const metadataPath = path.join(repoRoot, "data", "video-metadata.json");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const libraryPath = path.join(repoRoot, "videos", "index.html");
const indexPath = path.join(repoRoot, "videos", "video-index.json");

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
  console.error(`[validate-video-library] ${message}`);
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

function schemaObjects(html) {
  const objects = [];
  for (const match of html.matchAll(/<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      objects.push(JSON.parse(match[2].trim()));
    } catch (error) {
      fail(`Invalid JSON-LD: ${error.message}`);
    }
  }
  return objects;
}

function findVideoObject(html) {
  return schemaObjects(html).find((object) => {
    const types = Array.isArray(object?.["@type"]) ? object["@type"] : [object?.["@type"]];
    return types.includes("VideoObject");
  });
}

function assertCanonicalLibraryShell(libraryHtml) {
  assert(libraryHtml.includes('data-ccg-static-shell="2026-08-19-v1"'), "Video Library is missing the canonical static shell marker.");
  assert(libraryHtml.includes('>Publishers</a>'), "Video Library canonical navigation is missing Publishers.");
  assert(libraryHtml.includes('>Music Hub</a>'), "Video Library canonical navigation is missing Music Hub.");
  assert(libraryHtml.includes('>Find Me a Game</a>'), "Video Library canonical navigation is missing Find Me a Game.");
  assert(libraryHtml.includes('>Zzap!64 Reviews &amp; Awards</a>'), "Video Library canonical navigation is missing Zzap!64 Reviews & Awards.");
  assert(libraryHtml.includes('>Install CCG App</a>'), "Video Library canonical navigation is missing Install CCG App.");
  assert(libraryHtml.includes('>About Me</a>'), "Video Library canonical navigation is missing About Me.");
  assert(libraryHtml.includes('>Contact</a>'), "Video Library canonical navigation is missing Contact.");
  assert(libraryHtml.includes('class="ccg-auth-slot" data-ccg-auth-pending="true"'), "Video Library is missing the canonical auth slot.");
  assert(libraryHtml.includes('data-ccg-auth-snapshot-bootstrap="true"'), "Video Library is missing the first-paint auth snapshot bootstrap.");
  assert(libraryHtml.includes('src="/js/ccg-header-auth-loader.js"'), "Video Library is missing the shared auth loader.");
  assert(libraryHtml.includes('src="/js/ccg-nav-fit.js"'), "Video Library is missing the shared nav-fit loader.");

  for (const socialClass of [
    'ccg-socials__icon--yt',
    'ccg-socials__icon--patreon',
    'ccg-socials__icon--paypal',
    'ccg-socials__icon--x',
    'ccg-socials__icon--fb',
    'ccg-socials__icon--discord'
  ]) {
    assert(libraryHtml.includes(socialClass), `Video Library is missing canonical social icon ${socialClass}.`);
  }
}

function main() {
  assert(fs.existsSync(libraryPath), "videos/index.html is missing. Run generate-video-library.js first.");
  assert(fs.existsSync(indexPath), "videos/video-index.json is missing. Run generate-video-library.js first.");

  const libraryHtml = fs.readFileSync(libraryPath, "utf8");
  assert(libraryHtml.includes('<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/videos/"'), "Video Library canonical is missing or incorrect.");
  assert(/<meta\b[^>]*name=(["'])robots\1[^>]*content=(["'])[^"']*index,follow/i.test(libraryHtml), "Video Library must be index,follow.");
  assert(libraryHtml.includes('/resources/css/video-library.css'), "Video Library stylesheet is missing.");
  assert(libraryHtml.includes('/js/video-library.js'), "Video Library script is missing.");
  assert(libraryHtml.includes('data-video-results'), "Video Library result grid is missing.");
  assertCanonicalLibraryShell(libraryHtml);

  const staticPages = readJson(staticPagesPath, []);
  assert(Array.isArray(staticPages) && staticPages.includes("videos/index.html"), "videos/index.html is not registered in tools/seo/static-pages.json.");

  const gamesPayload = readJson(gamesPath, []);
  const games = Array.isArray(gamesPayload) ? gamesPayload : (gamesPayload.games || []);
  const metadataPayload = readJson(metadataPath, { videos: {} });
  const metadata = metadataPayload?.videos && typeof metadataPayload.videos === "object" ? metadataPayload.videos : {};

  const expectedGameUrls = new Set(
    games
      .filter((game) => videoIdFor(game) && String(game?.slug || "").trim())
      .map((game) => `/games/${String(game.slug).trim()}/`)
  );

  const expectedRetroUrls = new Set();
  const restrictedRetroUrls = new Set();
  let chapterPages = 0;
  let clipPages = 0;

  for (const config of DATASETS) {
    const entries = readJson(config.dataPath, []);
    for (const entry of Array.isArray(entries) ? entries : []) {
      const slug = normalizeRetroSlug(entry, config.label);
      const videoId = videoIdFor(entry);
      if (!slug || !videoId) continue;
      const relativeUrl = `${config.pagePrefix}${slug}/`;
      const canonicalUrl = `${SITE_ORIGIN}${relativeUrl}`;
      if (entry?.membersOnly === true) restrictedRetroUrls.add(relativeUrl);
      else expectedRetroUrls.add(relativeUrl);

      const pagePath = path.join(config.outputDir, slug, "index.html");
      assert(fs.existsSync(pagePath), `${config.label}:${slug} generated page is missing.`);
      const html = fs.readFileSync(pagePath, "utf8");
      const iframeMatches = [...html.matchAll(new RegExp(`https://www\\.youtube-nocookie\\.com/embed/${videoId}`, "g"))];
      assert(iframeMatches.length === 1, `${config.label}:${slug} must expose exactly one primary YouTube player; found ${iframeMatches.length}.`);
      assert(html.includes('id="watch-video"'), `${config.label}:${slug} primary player is not anchored as #watch-video.`);
      assert(html.includes('/js/video-watch.js'), `${config.label}:${slug} is missing chapter deep-link support.`);
      assert(html.includes('<!-- CCG_VIDEO_DISCOVERY_START -->') && html.includes('<!-- CCG_VIDEO_DISCOVERY_END -->'), `${config.label}:${slug} discovery markers are missing.`);

      if (entry?.membersOnly === true) continue;
      const chapters = chaptersFor(entry, metadata[videoId] || {});
      if (chapters.length) {
        chapterPages += 1;
        const chapterLinks = [...html.matchAll(/data-video-chapter="(\d+)"/g)].map((match) => Number(match[1]));
        assert(chapterLinks.length === chapters.length, `${config.label}:${slug} chapter-link count mismatch.`);
        chapters.forEach((chapter, index) => {
          assert(chapterLinks[index] === chapter.start, `${config.label}:${slug} chapter ${index + 1} has the wrong start time.`);
          assert(html.includes(`${canonicalUrl}?t=${chapter.start}#watch-video`), `${config.label}:${slug} chapter ${index + 1} does not deep-link to the watch page.`);
        });
      }

      const videoObject = findVideoObject(html);
      if (verifiedMetadata(metadata[videoId] || {}) && chapters.length >= 2) {
        assert(videoObject, `${config.label}:${slug} verified chapter page is missing VideoObject.`);
        assert(Array.isArray(videoObject.hasPart), `${config.label}:${slug} verified chapter page is missing Clip hasPart markup.`);
        assert(videoObject.hasPart.length === chapters.length, `${config.label}:${slug} Clip count does not match chapter count.`);
        videoObject.hasPart.forEach((clip, index) => {
          assert(clip?.["@type"] === "Clip", `${config.label}:${slug} hasPart ${index + 1} is not a Clip.`);
          assert(clip.startOffset === chapters[index].start, `${config.label}:${slug} Clip ${index + 1} startOffset mismatch.`);
          assert(clip.url === `${canonicalUrl}?t=${chapters[index].start}`, `${config.label}:${slug} Clip ${index + 1} URL mismatch.`);
        });
        clipPages += 1;
      } else if (videoObject) {
        assert(!videoObject.hasPart, `${config.label}:${slug} exposes Clip markup without verified metadata and chapter support.`);
      }
    }
  }

  const indexPayload = readJson(indexPath, null);
  assert(indexPayload && Array.isArray(indexPayload.items), "videos/video-index.json must contain an items array.");
  const urls = indexPayload.items.map((item) => String(item?.url || ""));
  assert(new Set(urls).size === urls.length, "videos/video-index.json contains duplicate canonical URLs.");

  const expectedUrls = new Set([...expectedGameUrls, ...expectedRetroUrls]);
  assert(urls.length === expectedUrls.size, `Video index contains ${urls.length} entries; expected ${expectedUrls.size}.`);
  for (const url of expectedUrls) assert(urls.includes(url), `Video index is missing ${url}.`);
  for (const url of restrictedRetroUrls) assert(!urls.includes(url), `Members-only video unexpectedly appears in the public Video Library: ${url}.`);

  assert(indexPayload.counts?.total === expectedUrls.size, "Video index total count is incorrect.");
  assert(indexPayload.counts?.gameVideos === expectedGameUrls.size, "Video index game-video count is incorrect.");
  assert(indexPayload.counts?.retroVideos === expectedRetroUrls.size, "Video index retro-video count is incorrect.");

  console.log(`[validate-video-library] ${expectedUrls.size} public video library entries validated.`);
  console.log(`[validate-video-library] ${chapterPages} retro pages currently expose chapter links.`);
  console.log(`[validate-video-library] ${clipPages} verified VideoObjects currently expose Clip key moments.`);
  console.log(`[validate-video-library] ${restrictedRetroUrls.size} members-only retro videos remain excluded from the public library.`);
}

main();