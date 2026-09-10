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
  for (const rawPublisher of game.publishers) {
    const name = rawPublisher.trim();
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
  .map((publisher) => {
    const slug = slugify(publisher.name);
    if (!slug) {
      throw new Error(`[ccg-eleventy] Cannot generate publisher slug for: ${publisher.name}`);
    }

    const owner = slugOwners.get(slug);
    if (owner && owner !== publisher.name) {
      throw new Error(`[ccg-eleventy] Publisher slug collision: "${owner}" and "${publisher.name}" -> ${slug}`);
    }
    slugOwners.set(slug, publisher.name);

    return {
      ...publisher,
      slug,
      games: publisher.games.toSorted((a, b) => a.title.localeCompare(b.title, "en-GB"))
    };
  })
  .toSorted((a, b) => a.name.localeCompare(b.name, "en-GB"));

export default {
  count: items.length,
  items
};
