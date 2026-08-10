#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  normalizeRetroSlug,
  verifiedMetadata
} = require("./generate-retro-video-seo");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
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
  console.error(`[validate-retro-video-seo] ${message}`);
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

function schemaObjects(html) {
  const objects = [];
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      objects.push(JSON.parse(match[2].trim()));
    } catch (error) {
      fail(`Invalid JSON-LD found in retro page: ${error.message}`);
    }
  }
  return objects;
}

function videoObjects(html) {
  return schemaObjects(html).filter((object) => {
    const types = Array.isArray(object?.["@type"]) ? object["@type"] : [object?.["@type"]];
    return types.includes("VideoObject");
  });
}

function main() {
  const metadataPayload = readJson(metadataPath, { videos: {} });
  const metadata = metadataPayload?.videos && typeof metadataPayload.videos === "object"
    ? metadataPayload.videos
    : {};

  assert(fs.existsSync(sitemapPath), "sitemap-retro-videos.xml is missing. Run generate-retro-video-seo.js first.");
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  assert(sitemap.includes('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'), "Retro video sitemap is missing the Google video namespace.");

  const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const sitemapLocSet = new Set(sitemapLocs);
  assert(sitemapLocSet.size === sitemapLocs.length, "sitemap-retro-videos.xml contains duplicate watch-page URLs.");

  const expectedPublicLocs = new Set();
  let processed = 0;
  let verifiedObjects = 0;
  let privatePages = 0;

  for (const config of DATASETS) {
    const payload = readJson(config.dataPath, []);
    const entries = Array.isArray(payload) ? payload : [];

    for (const entry of entries) {
      const slug = normalizeRetroSlug(entry, config.label);
      const videoId = videoIdFor(entry);
      if (!slug || !videoId) continue;

      const pagePath = path.join(config.outputDir, slug, "index.html");
      assert(fs.existsSync(pagePath), `${config.label}:${slug} is missing its canonical index.html page.`);
      const canonicalUrl = `${SITE_ORIGIN}${config.pagePrefix}${slug}/`;
      const html = fs.readFileSync(pagePath, "utf8");
      const isPublic = entry?.membersOnly !== true;
      const record = metadata[videoId] || {};

      assert(
        html.includes(`<link rel="canonical" href="${canonicalUrl}"`),
        `${config.label}:${slug} canonical URL is missing or incorrect.`
      );
      assert(/data-ccg-video-watch=(["'])true\1/i.test(html), `${config.label}:${slug} is not marked as a dedicated video watch page.`);
      assert(/data-ccg-primary-video=(["'])true\1/i.test(html), `${config.label}:${slug} primary video iframe marker is missing.`);
      assert(
        html.includes(`https://www.youtube-nocookie.com/embed/${videoId}`),
        `${config.label}:${slug} does not expose its YouTube player statically in the page HTML.`
      );

      const robotsTag = (html.match(/<meta\b[^>]*name\s*=\s*(["'])robots\1[^>]*>/i) || [])[0] || "";
      if (isPublic) {
        assert(!/noindex/i.test(robotsTag), `${config.label}:${slug} is public but has noindex.`);
        assert(/max-video-preview:-1/i.test(robotsTag), `${config.label}:${slug} does not allow full video previews.`);
        expectedPublicLocs.add(canonicalUrl);
      } else {
        privatePages += 1;
        assert(/noindex/i.test(robotsTag), `${config.label}:${slug} is members-only but is not noindex.`);
        assert(!sitemapLocSet.has(canonicalUrl), `${config.label}:${slug} is members-only but appears in the public retro video sitemap.`);
      }

      const objects = videoObjects(html);
      if (verifiedMetadata(record)) {
        assert(objects.length === 1, `${config.label}:${slug} has verified metadata but does not contain exactly one VideoObject.`);
        const object = objects[0];
        assert(object.name, `${config.label}:${slug} VideoObject is missing name.`);
        assert(object.description, `${config.label}:${slug} VideoObject is missing description.`);
        assert(object.thumbnailUrl, `${config.label}:${slug} VideoObject is missing thumbnailUrl.`);
        assert(object.uploadDate === record.uploadDate, `${config.label}:${slug} VideoObject uploadDate does not match verified YouTube metadata.`);
        assert(object.embedUrl === `https://www.youtube.com/embed/${videoId}`, `${config.label}:${slug} VideoObject embedUrl is incorrect.`);
        assert(object.url === canonicalUrl, `${config.label}:${slug} VideoObject URL does not match the canonical watch page.`);
        verifiedObjects += 1;
      } else {
        assert(objects.length === 0, `${config.label}:${slug} contains VideoObject markup without a verified YouTube upload date.`);
      }

      processed += 1;
    }
  }

  assert(
    sitemapLocSet.size === expectedPublicLocs.size,
    `sitemap-retro-videos.xml contains ${sitemapLocSet.size} URLs; expected ${expectedPublicLocs.size}.`
  );
  for (const loc of expectedPublicLocs) {
    assert(sitemapLocSet.has(loc), `sitemap-retro-videos.xml is missing ${loc}.`);
  }

  const videoBlocks = [...sitemap.matchAll(/<video:video>[\s\S]*?<\/video:video>/g)].map((match) => match[0]);
  assert(videoBlocks.length === expectedPublicLocs.size, "Retro video sitemap video block count does not match its URL count.");
  for (const block of videoBlocks) {
    assert(/<video:thumbnail_loc>[^<]+<\/video:thumbnail_loc>/.test(block), "A retro video sitemap entry is missing thumbnail_loc.");
    assert(/<video:title>[^<]+<\/video:title>/.test(block), "A retro video sitemap entry is missing title.");
    assert(/<video:description>[^<]+<\/video:description>/.test(block), "A retro video sitemap entry is missing description.");
    assert(/<video:player_loc>[^<]+<\/video:player_loc>/.test(block), "A retro video sitemap entry is missing player_loc.");
  }

  console.log(`[validate-retro-video-seo] ${processed} generated video detail pages validated.`);
  console.log(`[validate-retro-video-seo] ${expectedPublicLocs.size} public watch pages validated in sitemap-retro-videos.xml.`);
  console.log(`[validate-retro-video-seo] ${verifiedObjects} verified VideoObjects validated.`);
  console.log(`[validate-retro-video-seo] ${privatePages} members-only pages confirmed noindex and excluded from the public video sitemap.`);
}

main();
