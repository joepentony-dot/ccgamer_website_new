import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import games from "./games.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const retroEventsPath = path.resolve(here, "../../../games/collections/retro-events.json");
const retroEventsSource = JSON.parse(fs.readFileSync(retroEventsPath, "utf8"));

if (!Array.isArray(retroEventsSource)) {
  throw new Error("[ccg-eleventy] Retro Events source must be an array.");
}

const retroEventEntries = retroEventsSource
  .filter((entry) => entry && typeof entry === "object" && entry.type !== "demo_music")
  .map((entry) => ({
    id: typeof entry.id === "string" ? entry.id.trim() : "",
    title: typeof entry.title === "string" ? entry.title.trim() : "",
    youtubeId: typeof entry.youtubeId === "string" ? entry.youtubeId.trim() : "",
    url: typeof entry.url === "string" ? entry.url.trim() : "",
    membersOnly: entry.membersOnly === true,
    badge: typeof entry.badge === "string" ? entry.badge.trim() : "",
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : null
  }))
  .filter((entry) => entry.id && entry.title && entry.url)
  .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

const retroSpecialEntries = [
  { title: "THE 50 ESSENTIAL COMMODORE 64 GAMES – Commodore 64 | Best C64 Games Ever", url: "/retro-specials/50-essential-commodore-64-games/", description: "50 essential Commodore 64 games that defined the system — the classics every C64 fan remembers." },
  { title: "50 Essential Amiga Games – Best Amiga Games Ever", url: "/retro-specials/50-essential-amiga-games/", description: "A countdown of 50 essential Amiga games, celebrating the titles that defined the platform." },
  { title: "Arcade Club Bury, Greater Manchester – Europe’s Largest Free-Play Arcade Visit", url: "/retro-specials/arcade-club-bury/", description: "Inside one of the UK’s biggest retro arcades — hundreds of machines, all free-play." },
  { title: "Hardest Commodore 64 Games Ever Made", url: "/retro-specials/hardest-commodore-64-games/", description: "The toughest C64 games ever made — brutal difficulty and no mercy." },
  { title: "Guru Meditation – Commodore Amiga Error That Became a Legend", url: "/retro-specials/guru-meditation-amiga/", description: "The famous Amiga error message that became part of gaming history." },
  { title: "Memories of the Commodore 64 – A Brother’s 1982 Retro Gaming Journey", url: "/retro-specials/commodore-64-memories-1982/", description: "A nostalgic look back at early Commodore 64 memories from the 1980s.", membersOnly: true },
  { title: "Retro Games Day – Gaming with Family from Amiga to PlayStation 5", url: "/retro-specials/retro-games-day-family-gaming/", description: "A relaxed family gaming day mixing retro classics with modern consoles.", membersOnly: true },
  { title: "TOP 15 Commodore 64 Games – Essential C64 Classics You Must Play", url: "/retro-specials/top-15-commodore-64-games/", description: "15 must-play Commodore 64 classics that still hold up today." },
  { title: "The SID Chip – Commodore 64 Sound Interface Device & 8-Bit Music Revolution", url: "/retro-specials/sid-chip-story/", description: "The iconic sound chip behind the Commodore 64’s unforgettable music." },
  { title: "X-Copy – The Ultimate Commodore Amiga Disk Copier Story (1988–1993)", url: "/retro-specials/x-copy-amiga-history/", description: "The story behind X-Copy and its place in Amiga history." },
  { title: "ZX Spectrum Memories – Rewinding 8-Bit History with Hodgy", url: "/retro-specials/zx-spectrum-memories-hodgy/", description: "Revisiting ZX Spectrum memories and the era that defined them.", membersOnly: true },
  { title: "C64 vs ZX Spectrum — The Truth About These Versions", url: "/retro-specials/c64-vs-zx-spectrum/", description: "Same games, different machines — see how C64 and Spectrum versions really compare." },
  { title: "My Favourite Arcade Games – Commodore 64 & Amiga Ports Reviewed", url: "/retro-specials/favourite-arcade-games-c64-amiga-ports/", description: "A personal look at favourite 80s arcade games and how they translated to the Commodore 64 and Amiga." },
  { title: "Banned C64 Games They Didn’t Want You To See", url: "/retro-specials/banned-c64-games-they-didnt-want-you-to-see/", description: "A look at controversial and banned Commodore 64 games from the 8-bit era." },
  { title: "Commodore 64 Budget Games – Incredible C64 Classics Under £3 (80s & 90s)", url: "/retro-specials/commodore-64-budget-games-under-3/", description: "A nostalgic look at Commodore 64 budget games and the affordable classics that delivered huge value for under £3." },
  { title: "Every Zzap!64 Gold Medal & Sizzler of 1985 | The Best Commodore 64 Games?", url: "/retro-specials/zzap64-gold-medals-sizzlers-1985/", description: "A month-by-month look at every Zzap!64 Gold Medal and Sizzler from 1985." },
  { title: "Every Zzap!64 Gold Medal & Sizzler of 1986 | The Best Commodore 64 Games?", url: "/retro-specials/zzap64-gold-medals-sizzlers-1986/", description: "Revisiting Zzap!64’s first full calendar year of Gold Medals and Sizzlers." },
  { title: "42 Best Commodore 64 Games of 1987? Every Zzap!64 Gold Medal, Sizzler & Silver Medal", url: "/retro-specials/zzap64-gold-medals-sizzlers-1987/", description: "Every Zzap!64 Commodore 64 Gold Medal, Sizzler and Silver Medal from 1987 revisited month by month." },
  { title: "Was 1988 the Year Zzap!64 Changed Forever? | 55 C64 & Amiga Award Winners", url: "/retro-specials/zzap64-gold-medals-sizzlers-1988/", description: "All 55 Zzap!64 award winners from 1988 revisited month by month across C64 and Amiga coverage." },
  { title: "Was Zzap!64 Too Harsh? The 20 Lowest-Scoring Commodore 64 Games", url: "/retro-specials/zzap64-20-lowest-scoring-commodore-64-games/", description: "The 20 lowest-scoring Commodore 64 games reviewed by Zzap!64, counting down from 10% to 3%." }
];

function assertUniqueEntryUrls(label, entries) {
  const duplicateUrls = entries
    .map((entry) => entry.url)
    .filter((url, index, urls) => urls.indexOf(url) !== index);

  if (duplicateUrls.length) {
    throw new Error(`[ccg-eleventy] ${label} contains duplicate URLs: ${[...new Set(duplicateUrls)].join(", ")}`);
  }
}

assertUniqueEntryUrls("Retro Events source", retroEventEntries);
assertUniqueEntryUrls("Retro Specials source-backed entries", retroSpecialEntries);

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
    itemLabel: "source-backed music entries",
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
  {
    name: "Retro Events",
    slug: "retro-events",
    legacyUrl: "/games/collections/retro-events.html",
    description: "Retro gaming events, visits and related CCG features preserved from the existing Retro Events JSON source.",
    itemLabel: "source-backed event entries",
    entries: retroEventEntries
  },
  {
    name: "Retro Specials",
    slug: "retro-specials",
    legacyUrl: "/games/collections/retro-specials.html",
    description: "C64, Amiga and wider retro feature videos preserved from the existing Retro Specials collection page.",
    itemLabel: "source-backed special entries",
    entries: retroSpecialEntries
  }
];

const gamesBySlug = new Map(games.map((game) => [game.slug, game]));

const items = collections.map((collection) => {
  if (collection.entries) {
    return {
      ...collection,
      migrated: true,
      games: [],
      itemCount: collection.entries.length,
      itemLabel: collection.itemLabel || "source-backed entries"
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
  amigaDemoMusic: items.find((item) => item.slug === "amiga-demo-music"),
  retroEvents: items.find((item) => item.slug === "retro-events"),
  retroSpecials: items.find((item) => item.slug === "retro-specials")
};
