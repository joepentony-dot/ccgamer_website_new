import games from "./games.js";

const collections = [
  {
    name: "Cartridge Games",
    slug: "cartridge-games",
    legacyUrl: "/games/collections/cartridge-games.html",
    description: "Commodore 64 cartridge releases represented in the existing CCG collection page.",
    gameSlugs: [
      "attack-of-the-mutant-camels", "badlands", "batman-the-movie", "bcs-quest-for-tires",
      "choplifter", "congo-bongo", "crystal-castles", "the-activision-decathlon", "defender",
      "donkey-kong", "double-dragon", "fiendish-freddys-big-top-o-fun", "flimbos-quest",
      "fort-apocalypse", "gateway-to-apshai", "ghostbusters", "gorf", "hero",
      "international-soccer", "jumpman", "jungle-hunt", "jupiter-lander", "kickman", "klax"
    ]
  },
  {
    name: "Licensed Games",
    slug: "licensed-games",
    legacyUrl: "/games/collections/licensed-games.html",
    description: "Licensed C64 and Amiga games preserved from the existing CCG Licensed Games fallback markup.",
    gameSlugs: [
      "action-biker", "after-burner", "airwolf", "aladdin", "alien", "aliens-the-computer-game",
      "arachnophobia", "asterix-and-the-magic-cauldron", "back-to-the-future",
      "barry-mcguigan-world-championship-boxing", "batman-the-caped-crusader", "batman-the-movie",
      "bcs-quest-for-tires", "bc2-grogs-revenge", "below-the-root", "big-trouble-in-little-china",
      "blade-runner", "blockbusters", "brian-jacks-superstar-challenge", "bruce-lee", "cobra",
      "dan-dare-pilot-of-the-future", "dan-dare-2-mekons-revenge", "dan-dare-iii-the-escape"
    ]
  },
  { name: "BPjS and BPjM Indexed Games", slug: "bpjs-indexed-games", legacyUrl: "/games/collections/bpjs-indexed-games.html" },
  { name: "Top Picks", slug: "top-picks", legacyUrl: "/games/collections/top-picks.html" },
  { name: "Amiga Demo Music", slug: "amiga-demo-music", legacyUrl: "/games/collections/amiga-demo-music.html" },
  { name: "Retro Events", slug: "retro-events", legacyUrl: "/games/collections/retro-events.html" },
  { name: "Retro Specials", slug: "retro-specials", legacyUrl: "/games/collections/retro-specials.html" }
];

const gamesBySlug = new Map(games.map((game) => [game.slug, game]));

const items = collections.map((collection) => {
  if (!collection.gameSlugs) {
    return { ...collection, migrated: false, games: [] };
  }

  const missing = collection.gameSlugs.filter((slug) => !gamesBySlug.has(slug));
  if (missing.length) {
    throw new Error(`[ccg-eleventy] Collection ${collection.name} references missing game slugs: ${missing.join(", ")}`);
  }

  return {
    ...collection,
    migrated: true,
    games: collection.gameSlugs.map((slug) => gamesBySlug.get(slug))
  };
});

export default {
  count: items.length,
  migratedCount: items.filter((item) => item.migrated).length,
  items,
  cartridge: items.find((item) => item.slug === "cartridge-games"),
  licensed: items.find((item) => item.slug === "licensed-games")
};
