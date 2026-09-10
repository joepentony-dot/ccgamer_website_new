import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, "../../../games/games.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const text = (value, fallback = "") => {
  const result = typeof value === "string" ? value.trim() : "";
  return result || fallback;
};

const list = (value) => {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  const single = text(value);
  return single ? [single] : [];
};

const rating = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const year = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const normalizeThumbnail = (value) => text(value).replace(/^\/+/, "");

const normalizeGame = (game) => {
  const system = text(game.system, "Unknown system");
  return {
    system,
    systemLabel: system.toUpperCase(),
    slug: text(game.slug),
    title: text(game.title, "Untitled game"),
    year: year(game.year),
    genres: list(game.genres),
    thumbnail: normalizeThumbnail(game.thumbnail),
    description: text(game.description, "Game information is being prepared for the lightweight prototype."),
    rating: rating(game.ccg_rating),
    ratingReason: text(game.ccg_rating_reason),
    publishers: list(game.credits?.publisher),
    videoId: text(game.videoid)
  };
};

const seenSlugs = new Set();
const normalizedGames = [];

for (const game of source) {
  if (!game || typeof game !== "object") continue;

  const normalized = normalizeGame(game);
  if (!normalized.slug || !normalized.title) continue;

  // Duplicate slugs would generate the same output route. Keep the first canonical
  // record rather than allowing duplicate page writes in the prototype build.
  if (seenSlugs.has(normalized.slug)) {
    console.warn(`[ccg-eleventy] Skipping duplicate game slug: ${normalized.slug}`);
    continue;
  }

  seenSlugs.add(normalized.slug);
  normalizedGames.push(normalized);
}

// Prototype safety boundary: the complete normalized archive is now enabled, but
// this adapter remains read-only and never modifies the canonical games database.
export default normalizedGames;
