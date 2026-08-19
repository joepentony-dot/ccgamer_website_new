#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHECK_ONLY = process.argv.includes("--check");
const SITE = "Cheeky Commodore Gamer";
const ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const STYLE = "/resources/css/ccg-category-omega.css";
const SCRIPT = "/js/ccg-category-omega.js";

const genres = {
  "action-adventure-games.html": ["Action Adventure", "Explore C64 and Amiga action-adventure games, combining exploration, combat, puzzles and arcade action across classic Commodore releases.", "Exploration, danger and arcade action across sprawling Commodore worlds."],
  "adventure-games.html": ["Adventure", "Browse C64 and Amiga adventure games, from text and graphic adventures to point-and-click classics, mysteries and story-led Commodore games.", "Mysteries, conversations and unforgettable worlds built for curious players."],
  "arcade-games.html": ["Arcade", "Browse C64 and Amiga arcade games, including coin-op conversions, score attacks and fast arcade-style Commodore classics.", "High-score chasing, reflex tests and coin-op spirit on C64 and Amiga."],
  "casino-games.html": ["Casino Games", "Explore C64 and Amiga casino games, including poker, blackjack, roulette, fruit machines and other gambling-themed Commodore releases.", "Cards, tables and computerised wagers from the Commodore era."],
  "fighting-games.html": ["Fighting Games", "Browse C64 and Amiga fighting games, from one-on-one martial arts contests to scrolling beat 'em ups and arcade conversions.", "One-on-one battles, scrolling brawlers and joystick-testing rivalries."],
  "horror-games.html": ["Horror Games", "Explore C64 and Amiga horror games, including survival, gothic, monster and supernatural titles from the classic Commodore years.", "Dark mansions, monsters and uneasy nights in the Commodore archive."],
  "miscellaneous.html": ["Miscellaneous Games", "Browse unusual C64 and Amiga games that sit outside the main genres, including experimental, novelty and hybrid Commodore releases.", "The unusual, experimental and hard-to-file corners of C64 and Amiga gaming."],
  "platform-games.html": ["Platform Games", "Browse C64 and Amiga platform games, from single-screen classics to scrolling platform adventures and mascot-era favourites.", "Ladders, ledges, precision jumps and scrolling worlds from two generations of Commodore hardware."],
  "puzzle-games.html": ["Puzzle Games", "Browse C64 and Amiga puzzle games, including logic games, tile puzzlers, action puzzles and classic brain-teasers for Commodore computers.", "Logic, timing and brain-teasers where the next move matters more than the trigger finger."],
  "quiz-games.html": ["Quiz Games", "Browse C64 and Amiga quiz games, including trivia, game-show adaptations and question-based Commodore releases.", "Trivia, game-show formats and questions that test more than joystick reflexes."],
  "racing-games.html": ["Racing Games", "Browse C64 and Amiga racing games, from arcade racers and road battles to Formula One, rally and driving simulations across the Commodore era.", "Arcade speed, road battles and driving simulations across C64 and Amiga."],
  "role-playing-games.html": ["Role-Playing Games", "Browse C64 and Amiga role-playing games, including dungeon crawlers, fantasy RPGs, party adventures and character-driven Commodore classics.", "Stats, quests, party building and long-form adventures across classic Commodore worlds."],
  "shooting-games.html": ["Shooting Games", "Browse C64 and Amiga shooting games, including shoot 'em ups, run-and-gun action, space combat and arcade shooters.", "Shoot 'em ups, run-and-gun action and relentless arcade firepower."],
  "sports-games.html": ["Sports Games", "Browse C64 and Amiga sports games, including football, athletics, golf, boxing, tennis and other classic Commodore sporting releases.", "Football, athletics, golf, boxing and more from the home-computer sporting years."],
  "strategy-games.html": ["Strategy Games", "Browse C64 and Amiga strategy games, including tactical battles, management games, simulations and long-form strategic Commodore classics.", "Planning, resources and long battles where thinking ahead wins the day."]
};

const collections = {
  "cartridge-games.html": ["Cartridge Games", "Explore Commodore 64 cartridge games, from early releases to later C64GS-era cartridges and fast-loading editions in the CCG archive.", "Instant-loading cartridge releases from the Commodore 64 library."],
  "licensed-games.html": ["Licensed Games", "Browse licensed C64 and Amiga games based on films, television, comics, celebrities and other major entertainment properties.", "Film, TV, comic and celebrity licences brought to C64 and Amiga."],
  "bpjs-indexed-games.html": ["BPjS & BPjM Indexed Games", "Explore BPjS and BPjM indexed Commodore 64 and Amiga games collected into one specialist CCG archive route.", "A specialist indexed slice of the CCG Commodore game archive."],
  "top-picks.html": ["CCG Top Picks", "Browse Cheeky Commodore Gamer's selected C64 and Amiga favourites, bringing together standout Commodore games from across the archive.", "Selected C64 and Amiga favourites from across the Cheeky Commodore Gamer archive."],
  "amiga-demo-music.html": ["Amiga Demo Music", "Explore Amiga demo music, tracker modules and scene composers through the Cheeky Commodore Gamer Amiga music archive.", "Trackers, modules and scene music celebrating the Amiga demo tradition."],
  "retro-events.html": ["Retro Events", "Explore retro gaming events, shows and exhibitions covered by Cheeky Commodore Gamer, with a focus on Commodore 64, Amiga and classic computing.", "Shows, exhibitions and gatherings connected to the wider retro-computing scene."],
  "retro-specials.html": ["Retro Specials", "Browse C64 and Amiga retro specials from Cheeky Commodore Gamer, including rankings, magazine retrospectives, publisher features and long-form Commodore archive projects.", "Long-form C64 and Amiga features, rankings, magazine history and archive projects."]
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceTitle(html, title) {
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    : html.replace(/<\/head>/i, `  <title>${escapeHtml(title)}</title>\n</head>`);
}

function upsertMeta(html, attr, key, content) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta\\s+[^>]*${attr}=["']${escapedKey}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function ensureAsset(html, type, url) {
  if (html.includes(url)) return html;
  const tag = type === "style"
    ? `<link rel="stylesheet" href="${url}" data-ccg-category-omega-style>`
    : `<script src="${url}" defer data-ccg-category-omega-script></script>`;
  return type === "style"
    ? html.replace(/<\/head>/i, `  ${tag}\n</head>`)
    : html.replace(/<\/body>/i, `${tag}\n</body>`);
}

function replaceClassElement(html, tag, className, value) {
  const re = new RegExp(`<${tag}([^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*)>[\\s\\S]*?<\\/${tag}>`, "i");
  return re.test(html) ? html.replace(re, `<${tag}$1>${escapeHtml(value)}</${tag}>`) : html;
}

function replaceFirstIntro(html, value) {
  const re = /<p([^>]*class=["'][^"']*\bccg-section__intro\b(?![^"']*(?:ccg-section__intro-links|ccg-collection-intro-links))[^"']*["'][^>]*)>[\s\S]*?<\/p>/i;
  return re.test(html) ? html.replace(re, `<p$1>${escapeHtml(value)}</p>`) : html;
}

function categorySchema({ canonical, name, description, kind }) {
  const parentName = kind === "genre" ? "Genres" : "Collections";
  const parentUrl = kind === "genre" ? `${ORIGIN}/games/genres/` : `${ORIGIN}/games/collections/`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#ccg-category`,
        url: canonical,
        name: kind === "genre" ? `${name} Games on Commodore 64 and Amiga` : `${name} – Commodore 64 and Amiga`,
        description,
        isPartOf: { "@type": "WebSite", name: SITE, url: `${ORIGIN}/` },
        about: [
          { "@type": "Thing", name: "Commodore 64" },
          { "@type": "Thing", name: "Amiga" },
          { "@type": "Thing", name }
        ]
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Games", item: `${ORIGIN}/games/` },
          { "@type": "ListItem", position: 3, name: parentName, item: parentUrl },
          { "@type": "ListItem", position: 4, name, item: canonical }
        ]
      }
    ]
  });
}

function upsertSchema(html, schema) {
  const block = `<!-- CCG CATEGORY OMEGA SCHEMA START -->\n<script type="application/ld+json" data-ccg-category-static-schema>${schema}</script>\n<!-- CCG CATEGORY OMEGA SCHEMA END -->`;
  const re = /<!-- CCG CATEGORY OMEGA SCHEMA START -->[\s\S]*?<!-- CCG CATEGORY OMEGA SCHEMA END -->/i;
  return re.test(html) ? html.replace(re, block) : html.replace(/<\/head>/i, `  ${block}\n</head>`);
}

function canonicalFromHtml(html, fallback) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return match?.[1] || fallback;
}

function upgradeFile(relativePath, tuple, kind) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing category page: ${relativePath}`);
  const before = fs.readFileSync(filePath, "utf8");
  const [name, description, tagline] = tuple;
  const subject = name.replace(/ Games$/i, "");
  const title = kind === "genre" ? `${subject} Games on C64 & Amiga | ${SITE}` : `${name} – C64 & Amiga | ${SITE}`;
  const h1 = kind === "genre" ? `${subject} Games on Commodore 64 & Amiga` : `${name} – C64 & Amiga`;
  const canonical = canonicalFromHtml(before, `${ORIGIN}/${relativePath.replace(/\\/g, "/")}`);

  let html = before;
  html = replaceTitle(html, title);
  html = upsertMeta(html, "name", "description", description);
  html = upsertMeta(html, "name", "robots", "index,follow");
  html = upsertMeta(html, "property", "og:title", title);
  html = upsertMeta(html, "property", "og:description", description);
  html = upsertMeta(html, "property", "og:type", "website");
  html = upsertMeta(html, "name", "twitter:card", "summary_large_image");
  html = upsertMeta(html, "name", "twitter:title", title);
  html = upsertMeta(html, "name", "twitter:description", description);
  html = ensureAsset(html, "style", STYLE);
  html = ensureAsset(html, "script", SCRIPT);
  html = upsertSchema(html, categorySchema({ canonical, name, description, kind }));
  html = replaceClassElement(html, "h1", "ccg-genre-hero__title", h1);
  html = replaceClassElement(html, "p", "ccg-genre-hero__tagline", tagline);
  html = replaceFirstIntro(html, description);

  if (html === before) return false;
  if (!CHECK_ONLY) fs.writeFileSync(filePath, html, "utf8");
  return true;
}

function upgradeGenreIndex() {
  const relativePath = "games/genres/index.html";
  const filePath = path.join(ROOT, relativePath);
  const before = fs.readFileSync(filePath, "utf8");
  const title = `C64 & Amiga Games by Genre | ${SITE}`;
  const description = "Browse Commodore 64 and Amiga games by genre, including racing, arcade, adventure, platform, shooting, strategy, RPG, puzzle, sports and more.";
  let html = before;
  html = replaceTitle(html, title);
  html = upsertMeta(html, "name", "description", description);
  html = upsertMeta(html, "name", "robots", "index,follow");
  html = upsertMeta(html, "property", "og:title", title);
  html = upsertMeta(html, "property", "og:description", description);
  html = upsertMeta(html, "name", "twitter:title", title);
  html = upsertMeta(html, "name", "twitter:description", description);
  html = ensureAsset(html, "style", STYLE);
  html = ensureAsset(html, "script", SCRIPT);
  html = replaceClassElement(html, "h1", "ccg-hero-title", "C64 & Amiga Games by Genre");
  html = replaceClassElement(html, "p", "ccg-hero-tagline", "Choose a genre and explore Commodore 64 and Amiga games across the CCG archive.");
  if (html !== before && !CHECK_ONLY) fs.writeFileSync(filePath, html, "utf8");
  return html !== before;
}

function upgradeCollectionsIndex() {
  const relativePath = "games/collections/index.html";
  const filePath = path.join(ROOT, relativePath);
  const before = fs.readFileSync(filePath, "utf8");
  let html = before;
  html = ensureAsset(html, "style", STYLE);
  html = ensureAsset(html, "script", SCRIPT);
  if (html !== before && !CHECK_ONLY) fs.writeFileSync(filePath, html, "utf8");
  return html !== before;
}

const changed = [];
if (upgradeGenreIndex()) changed.push("games/genres/index.html");
Object.entries(genres).forEach(([file, tuple]) => {
  const relative = `games/genres/${file}`;
  if (upgradeFile(relative, tuple, "genre")) changed.push(relative);
});
if (upgradeCollectionsIndex()) changed.push("games/collections/index.html");
Object.entries(collections).forEach(([file, tuple]) => {
  const relative = `games/collections/${file}`;
  if (upgradeFile(relative, tuple, "collection")) changed.push(relative);
});

if (CHECK_ONLY && changed.length) {
  console.error("Category Omega generated pages are stale:");
  changed.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log(`Category Omega ${CHECK_ONLY ? "check" : "generation"} complete: ${changed.length} file(s) ${CHECK_ONLY ? "would change" : "updated"}.`);
