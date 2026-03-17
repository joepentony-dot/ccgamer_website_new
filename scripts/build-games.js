const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const games = require("../games/games.json");

const MIN_ARCHIVE_CREDITS = 5;

const FEATURED_COMPOSERS = [
  { name: "Rob Hubbard", slug: "rob-hubbard" },
  { name: "Martin Galway", slug: "martin-galway" },
  { name: "Ben Daglish", slug: "ben-daglish" },
  { name: "Matt Gray", slug: "matt-gray" },
  { name: "David Whittaker", slug: "david-whittaker" },
  { name: "Jeroen Tel", slug: "jeroen-tel" },
  { name: "Fred Gray", slug: "fred-gray" },
  { name: "Chris Hülsbeck", slug: "chris-huelsbeck" }
];

const FEATURED_PROFILE_DATA = {
  "rob-hubbard": { seoTitle: "Rob Hubbard — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Rob Hubbard, including verified biographical details, major credits, and linked game pages on Cheeky Commodore Gamer.", shortBio: "Rob Hubbard is a British composer and programmer best known for his influential Commodore 64 game music in the 1980s. His best-known C64 credits include Commando, Monty on the Run and International Karate, and his work helped define what many players expect from classic SID soundtracks. He later worked across additional formats including the Amiga and received an honorary Doctor of Music from Abertay University." },
  "martin-galway": { seoTitle: "Martin Galway — C64 Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Martin Galway’s Commodore 64 music archive, including verified background details, major Ocean-era scores, and linked game pages.", shortBio: "Martin Galway is a British composer strongly associated with Commodore 64 and ZX Spectrum game music. He is especially remembered for Ocean-era scores and loader music, with standout C64 credits including Rambo: First Blood Part II, Wizball and Arkanoid loader music. His work is often cited among the most recognisable examples of classic 8-bit game audio." },
  "ben-daglish": { seoTitle: "Ben Daglish — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Ben Daglish, including verified biographical details, notable soundtrack credits, and linked game pages.", shortBio: "Ben Daglish was an English composer and musician whose work became a major part of 1980s home-computer gaming. He is best known for C64 music on titles such as The Last Ninja, Krakout and Deflektor, and he also composed for Amiga releases. Daglish remains one of the most celebrated names in classic game music." },
  "matt-gray": { seoTitle: "Matt Gray — C64 Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore Matt Gray’s Commodore 64 music archive, including verified background details, notable C64 credits, and linked game pages.", shortBio: "Matt Gray is a British producer and composer best known in retro gaming for his Commodore 64 music, especially the soundtrack to Last Ninja 2. He is also linked with C64-era work including Driller and Deliverance: Stormlord II. Beyond games, he later moved into mainstream music production while continuing to revisit and celebrate his classic C64 work." },
  "david-whittaker": { seoTitle: "David Whittaker — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of David Whittaker, including verified biographical details, major soundtrack credits, and linked game pages.", shortBio: "David Whittaker is an English video-game composer whose music spans many home computer formats from the 1980s and early 1990s. His best-known C64 work includes Lazy Jones and Glider Rider, while his broader catalogue also includes major Amiga-era titles such as Shadow of the Beast. His music for Lazy Jones later gained wider recognition through its connection to the dance track Kernkraft 400." },
  "jeroen-tel": { seoTitle: "Jeroen Tel — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Jeroen Tel, including verified background details, key credits, and linked game pages.", shortBio: "Jeroen Tel is a Dutch composer best known for prolific late-1980s and early-1990s computer game music. His popular C64 work includes Cybernoid II and Hawkeye, and he also built credits on other formats including the Amiga. Tel was also a founding member of Maniacs of Noise, one of the most recognisable names in European game-music history." },
  "fred-gray": { seoTitle: "Fred Gray — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Fred Gray, including verified credits, background details, and linked game pages.", shortBio: "Fred Gray is an English game-music composer known for work on Commodore 64 and Amiga releases. His C64 credits include Shadowfire and Mutants, while his Amiga work includes titles such as Black Lamp. Where precise public biographical details are limited, keep the page focused on verified game credits and the composer’s role in classic home-computer music." },
  "chris-huelsbeck": { seoTitle: "Chris Hülsbeck — C64 & Amiga Game Music Composer | Cheeky Commodore Gamer", metaDescription: "Explore the C64 and Amiga game music of Chris Hülsbeck, including verified biographical details, major soundtrack credits, and linked game pages.", shortBio: "Chris Hülsbeck is a German game-music composer widely known for European home computer soundtracks including The Great Giana Sisters and the Turrican series. His work spans both the Commodore 64 and Amiga eras, with titles such as Apidya also standing out in his catalogue. His official biography notes early piano study, a teenage start on Commodore 64, and a computer-music contest win that helped launch his career." }
};

const CANONICAL_NAME_MAP = {
  "rob hubbard": "Rob Hubbard",
  "r hubbard": "Rob Hubbard",
  "r. hubbard": "Rob Hubbard",
  "martin galway": "Martin Galway",
  "ben daglish": "Ben Daglish",
  "matt gray": "Matt Gray",
  "matthew del gray": "Matt Gray",
  "david whittaker": "David Whittaker",
  "jeroen tel": "Jeroen Tel",
  "fred gray": "Fred Gray",
  "chris huelsbeck": "Chris Hülsbeck",
  "chris hulsbeck": "Chris Hülsbeck",
  "chris hülsbeck": "Chris Hülsbeck",
  "christopher hülsbeck": "Chris Hülsbeck"
};

const FEATURED_BY_NAME = new Map(FEATURED_COMPOSERS.map((entry) => [normalizeComposerKey(entry.name), entry]));

function normalizeComposerKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function canonicalizeComposerName(value) {
  const key = normalizeComposerKey(value);
  if (!key) return "";
  if (CANONICAL_NAME_MAP[key]) return CANONICAL_NAME_MAP[key];
  return key.replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugifyComposer(name) {
  const featured = FEATURED_BY_NAME.get(normalizeComposerKey(name));
  if (featured) return featured.slug;
  return normalizeComposerKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normaliseMusicNames(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();
  return list.map((name) => String(name ?? "").trim())
    .filter(Boolean)
    .filter((name) => !/\.mp3$/i.test(name))
    .map(canonicalizeComposerName)
    .filter(Boolean)
    .filter((name) => {
      const key = normalizeComposerKey(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normaliseComposerNames(game) {
  const composers = [];
  if (Array.isArray(game?.composer)) composers.push(...game.composer);
  else if (game?.composer) composers.push(game.composer);
  if (Array.isArray(game?.credits?.musician)) composers.push(...game.credits.musician);
  else if (game?.credits?.musician) composers.push(game.credits.musician);
  if (Array.isArray(game?.music)) composers.push(...game.music);
  else if (game?.music) composers.push(game.music);
  return normaliseMusicNames(composers);
}

function normalisePublisherNames(game) {
  const publisherCredits = game?.credits?.publisher;
  const list = Array.isArray(publisherCredits)
    ? publisherCredits
    : (publisherCredits ? [publisherCredits] : (game?.publisher ? [game.publisher] : []));
  return normaliseMusicNames(list);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function writeFileIfChanged(filePath, content) {
  const previousContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previousContent === content) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

function buildComposerEntries(gamesList) {
  const composerGames = new Map();
  gamesList.forEach((game) => {
    normaliseComposerNames(game).forEach((name) => {
      if (!composerGames.has(name)) composerGames.set(name, []);
      composerGames.get(name).push({ slug: game.slug, title: game.title, year: game.year, thumbnail: game.thumbnail, system: game.system, platform: game.platform, computer: game.computer });
    });
  });

  return Array.from(composerGames.entries())
    .filter(([, list]) => list.length >= MIN_ARCHIVE_CREDITS)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, list]) => ({
      name,
      slug: slugifyComposer(name),
      featured: FEATURED_BY_NAME.has(normalizeComposerKey(name)),
      games: list.filter((game, index, arr) => arr.findIndex((entry) => entry.slug === game.slug) === index)
        .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")))
    }));
}

function renderComposerPage(entry) {
  const composerName = htmlEscape(entry.name);
  const composerSlugValue = htmlEscape(entry.slug);
  const profile = FEATURED_PROFILE_DATA[entry.slug];
  const title = profile?.seoTitle || `${entry.name} — C64 & Amiga Music Composer | Cheeky Commodore Gamer`;
  const description = profile?.metaDescription || `Explore C64 and Amiga games featuring music by ${entry.name}, with archive links back to each game page on Cheeky Commodore Gamer.`;
  const intro = profile?.shortBio || `${entry.name} appears across multiple game soundtracks in the Cheeky Commodore Gamer archive. Browse the full game list below.`;

  return `<!DOCTYPE html>
<html lang="en" data-ccg-page="music-composer">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${htmlEscape(title)}</title>
<meta name="description" content="${htmlEscape(description)}">
<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/music/${composerSlugValue}/">
<link rel="stylesheet" href="/resources/css/ccg-master.css">
<link rel="stylesheet" href="/resources/css/music-composer.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  <main class="ccg-main ccg-composer-page" data-composer-name="${composerName}" data-composer-slug="${composerSlugValue}">
    <nav class="ccg-composer-breadcrumbs" aria-label="Breadcrumb">
      <a href="/home.html">Home</a> › <a href="/games/index.html">Games</a> › <a href="/music/index.html">Music Hub</a>
    </nav>
    <h1 class="ccg-composer-title">${composerName} — C64 & Amiga Music</h1>
    <p class="ccg-composer-subtitle">Loading composer archive details…</p>
    <p class="ccg-composer-intro">${htmlEscape(intro)}</p>

    <div class="ccg-composer-nav" id="composer-nav-row"></div>

    <h2 class="ccg-composer-section-title">Games featuring ${composerName}</h2>
    <ul id="composer-games" class="ccg-composer-games">
      <li>Loading...</li>
    </ul>

    <section class="ccg-composer-featured" aria-labelledby="other-composers-heading">
      <h2 id="other-composers-heading" class="ccg-composer-section-title">Featured C64 & Amiga Composers</h2>
      <div id="composer-featured-list" class="ccg-composer-chip-list"></div>
    </section>

    <section class="ccg-composer-featured" aria-labelledby="all-composers-heading">
      <h2 id="all-composers-heading" class="ccg-composer-section-title">Full List Of Composers</h2>
      <div id="composer-all-list" class="ccg-composer-chip-list"></div>
    </section>
  </main>
  <script src="/js/music-composer-pages.js" defer></script>
</body>
</html>`;
}

function renderMusicIndexPage() {
  return `<!DOCTYPE html>
<html lang="en" data-ccg-page="music-hub">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>C64 & Amiga Music Hub | Cheeky Commodore Gamer</title>
<meta name="description" content="Browse featured and full-list C64 and Amiga game music composers with archive links to composer pages and game soundtracks on Cheeky Commodore Gamer.">
<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/music/">
<link rel="stylesheet" href="/resources/css/ccg-master.css">
<link rel="stylesheet" href="/resources/css/music-composer.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  <main class="ccg-main ccg-music-hub">
    <nav class="ccg-composer-breadcrumbs" aria-label="Breadcrumb">
      <a href="/home.html">Home</a> › <a href="/games/index.html">Games</a>
    </nav>
    <section class="ccg-music-hub__hero">
      <h1 class="ccg-composer-title">C64 & Amiga Music Hub</h1>
      <p class="ccg-composer-intro">Explore legendary home-computer composers and jump straight into linked game soundtrack archives.</p>
      <p class="ccg-composer-subtitle" id="music-hub-stats">Loading archive totals…</p>
    </section>

    <h2 class="ccg-composer-section-title">Featured C64 & Amiga Composers</h2>
    <div id="music-featured-composers" class="ccg-music-hub__grid"></div>

    <section class="ccg-music-hub__additional" aria-labelledby="additional-composers-title">
      <h2 id="additional-composers-title" class="ccg-composer-section-title">Full List Of Composers</h2>
      <div id="music-additional-composers" class="ccg-music-hub__grid"></div>
    </section>
  </main>
  <script src="/js/music-composer-pages.js" defer></script>
</body>
</html>`;
}

function cleanStaleComposerPages(composerEntries) {
  const musicDir = "music";
  if (!fs.existsSync(musicDir)) return;
  const activeFiles = new Set(composerEntries.map((entry) => `${entry.slug}.html`));
  fs.readdirSync(musicDir, { withFileTypes: true }).forEach((entry) => {
    if (entry.name === "index.html" || entry.name === "composer.html" || entry.name === ".music-data.hash") return;
    if (entry.isDirectory()) return fs.rmSync(path.join(musicDir, entry.name), { recursive: true, force: true });
    if (!entry.isFile() || !entry.name.endsWith(".html")) return;
    if (activeFiles.has(entry.name)) return;
    fs.rmSync(path.join(musicDir, entry.name), { force: true });
  });
}

const indexData = games.map((game) => ({ slug: game.slug, title: game.title, year: game.year, thumbnail: game.thumbnail }));
fs.writeFileSync("games/games-index.json", JSON.stringify(indexData, null, 2));

const searchData = games.map((game) => ({
  title: game.title,
  slug: game.slug,
  publisher: normalisePublisherNames(game),
  genre: Array.isArray(game.genres) ? game.genres : [],
  genres: Array.isArray(game.genres) ? game.genres : [],
  composer: normaliseComposerNames(game),
  music: normaliseMusicNames(game.music),
  year: game.year
}));
fs.writeFileSync("games/games-search.json", JSON.stringify(searchData, null, 2));

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
games.forEach((game) => { sitemap += `\n <url>\n   <loc>https://www.cheekycommodoregamer.co.uk/games/${game.slug}/</loc>\n   <changefreq>monthly</changefreq>\n   <priority>0.8</priority>\n </url>`; });
sitemap += `\n</urlset>`;
fs.writeFileSync("sitemap-games.xml", sitemap);

const isLocalRun = !process.env.CI && !process.env.GITHUB_ACTIONS;
const forcePageBuild = process.env.CCG_BUILD_GAME_PAGES === "1";
const shouldBuildPages = isLocalRun || forcePageBuild;

if (shouldBuildPages) {
  const template = fs.readFileSync("templates/game-template.html", "utf8");
  const redirectTemplate = fs.readFileSync("templates/game-redirect-template.html", "utf8");
  const fillTemplate = (source, game) => source
    .replaceAll("[title]", String(game.title ?? ""))
    .replaceAll("[slug]", String(game.slug ?? ""))
    .replaceAll("[year]", String(game.year ?? ""))
    .replaceAll("[publisher]", String(game.publisher ?? ""))
    .replaceAll("[thumbnail]", String(game.thumbnail ?? ""));

  games.forEach((game) => {
    const gameDir = path.join("games", game.slug);
    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(path.join(gameDir, "index.html"), fillTemplate(template, game));
    fs.writeFileSync(path.join("games", `${game.slug}.html`), fillTemplate(redirectTemplate, game));
  });

  const composerEntries = buildComposerEntries(games);
  const musicHash = crypto.createHash("sha256").update(JSON.stringify(composerEntries)).digest("hex");
  const musicHashPath = path.join("music", ".music-data.hash");
  const previousMusicHash = fs.existsSync(musicHashPath) ? fs.readFileSync(musicHashPath, "utf8").trim() : "";

  if (musicHash !== previousMusicHash) {
    composerEntries.forEach((entry) => writeFileIfChanged(path.join("music", `${entry.slug}.html`), renderComposerPage(entry)));
    cleanStaleComposerPages(composerEntries);
    writeFileIfChanged(path.join("music", "index.html"), renderMusicIndexPage());
    writeFileIfChanged(musicHashPath, `${musicHash}\n`);
  }
}
