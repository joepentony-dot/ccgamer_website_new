const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const games = require("../games/games.json");

const APPROVED_COMPOSERS = [
  {
    name: "Rob Hubbard",
    slug: "rob-hubbard",
    intro: "Widely regarded as one of the most influential Commodore 64 composers, Rob Hubbard helped define the SID sound with landmark scores that blended melody, rhythm and technical craft.",
  },
  {
    name: "Martin Galway",
    slug: "martin-galway",
    intro: "Martin Galway is known for memorable SID soundtracks on major C64 releases, combining cinematic atmosphere with a distinctive electronic style.",
  },
  {
    name: "Ben Daglish",
    slug: "ben-daglish",
    intro: "Ben Daglish created many recognisable C64 themes and is associated with some of the most beloved game music of the 8-bit era.",
  },
  {
    name: "Matt Gray",
    slug: "matt-gray",
    intro: "Matt Gray delivered polished, high-energy C64 music and remains closely associated with some of the platform's most iconic late-era soundtracks.",
  },
  {
    name: "David Whittaker",
    slug: "david-whittaker",
    intro: "David Whittaker composed across a huge range of C64 games and is known for versatile SID work that became a staple of British home-computer gaming.",
  },
  {
    name: "Jeroen Tel",
    slug: "jeroen-tel",
    intro: "Jeroen Tel is widely known for bold, punchy C64 compositions and for helping shape the signature audio style heard in many late-80s and early-90s releases.",
  },
  {
    name: "Fred Gray",
    slug: "fred-gray",
    intro: "Fred Gray composed memorable C64 scores that blended strong melodies with inventive SID programming, earning a lasting reputation among retro players.",
  },
  {
    name: "Chris Hülsbeck",
    slug: "chris-huelsbeck",
    intro: "Chris Hülsbeck is associated with some of the most recognisable 8-bit and 16-bit game music, with C64 works that showcased melodic writing and technical precision.",
  },
  {
    name: "Tim Follin",
    slug: "tim-follin",
    intro: "Tim Follin is celebrated for technically advanced and harmonically rich C64 music, widely regarded as some of the most ambitious SID composition of the era.",
  },
  {
    name: "Reyn Ouwehand",
    slug: "reyn-ouwehand",
    intro: "Reyn Ouwehand became a key modern-era C64 composer, known for refined SID craftsmanship and music that bridges classic influences with contemporary production discipline.",
  },
];

function normalizeForMatch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const APPROVED_BY_NAME = new Map(
  APPROVED_COMPOSERS.map((entry) => [normalizeForMatch(entry.name), entry])
);

function normaliseMusicNames(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();

  return list
    .map((name) => String(name ?? "").trim())
    .filter(Boolean)
    .filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}


function normaliseComposerNames(game) {
  const composers = [];

  if (Array.isArray(game?.composer)) {
    composers.push(...game.composer);
  } else if (game?.composer) {
    composers.push(game.composer);
  }

  const musicianCredits = game?.credits?.musician;
  if (Array.isArray(musicianCredits)) {
    composers.push(...musicianCredits);
  } else if (musicianCredits) {
    composers.push(musicianCredits);
  }

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
  const previousContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : null;

  if (previousContent === content) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

function buildComposerEntries(gamesList) {
  const composers = Object.fromEntries(
    APPROVED_COMPOSERS.map((composer) => [composer.slug, []])
  );

  gamesList.forEach((game) => {
    const composerNames = normaliseComposerNames(game);
    if (composerNames.length === 0) return;

    composerNames.forEach((name) => {
      const approved = APPROVED_BY_NAME.get(normalizeForMatch(name));
      if (!approved) return;

      composers[approved.slug].push({
        slug: game.slug,
        title: game.title,
      });
    });
  });

  return APPROVED_COMPOSERS.map((composer) => ({
    ...composer,
    games: composers[composer.slug]
      .filter((game, index, list) => list.findIndex((item) => item.slug === game.slug) === index)
        .slice()
        .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""))),
  }));
}

function renderComposerPage(entry) {
  const composerName = htmlEscape(entry.name);
  const composerSlugValue = htmlEscape(entry.slug);
  const description = htmlEscape(`Explore Commodore 64 games featuring music by ${entry.name}, with archive links back to each game page on Cheeky Commodore Gamer.`);
  const intro = htmlEscape(entry.intro);

  return `<!DOCTYPE html>
<html lang="en" data-ccg-page="music-composer">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${composerName} — Commodore 64 Music | Cheeky Commodore Gamer</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/music/${composerSlugValue}/">
<link rel="stylesheet" href="/resources/css/ccg-master.css">
<link rel="stylesheet" href="/resources/css/music-composer.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  <main class="ccg-main ccg-composer-page" data-composer-name="${composerName}">
    <nav class="ccg-composer-breadcrumbs" aria-label="Breadcrumb">
      <a href="/home.html">Home</a> › <a href="/games/index.html">Games</a> › <a href="/music/index.html">Music</a>
    </nav>
    <h1 class="ccg-composer-title">${composerName} — Commodore 64 Music</h1>
    <p class="ccg-composer-subtitle">Featured game archive and soundtrack references</p>
    <p class="ccg-composer-intro">${intro}</p>

    <h2 class="ccg-composer-section-title">Games featuring ${composerName}</h2>
    <ul id="composer-games" class="ccg-composer-games">
      <li>Loading...</li>
    </ul>

    <section class="ccg-composer-featured" aria-labelledby="other-composers-heading">
      <h2 id="other-composers-heading" class="ccg-composer-section-title">Other featured C64 composers</h2>
      <div id="composer-featured-list" class="ccg-composer-chip-list"></div>
    </section>
  </main>
  <script src="/js/music-composer-pages.js" defer></script>
</body>
</html>`;
}

function renderMusicIndexPage(composerEntries) {
  const composerLinks = composerEntries
    .map((entry) => `      <a class="ccg-music-hub__composer" href="/music/${htmlEscape(entry.slug)}.html">${htmlEscape(entry.name)}</a>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" data-ccg-page="music-hub">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Commodore 64 Music Composers | Cheeky Commodore Gamer</title>
<meta name="description" content="Browse featured Commodore 64 composers including Rob Hubbard, Martin Galway, Ben Daglish and more, with links to game archives on Cheeky Commodore Gamer.">
<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/music/">
<link rel="stylesheet" href="/resources/css/ccg-master.css">
<link rel="stylesheet" href="/resources/css/music-composer.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  <main class="ccg-main ccg-music-hub">
    <nav class="ccg-composer-breadcrumbs" aria-label="Breadcrumb">
      <a href="/home.html">Home</a> › <a href="/games/index.html">Games</a>
    </nav>
    <h1 class="ccg-composer-title">Featured Commodore 64 Music Composers</h1>
    <p class="ccg-composer-intro">Explore dedicated music archive pages for major C64 composers and jump directly to games on Cheeky Commodore Gamer that feature their work.</p>
    <div class="ccg-music-hub__grid">
${composerLinks}
    </div>
  </main>
</body>
</html>`;
}

function cleanStaleComposerPages(composerEntries) {
  const musicDir = "music";
  if (!fs.existsSync(musicDir)) return;

  const activeFiles = new Set(composerEntries.map((entry) => `${entry.slug}.html`));

  fs.readdirSync(musicDir, { withFileTypes: true })
    .forEach((entry) => {
      if (entry.name === "index.html" || entry.name === ".music-data.hash") return;

      if (entry.isDirectory()) {
        fs.rmSync(path.join(musicDir, entry.name), { recursive: true, force: true });
        return;
      }

      if (!entry.isFile() || !entry.name.endsWith(".html")) return;
      if (activeFiles.has(entry.name)) return;

      fs.rmSync(path.join(musicDir, entry.name), { force: true });
    });
}

const indexData = games.map((game) => ({
  slug: game.slug,
  title: game.title,
  year: game.year,
  thumbnail: game.thumbnail,
}));

fs.writeFileSync("games/games-index.json", JSON.stringify(indexData, null, 2));

const searchData = games.map((game) => ({
  title: game.title,
  slug: game.slug,
  publisher: normalisePublisherNames(game),
  genre: Array.isArray(game.genres) ? game.genres : [],
  genres: Array.isArray(game.genres) ? game.genres : [],
  composer: normaliseComposerNames(game),
  music: normaliseMusicNames(game.music),
  year: game.year,
}));

fs.writeFileSync("games/games-search.json", JSON.stringify(searchData, null, 2));

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

games.forEach((game) => {
  sitemap += `\n <url>\n   <loc>https://www.cheekycommodoregamer.co.uk/games/${game.slug}/</loc>\n   <changefreq>monthly</changefreq>\n   <priority>0.8</priority>\n </url>`;
});

sitemap += `\n</urlset>`;

fs.writeFileSync("sitemap-games.xml", sitemap);

const isLocalRun = !process.env.CI && !process.env.GITHUB_ACTIONS;
const forcePageBuild = process.env.CCG_BUILD_GAME_PAGES === "1";
const shouldBuildPages = isLocalRun || forcePageBuild;

if (shouldBuildPages) {
  const template = fs.readFileSync("templates/game-template.html", "utf8");

  const redirectTemplate = fs.readFileSync(
    "templates/game-redirect-template.html",
    "utf8"
  );

  const fillTemplate = (source, game) =>
    source
      .replaceAll("[title]", String(game.title ?? ""))
      .replaceAll("[slug]", String(game.slug ?? ""))
      .replaceAll("[year]", String(game.year ?? ""))
      .replaceAll("[publisher]", String(game.publisher ?? ""))
      .replaceAll("[thumbnail]", String(game.thumbnail ?? ""));

  games.forEach((game) => {
    const gameDir = path.join("games", game.slug);
    const gamePagePath = path.join(gameDir, "index.html");
    const gameRedirectPath = path.join("games", `${game.slug}.html`);

    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(gamePagePath, fillTemplate(template, game));
    fs.writeFileSync(gameRedirectPath, fillTemplate(redirectTemplate, game));
  });

  const composerEntries = buildComposerEntries(games);
  const musicHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(composerEntries))
    .digest("hex");
  const musicHashPath = path.join("music", ".music-data.hash");
  const previousMusicHash = fs.existsSync(musicHashPath)
    ? fs.readFileSync(musicHashPath, "utf8").trim()
    : "";

  if (musicHash !== previousMusicHash) {
    composerEntries.forEach((entry) => {
      const composerFile = path.join("music", `${entry.slug}.html`);
      writeFileIfChanged(composerFile, renderComposerPage(entry));
    });

    cleanStaleComposerPages(composerEntries);
    writeFileIfChanged(path.join("music", "index.html"), renderMusicIndexPage(composerEntries));
    writeFileIfChanged(musicHashPath, `${musicHash}\n`);
  }
}
