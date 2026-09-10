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

const normalizeThumbnail = (value) => text(value).replace(/^\/+/, "");

const normalizeGame = (game) => {
  const system = text(game.system, "Unknown system");
  return {
    system,
    systemLabel: system.toUpperCase(),
    slug: text(game.slug),
    title: text(game.title, "Untitled game"),
    year: game.year || null,
    genres: list(game.genres),
    thumbnail: normalizeThumbnail(game.thumbnail),
    description: text(game.description, "Game information is being prepared for the lightweight prototype."),
    rating: rating(game.ccg_rating),
    ratingReason: text(game.ccg_rating_reason),
    publishers: list(game.credits?.publisher),
    videoId: text(game.videoid)
  };
};

// Prototype safety boundary: read only from the canonical game database and expose
// a small deterministic slice while templates and URLs are validated.
export default source
  .filter((game) => game && text(game.slug) && text(game.title))
  .slice(0, 12)
  .map(normalizeGame);
