import games from "./games.js";

const slugify = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const byName = new Map();

for (const game of games) {
  for (const rawGenre of game.genres) {
    const name = rawGenre.trim();
    if (!name) continue;

    const key = name.toLocaleLowerCase("en-GB");
    if (!byName.has(key)) {
      byName.set(key, { name, games: [] });
    }
    byName.get(key).games.push(game);
  }
}

const slugOwners = new Map();
const items = [...byName.values()]
  .map((genre) => {
    const slug = slugify(genre.name);
    if (!slug) {
      throw new Error(`[ccg-eleventy] Cannot generate genre slug for: ${genre.name}`);
    }

    const owner = slugOwners.get(slug);
    if (owner && owner !== genre.name) {
      throw new Error(`[ccg-eleventy] Genre slug collision: "${owner}" and "${genre.name}" -> ${slug}`);
    }
    slugOwners.set(slug, genre.name);

    return {
      ...genre,
      slug,
      games: genre.games.toSorted((a, b) => a.title.localeCompare(b.title, "en-GB"))
    };
  })
  .toSorted((a, b) => a.name.localeCompare(b.name, "en-GB"));

export default {
  count: items.length,
  items
};
