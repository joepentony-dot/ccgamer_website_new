import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import collectionArchive from "./collectionArchive.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, "../../../games/collections/retro-events.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source)) {
  throw new Error("[ccg-eleventy] Amiga Demo Music source must be an array.");
}

const gatewayEntries = collectionArchive.amigaDemoMusic?.entries || [];
const musicRecords = source
  .filter((entry) => entry && typeof entry === "object" && entry.type === "demo_music")
  .map((entry) => ({
    id: typeof entry.id === "string" ? entry.id.trim() : "",
    youtubeId: typeof entry.youtubeId === "string" ? entry.youtubeId.trim() : "",
    youtubeUrl: typeof entry.url === "string" ? entry.url.trim() : "",
    membersOnly: entry.membersOnly === true,
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : null
  }))
  .filter((entry) => entry.id && entry.youtubeId && entry.youtubeUrl)
  .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

if (!gatewayEntries.length || gatewayEntries.length !== musicRecords.length) {
  throw new Error(
    `[ccg-eleventy] Amiga Demo Music route/video source mismatch: ${gatewayEntries.length} gateway routes and ${musicRecords.length} demo records.`
  );
}

const entries = gatewayEntries.map((entry, index) => {
  const record = musicRecords[index];
  const routeMatch = entry.url.match(/^\/amiga-demo-music\/([^/]+)\/$/);

  if (!routeMatch) {
    throw new Error(`[ccg-eleventy] Invalid Amiga Demo Music route: ${entry.url}`);
  }

  return {
    title: entry.title,
    url: entry.url,
    slug: routeMatch[1],
    youtubeId: record.youtubeId,
    youtubeUrl: record.youtubeUrl,
    membersOnly: record.membersOnly,
    order: record.order
  };
});

function assertUnique(label, values) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) {
    throw new Error(`[ccg-eleventy] Amiga Demo Music duplicate ${label}: ${[...new Set(duplicates)].join(", ")}`);
  }
}

assertUnique("routes", entries.map((entry) => entry.url));
assertUnique("YouTube IDs", entries.map((entry) => entry.youtubeId));

export default {
  name: "Amiga Demo Music",
  description: "Classic Commodore Amiga demoscene music features preserved through the established Cheeky Commodore Gamer archive routes.",
  count: entries.length,
  entries
};
