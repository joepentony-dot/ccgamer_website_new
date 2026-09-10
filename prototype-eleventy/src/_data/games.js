import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, "../../../games/games.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

// Prototype safety boundary: read only from the canonical game database and expose
// a small deterministic slice while templates and URLs are validated.
export default source
  .filter((game) => game && game.slug && game.title)
  .slice(0, 12)
  .map((game) => ({
    system: game.system,
    slug: game.slug,
    title: game.title,
    year: game.year,
    genres: Array.isArray(game.genres) ? game.genres : [],
    thumbnail: game.thumbnail,
    description: game.description,
    rating: game.ccg_rating,
    ratingReason: game.ccg_rating_reason,
    publishers: Array.isArray(game.credits?.publisher) ? game.credits.publisher : [],
    videoId: game.videoid || ""
  }));
