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
  {
    name: "BPjS and BPjM Indexed Games",
    slug: "bpjs-indexed-games",
    legacyUrl: "/games/collections/bpjs-indexed-games.html",
    description: "BPjS and BPjM indexed C64 and Amiga games preserved from the existing CCG collection fallback markup.",
    gameSlugs: [
      "1942", "airborne-ranger", "army-moves", "barbarian-the-ultimate-warrior", "battle-chess",
      "beach-head", "beach-head-2", "blood-n-guts", "blue-max", "brutal-sports-football",
      "cannon-fodder", "cobra", "commando", "falcon-patrol", "fernandez-must-die",
      "friday-the-13th", "golden-axe", "green-beret", "gryzor", "highlander", "ikari-warriors",
      "infernal-runner", "into-the-eagles-nest", "joe-blade"
    ]
  },
  {
    name: "Top Picks",
    slug: "top-picks",
    legacyUrl: "/games/collections/top-picks.html",
    description: "Cheeky Commodore Gamer favourites preserved from the existing Top Picks fallback markup.",
    gameSlugs: [
      "ace-of-aces", "airborne-ranger", "aliens-the-computer-game", "alter-ego", "american-3d-pool",
      "another-world", "apollo-18-mission-to-the-moon", "arcade-pool", "archon-the-light-and-the-dark",
      "arkanoid", "aztec-challenge", "bangkok-knights", "barbarian-the-ultimate-warrior",
      "bcs-quest-for-tires", "beach-head", "black-hawk", "bloodwych", "bruce-lee", "bubble-bobble",
      "bullys-sporting-darts", "cannon-fodder", "choplifter", "civilization", "commando"
    ]
  },
  {
    name: "Amiga Demo Music",
    slug: "amiga-demo-music",
    legacyUrl: "/games/collections/amiga-demo-music.html",
    description: "A lightweight gateway to the existing Amiga demo music archive, preserving the ten entries exposed by the current collection page.",
    entries: [
      { title: "9 Fingers - Spaceballs", url: "/amiga-demo-music/9-fingers-spaceballs/" },
      { title: "Hardwired - Crionics", url: "/amiga-demo-music/crionics-hardwired/" },
      { title: "Neverwhere - Cryonics", url: "/amiga-demo-music/cryonics-neverwhere/" },
      { title: "Desert Dream - Kefrens", url: "/amiga-demo-music/desert-dream-kefrens/" },
      { title: "Enigma - Phenomena", url: "/amiga-demo-music/enigma-phenomena/" },
      { title: "Jesus on E's", url: "/amiga-demo-music/jesus-on-es/" },
      { title: "Odyssey - Alcatraz", url: "/amiga-demo-music/odyssey-alzatraz/" },
      { title: "Follow Me - Red Sector", url: "/amiga-demo-music/red-sector-folow-me/" },
      { title: "Sounds of Silents", url: "/amiga-demo-music/sounds-of-silents/" },
      { title: "State of the Art", url: "/amiga-demo-music/state-of-the-art/" }
    ]
  },
  { name: "Retro Events", slug: "retro-events", legacyUrl: "/games/collections/retro-events.html" },
  { name: "Retro Specials", slug: "retro-specials", legacyUrl: "/games/collections/retro-specials.html" }
];

const gamesBySlug = new Map(games.map((game) => [game.slug, game]));

const items = collections.map((collection) => {
  if (collection.entries) {
    return {
      ...collection,
      migrated: true,
      games: [],
      itemCount: collection.entries.length,
      itemLabel: "source-backed music entries"
    };
  }

  if (!collection.gameSlugs) {
    return { ...collection, migrated: false, games: [], itemCount: 0, itemLabel: "items" };
  }

  const missing = collection.gameSlugs.filter((slug) => !gamesBySlug.has(slug));
  if (missing.length) {
    throw new Error(`[ccg-eleventy] Collection ${collection.name} references missing game slugs: ${missing.join(", ")}`);
  }

  const collectionGames = collection.gameSlugs.map((slug) => gamesBySlug.get(slug));

  return {
    ...collection,
    migrated: true,
    games: collectionGames,
    itemCount: collectionGames.length,
    itemLabel: "source-backed games"
  };
});

export default {
  count: items.length,
  migratedCount: items.filter((item) => item.migrated).length,
  items,
  cartridge: items.find((item) => item.slug === "cartridge-games"),
  licensed: items.find((item) => item.slug === "licensed-games"),
  bpjs: items.find((item) => item.slug === "bpjs-indexed-games"),
  topPicks: items.find((item) => item.slug === "top-picks"),
  amigaDemoMusic: items.find((item) => item.slug === "amiga-demo-music")
};
