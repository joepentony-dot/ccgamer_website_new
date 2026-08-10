#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const retroDatasetPaths = [
  path.join(repoRoot, "data", "retro-specials.json"),
  path.join(repoRoot, "data", "retro-events.json"),
  path.join(repoRoot, "data", "amiga-demo-music.json")
];
const metadataPath = path.join(repoRoot, "data", "video-metadata.json");
const apiKey = String(process.env.YOUTUBE_API_KEY || "").trim();

function fail(message) {
  console.error(`[video-metadata] ${message}`);
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

function collectVideoIds() {
  const ids = new Set();

  const gamesPayload = readJson(gamesJsonPath, []);
  const games = Array.isArray(gamesPayload) ? gamesPayload : (gamesPayload.games || []);
  games.map(videoIdFor).filter(Boolean).forEach((id) => ids.add(id));

  for (const datasetPath of retroDatasetPaths) {
    const payload = readJson(datasetPath, []);
    const entries = Array.isArray(payload) ? payload : [];
    entries.map(videoIdFor).filter(Boolean).forEach((id) => ids.add(id));
  }

  return [...ids].sort();
}

function chunks(values, size) {
  const result = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

function bestThumbnail(snippet) {
  const thumbnails = snippet?.thumbnails || {};
  return String(
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  ).trim();
}

function normalizeRecord(item, existing = {}) {
  const uploadDate = String(item?.snippet?.publishedAt || existing.uploadDate || "").trim();
  const duration = String(item?.contentDetails?.duration || existing.duration || "").trim();
  const title = String(item?.snippet?.title || existing.title || "").trim();
  const description = String(item?.snippet?.description || existing.description || "").trim();
  const thumbnailUrl = bestThumbnail(item?.snippet) || String(existing.thumbnailUrl || "").trim();
  const channelTitle = String(item?.snippet?.channelTitle || existing.channelTitle || "").trim();

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(uploadDate ? { uploadDate } : {}),
    ...(duration ? { duration } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(channelTitle ? { channelTitle } : {}),
    verifiedBy: "youtube-data-api-v3"
  };
}

async function fetchBatch(ids) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CheekyCommodoreGamer-VideoMetadata/1.2"
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API returned ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function main() {
  if (!apiKey) {
    console.log("[video-metadata] YOUTUBE_API_KEY is not configured; leaving verified metadata unchanged.");
    return;
  }

  const ids = collectVideoIds();
  if (!ids.length) fail("No valid YouTube video IDs were found in games or retro video datasets.");

  const current = readJson(metadataPath, { version: 1, videos: {} });
  const videos = current?.videos && typeof current.videos === "object" ? { ...current.videos } : {};
  let found = 0;
  const missingFromYoutube = [];

  for (const batch of chunks(ids, 50)) {
    const payload = await fetchBatch(batch);
    const returned = new Map((payload.items || []).map((item) => [String(item.id || ""), item]));
    for (const id of batch) {
      const item = returned.get(id);
      if (!item) {
        missingFromYoutube.push(id);
        continue;
      }
      videos[id] = normalizeRecord(item, videos[id] || {});
      found += 1;
    }
  }

  const sortedVideos = Object.fromEntries(Object.entries(videos).sort(([a], [b]) => a.localeCompare(b)));
  const previousVideos = current?.videos && typeof current.videos === "object" ? current.videos : {};
  const source = "YouTube Data API v3. Verified title, description, thumbnail, uploadDate and duration support video discovery; uploadDate and duration are only emitted into VideoObject when verified here.";
  const changed = JSON.stringify(sortedVideos) !== JSON.stringify(previousVideos);

  if (changed || !fs.existsSync(metadataPath)) {
    const next = {
      version: 1,
      source,
      updatedAt: new Date().toISOString(),
      videos: sortedVideos
    };
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
    fs.writeFileSync(metadataPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`[video-metadata] Verified metadata changed; wrote ${found}/${ids.length} unique site videos.`);
  } else {
    console.log(`[video-metadata] Verified metadata unchanged for ${found}/${ids.length} unique site videos; no file rewrite needed.`);
  }
  if (missingFromYoutube.length) {
    console.warn(`[video-metadata] ${missingFromYoutube.length} video IDs were not returned by YouTube (private, removed or unavailable).`);
    console.warn(`[video-metadata] First IDs: ${missingFromYoutube.slice(0, 20).join(", ")}`);
  }
}

main().catch((error) => fail(error.stack || error.message));
